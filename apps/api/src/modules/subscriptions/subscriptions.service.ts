import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { RedisService } from "../../core/redis/redis.service";

export type BillingProvider = "stripe" | "paddle" | "vietqr";

export function verifyWebhookSignature(
  provider: BillingProvider,
  rawPayload: string,
  signatureHeader: string | undefined
): boolean {
  if (!signatureHeader) return false;
  const env = getAppEnv();
  const secret =
    provider === "stripe"
      ? env.BILLING_WEBHOOK_SECRET_STRIPE
      : provider === "paddle"
        ? env.BILLING_WEBHOOK_SECRET_PADDLE
        : env.BILLING_WEBHOOK_SECRET_VIETQR;

  const expectedHex = createHmac("sha256", secret)
    .update(rawPayload)
    .digest("hex");
  const cleanHeader = signatureHeader.replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(cleanHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async listPlans() {
    const cacheKey = "billing:plans";
    const cached = await this.redis.getJson<{ plans: unknown[] }>(cacheKey);
    if (cached) return cached;

    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { amountCents: "asc" },
    });

    const payload = { plans };
    await this.redis.setJson(cacheKey, payload, 300);
    return payload;
  }

  async createCheckout(
    userId: string,
    input: {
      planCode: string;
      provider: BillingProvider;
      promoCode?: string;
      affiliateCode?: string;
    }
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { code: input.planCode },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException({
        statusCode: 404,
        code: "PLAN_NOT_FOUND",
        message: "Requested subscription plan is unavailable",
      });
    }

    let finalAmountCents = plan.amountCents;
    let promoCodeId: string | null = null;

    if (input.promoCode) {
      const now = new Date();
      const promo = await this.prisma.promoCode.findUnique({
        where: { code: input.promoCode.trim().toUpperCase() },
      });
      if (
        !promo ||
        !promo.isActive ||
        promo.startsAt > now ||
        promo.endsAt < now ||
        (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
      ) {
        throw new BadRequestException({
          statusCode: 400,
          code: "INVALID_PROMO_CODE",
          message: "Promo code is invalid or expired",
        });
      }
      promoCodeId = promo.id;
      finalAmountCents = Math.max(
        0,
        Math.round(plan.amountCents * (1 - promo.discountPercent / 100))
      );
    }

    const providerTxId = `tx_${input.provider}_${randomUUID()}`;
    const tx = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        planId: plan.id,
        provider: input.provider,
        providerTxId,
        amountCents: finalAmountCents,
        currency: plan.currency,
        status: "PENDING",
        promoCodeId,
        affiliateCodeUsed: input.affiliateCode ?? null,
      },
    });

    return {
      transactionId: tx.id,
      providerTxId: tx.providerTxId,
      amountCents: tx.amountCents,
      currency: tx.currency,
      checkoutUrl:
        input.provider === "vietqr"
          ? null
          : `https://checkout.linguacraft.example/pay/${encodeURIComponent(tx.providerTxId)}`,
      qrPayload:
        input.provider === "vietqr"
          ? `VIETQR|LINGUACRAFT|${tx.providerTxId}|${tx.amountCents}`
          : null,
    };
  }

  async handlePaymentWebhook(
    provider: BillingProvider,
    rawBodyString: string,
    signatureHeader: string | undefined,
    payload: { providerTxId: string; status: "PAID" | "FAILED" | "REFUNDED" }
  ) {
    if (!verifyWebhookSignature(provider, rawBodyString, signatureHeader)) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "INVALID_WEBHOOK_SIGNATURE",
        message: "Webhook signature verification failed",
      });
    }

    const lockKey = `lock:webhook:${payload.providerTxId}`;
    const locked = await this.redis.acquireLock(lockKey, 15000);
    if (!locked) {
      throw new ConflictException({
        statusCode: 409,
        code: "WEBHOOK_LOCKED",
        message: "Payment webhook is already being processed",
      });
    }

    try {
      const txRow = await this.prisma.paymentTransaction.findUnique({
        where: { providerTxId: payload.providerTxId },
      });

      if (!txRow) {
        throw new NotFoundException({
          statusCode: 404,
          code: "TRANSACTION_NOT_FOUND",
          message: "Payment transaction not found",
        });
      }

      // Idempotent guard if already processed
      if (txRow.status === "PAID" && payload.status === "PAID") {
        return { acknowledged: true, idempotentDuplicate: true };
      }

      if (payload.status !== "PAID") {
        await this.prisma.paymentTransaction.update({
          where: { id: txRow.id },
          data: { status: payload.status },
        });
        return { acknowledged: true, status: payload.status };
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: txRow.planId },
      });

      if (!plan) {
        throw new NotFoundException({
          statusCode: 404,
          code: "PLAN_NOT_FOUND",
          message: "Referenced plan no longer exists",
        });
      }

      const now = new Date();
      const expiresAt =
        plan.tier === "LIFETIME" || plan.durationDays === null
          ? null
          : new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      await this.prisma.$transaction(async (db) => {
        await db.paymentTransaction.update({
          where: { id: txRow.id },
          data: { status: "PAID" },
        });

        await db.entitlementGrant.create({
          data: {
            userId: txRow.userId,
            tier: plan.tier,
            source: provider,
            transactionId: txRow.id,
            startsAt: now,
            expiresAt,
          },
        });

        if (txRow.promoCodeId) {
          await db.promoCode.update({
            where: { id: txRow.promoCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }
      });

      return {
        acknowledged: true,
        grantedTier: plan.tier,
        expiresAt: expiresAt?.toISOString() ?? null,
      };
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async listShopItems() {
    const cacheKey = "shop:items";
    const cached = await this.redis.getJson<{ items: unknown[] }>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const payload = { items };
    await this.redis.setJson(cacheKey, payload, 300);
    return payload;
  }

  async purchaseShopItem(userId: string, itemId: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SHOP_ITEM_NOT_FOUND",
        message: "Shop item not found",
      });
    }

    const existingOwned = await this.prisma.userInventory.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existingOwned && item.itemType !== "STREAK_FREEZE") {
      throw new ConflictException({
        statusCode: 409,
        code: "ITEM_ALREADY_OWNED",
        message: "You already own this cosmetic item",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const stats = await tx.userStats.findUnique({
        where: { userId },
      });

      const currentDiamonds = stats?.diamondBalance ?? 0;
      if (currentDiamonds < item.price) {
        throw new BadRequestException({
          statusCode: 400,
          code: "INSUFFICIENT_DIAMONDS",
          message: "Not enough diamonds to purchase this item",
        });
      }

      const nextBalance = currentDiamonds - item.price;

      await tx.userStats.update({
        where: { userId },
        data: {
          diamondBalance: nextBalance,
          ...(item.itemType === "STREAK_FREEZE"
            ? { streakFreezesOwned: { increment: 1 } }
            : {}),
        },
      });

      await tx.diamondLedger.create({
        data: {
          userId,
          delta: -item.price,
          balanceAfter: nextBalance,
          reason: "SHOP_PURCHASE",
          idempotencyKey: `shop:${userId}:${itemId}:${randomUUID()}`,
        },
      });

      if (!existingOwned) {
        await tx.userInventory.create({
          data: { userId, itemId },
        });
      }

      return {
        purchasedItemId: itemId,
        diamondBalance: nextBalance,
      };
    });
  }
}
