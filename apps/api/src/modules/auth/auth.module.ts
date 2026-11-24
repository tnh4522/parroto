import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OAuthProviderService } from "./oauth-provider.service";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, OAuthProviderService],
  exports: [AuthService, OAuthProviderService],
})
export class AuthModule {}
