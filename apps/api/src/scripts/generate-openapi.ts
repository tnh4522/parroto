import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Test } from "@nestjs/testing";
import { configureApp } from "../app.bootstrap";
import { AppModule } from "../app.module";
import { PrismaService } from "../core/database/prisma.service";

async function generateOpenApi() {
  process.env.NODE_ENV = "test";
  process.env.REDIS_URL = "memory";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({ $connect: async () => {}, $disconnect: async () => {} })
    .compile();

  const app = moduleRef.createNestApplication();
  const document = configureApp(app);
  await app.init();

  const outPath = resolve(__dirname, "../../../../docs/api/openapi.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(document, null, 2), "utf8");
  await app.close();
  console.log(`OpenAPI specification written to ${outPath}`);
}

void generateOpenApi();
