import {
  MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { PrismaModule } from "./core/database/prisma.module";
import { RequestTraceMiddleware } from "./core/observability/logger.service";
import { QueueModule } from "./core/queue/queue.module";
import { RedisModule } from "./core/redis/redis.module";
import { SecurityModule } from "./core/security/security.module";
import { StorageModule } from "./core/storage/storage.module";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommunityModule } from "./modules/community/community.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { MediaModule } from "./modules/media/media.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { SrsModule } from "./modules/srs/srs.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { UsersModule } from "./modules/users/users.module";
import { VocabularyModule } from "./modules/vocabulary/vocabulary.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    StorageModule,
    QueueModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    MediaModule,
    AiModule,
    LessonsModule,
    VocabularyModule,
    SrsModule,
    ProgressModule,
    ExamsModule,
    CommunityModule,
    SubscriptionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestTraceMiddleware).forRoutes("*");
  }
}
