import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { getAppEnv } from "../config/env";
import { AllExceptionsFilter } from "../http/api-exception.filter";
import {
  ComplianceGuard,
  EntitlementGuard,
  JwtAuthGuard,
  RateLimitGuard,
  RolesGuard,
} from "./security.guards";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getAppEnv().JWT_ACCESS_SECRET,
        signOptions: { expiresIn: getAppEnv().JWT_ACCESS_TTL_SEC },
      }),
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: EntitlementGuard },
    { provide: APP_GUARD, useClass: ComplianceGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [JwtModule],
})
export class SecurityModule {}
