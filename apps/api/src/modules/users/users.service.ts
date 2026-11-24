import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AuthUser,
  EntitlementTier,
  OnboardingUpdateRequest,
  UserPreferencesUpdateRequest,
} from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";

export function isAgeEligible(birthDate: Date, minimumAge = 13): boolean {
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= minimumAge;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSerializedUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
        entitlements: {
          where: {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "User account not found",
      });
    }

    const activeGrant = user.entitlements[0];
    const entitlementTier: EntitlementTier = activeGrant
      ? activeGrant.tier
      : "FREE";

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      entitlementTier,
      ageVerified: Boolean(user.ageVerifiedAt),
      preferredUiLocale: user.preferredUiLocale,
      preferredTranslateLang: user.preferredTranslateLang,
      stats: user.stats
        ? {
            xpTotal: user.stats.xpTotal,
            level: user.stats.level,
            diamondBalance: user.stats.diamondBalance,
            currentStreakDays: user.stats.currentStreakDays,
            longestStreakDays: user.stats.longestStreakDays,
            streakFreezesOwned: user.stats.streakFreezesOwned,
            activeTimeSec: user.stats.activeTimeSec,
          }
        : undefined,
    };
  }

  async completeOnboarding(
    userId: string,
    dto: OnboardingUpdateRequest
  ): Promise<{ user: AuthUser }> {
    const existingWithUsername = await this.prisma.user.findFirst({
      where: {
        username: dto.username,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existingWithUsername) {
      throw new ConflictException({
        statusCode: 409,
        code: "USERNAME_TAKEN",
        message: "That username is already in use",
      });
    }

    let parsedBirthDate: Date | undefined;
    let ageVerifiedAt: Date | null | undefined;

    if (dto.birthDate) {
      parsedBirthDate = new Date(`${dto.birthDate}T00:00:00.000Z`);
      if (Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate > new Date()) {
        throw new BadRequestException({
          statusCode: 400,
          code: "INVALID_BIRTH_DATE",
          message: "Birth date must be a valid date in the past",
        });
      }
      ageVerifiedAt = isAgeEligible(parsedBirthDate, 13) ? new Date() : null;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
        preferredTranslateLang: dto.preferredTranslateLang,
        birthDate: parsedBirthDate,
        ageVerifiedAt,
      },
    });

    return { user: await this.getSerializedUser(userId) };
  }

  async updatePreferences(
    userId: string,
    dto: UserPreferencesUpdateRequest
  ): Promise<{ user: AuthUser }> {
    let parsedBirthDate: Date | undefined;
    let ageVerifiedAt: Date | null | undefined;

    if (dto.birthDate) {
      parsedBirthDate = new Date(`${dto.birthDate}T00:00:00.000Z`);
      if (Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate > new Date()) {
        throw new BadRequestException({
          statusCode: 400,
          code: "INVALID_BIRTH_DATE",
          message: "Birth date must be a valid date in the past",
        });
      }
      ageVerifiedAt = isAgeEligible(parsedBirthDate, 13) ? new Date() : null;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        preferredUiLocale: dto.preferredUiLocale,
        preferredTranslateLang: dto.preferredTranslateLang,
        birthDate: parsedBirthDate,
        ageVerifiedAt,
      },
    });

    return { user: await this.getSerializedUser(userId) };
  }

  async recordAudioConsent(
    userId: string,
    policyVersion: string
  ): Promise<{ consented: boolean; consentedAt: string }> {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        audioConsentAt: now,
        audioConsentVersion: policyVersion,
      },
    });
    return {
      consented: true,
      consentedAt: now.toISOString(),
    };
  }
}
