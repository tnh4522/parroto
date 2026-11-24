import { VersioningType, type INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { getAppEnv } from "./core/config/env";

export function configureApp(app: INestApplication): OpenAPIObject {
  const env = getAppEnv();

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("LinguaCraft Independent API")
    .setDescription(
      "Modular NestJS API for Dictation, Shadowing, Vocabulary/SM-2, IELTS & TOEIC Exams, Community Speaking, and Billing."
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);
  return document;
}
