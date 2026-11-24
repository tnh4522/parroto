import { Module } from "@nestjs/common";
import { ShadowingService } from "./shadowing.service";

@Module({
  providers: [ShadowingService],
  exports: [ShadowingService],
})
export class ShadowingModule {}
