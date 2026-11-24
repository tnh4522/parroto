import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { CommunityController } from "./community.controller";
import { CommunityGateway } from "./community.gateway";
import { CommunityService } from "./community.service";

@Module({
  imports: [AiModule],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityService, CommunityGateway],
})
export class CommunityModule {}
