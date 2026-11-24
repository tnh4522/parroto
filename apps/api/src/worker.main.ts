import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { appLogger } from "./core/observability/logger.service";
import { startBackgroundWorkers } from "./worker/workers";

async function bootstrapWorker() {
  const appCtx = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const workers = startBackgroundWorkers(appCtx);
  appLogger.info(
    { workerCount: workers.length },
    "LinguaCraft BullMQ background workers started"
  );

  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    await appCtx.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void bootstrapWorker();
