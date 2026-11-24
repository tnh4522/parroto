import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { z } from "zod";
import { ZodValidationPipe } from "../../core/http/zod-validation.pipe";
import type { AuthenticatedPrincipal } from "../../core/security/auth-context";
import { CurrentUser, Public } from "../../core/security/security.decorators";
import {
  type BillingProvider,
  SubscriptionsService,
} from "./subscriptions.service";

const checkoutSchema = z.object({
  planCode: z.string().min(2).max(32),
  provider: z.enum(["stripe", "paddle", "vietqr"]),
  promoCode: z.string().trim().min(2).max(32).optional(),
  affiliateCode: z.string().trim().min(2).max(32).optional(),
});

const webhookBodySchema = z.object({
  providerTxId: z.string().min(4),
  status: z.enum(["PAID", "FAILED", "REFUNDED"]),
});

const purchaseSchema = z.object({
  itemId: z.string().uuid(),
});

const providerParamSchema = z.enum(["stripe", "paddle", "vietqr"]);

class CheckoutSwaggerDto {
  @ApiProperty({ example: "PRO_1M" })
  planCode!: string;

  @ApiProperty({ enum: ["stripe", "paddle", "vietqr"] })
  provider!: BillingProvider;

  @ApiPropertyOptional()
  promoCode?: string;

  @ApiPropertyOptional()
  affiliateCode?: string;
}

class WebhookSwaggerDto {
  @ApiProperty()
  providerTxId!: string;

  @ApiProperty({ enum: ["PAID", "FAILED", "REFUNDED"] })
  status!: "PAID" | "FAILED" | "REFUNDED";
}

class ShopPurchaseSwaggerDto {
  @ApiProperty({ format: "uuid" })
  itemId!: string;
}

@ApiTags("Subscriptions, Billing & Shop")
@Controller({ version: "1" })
export class SubscriptionsController {
  constructor(private readonly subsService: SubscriptionsService) {}

  @Public()
  @Get("billing/plans")
  @ApiOperation({ summary: "List active PRO / LIFETIME subscription plans" })
  async listPlans() {
    return this.subsService.listPlans();
  }

  @ApiBearerAuth()
  @Post("billing/checkout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create pending checkout transaction for card or VietQR" })
  async createCheckout(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return this.subsService.createCheckout(
      principal.userId,
      body as z.infer<typeof checkoutSchema>
    );
  }

  @Public()
  @Post("webhooks/:provider")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "HMAC-signed payment gateway webhook to grant entitlements" })
  async handleWebhook(
    @Param("provider", new ZodValidationPipe(providerParamSchema))
    provider: BillingProvider,
    @Headers("x-webhook-signature") signatureHeader: string | undefined,
    @Body(new ZodValidationPipe(webhookBodySchema)) body: WebhookSwaggerDto,
    @Req() req: Request
  ) {
    const rawBody =
      typeof (req as unknown as { rawBody?: unknown }).rawBody === "string"
        ? ((req as unknown as { rawBody: string }).rawBody)
        : JSON.stringify(body);
    return this.subsService.handlePaymentWebhook(
      provider,
      rawBody,
      signatureHeader,
      body as z.infer<typeof webhookBodySchema>
    );
  }

  @Public()
  @Get("shop/items")
  @ApiOperation({ summary: "List diamond shop items and streak freezes" })
  async listShopItems() {
    return this.subsService.listShopItems();
  }

  @ApiBearerAuth()
  @Post("shop/purchase")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Atomically debit diamonds and grant shop item / streak freeze" })
  async purchaseShopItem(
    @CurrentUser() principal: AuthenticatedPrincipal | null,
    @Body(new ZodValidationPipe(purchaseSchema)) body: ShopPurchaseSwaggerDto
  ) {
    if (!principal) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const parsed = body as z.infer<typeof purchaseSchema>;
    return this.subsService.purchaseShopItem(principal.userId, parsed.itemId);
  }
}
