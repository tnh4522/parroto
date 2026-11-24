import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { configureApp } from "./app.bootstrap";
import { AppModule } from "./app.module";
import { getAppEnv } from "./core/config/env";
import { appLogger } from "./core/observability/logger.service";

async function bootstrap() {
  const env = getAppEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);

  await app.listen(env.PORT);
  appLogger.info({ port: env.PORT }, "LinguaCraft API listening");
}

void bootstrap();
