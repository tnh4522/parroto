import { Module } from "@nestjs/common";
import { DictationModule } from "../dictation/dictation.module";
import { ShadowingModule } from "../shadowing/shadowing.module";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";

@Module({
  imports: [DictationModule, ShadowingModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
