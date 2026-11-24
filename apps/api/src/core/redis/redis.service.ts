import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";
import { getAppEnv } from "../config/env";

interface MemoryEntry {
  value: string;
  expiresAtMs: number | null;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly memoryStore = new Map<string, MemoryEntry>();
  private readonly useMemory: boolean;

  constructor() {
    const env = getAppEnv();
    this.useMemory =
      env.NODE_ENV === "test" || env.REDIS_URL.trim().toLowerCase() === "memory";
  }

  async onModuleInit(): Promise<void> {
    if (this.useMemory) return;
    this.client = new Redis(getAppEnv().REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private getMemoryValue(key: string): string | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAtMs !== null && Date.now() >= entry.expiresAtMs) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      return this.client.get(key);
    }
    return this.getMemoryValue(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client) {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    this.memoryStore.set(key, {
      value,
      expiresAtMs:
        ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    payload: unknown,
    ttlSeconds?: number
  ): Promise<void> {
    await this.set(key, JSON.stringify(payload), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      await this.client.del(key);
      return;
    }
    this.memoryStore.delete(key);
  }

  async consumeRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; count: number; remaining: number }> {
    if (this.client) {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, windowSeconds);
      }
      return {
        allowed: count <= limit,
        count,
        remaining: Math.max(0, limit - count),
      };
    }

    const currentRaw = this.getMemoryValue(key);
    const nextCount = currentRaw ? Number(currentRaw) + 1 : 1;
    const existing = this.memoryStore.get(key);
    const expiresAtMs =
      existing && existing.expiresAtMs && Date.now() < existing.expiresAtMs
        ? existing.expiresAtMs
        : Date.now() + windowSeconds * 1000;
    this.memoryStore.set(key, { value: String(nextCount), expiresAtMs });
    return {
      allowed: nextCount <= limit,
      count: nextCount,
      remaining: Math.max(0, limit - nextCount),
    };
  }

  async acquireLock(lockKey: string, ttlMs = 15000): Promise<boolean> {
    if (this.client) {
      const res = await this.client.set(lockKey, "1", "PX", ttlMs, "NX");
      return res === "OK";
    }
    const existing = this.getMemoryValue(lockKey);
    if (existing !== null) return false;
    this.memoryStore.set(lockKey, {
      value: "1",
      expiresAtMs: Date.now() + ttlMs,
    });
    return true;
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.del(lockKey);
  }
}
