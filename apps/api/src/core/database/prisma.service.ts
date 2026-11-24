import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { getAppEnv } from "../config/env";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: { url: getAppEnv().DATABASE_URL },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    await this.$disconnect();
  }
}
