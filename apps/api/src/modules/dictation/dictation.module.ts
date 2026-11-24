import { Module } from "@nestjs/common";
import { DictationService } from "./dictation.service";

@Module({
  providers: [DictationService],
  exports: [DictationService],
})
export class DictationModule {}
