import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import pino from "pino";

export const appLogger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
});

export interface RequestWithTrace extends Request {
  traceId?: string;
}

@Injectable()
export class RequestTraceMiddleware implements NestMiddleware {
  use(req: RequestWithTrace, res: Response, next: NextFunction): void {
    const incoming = req.header("x-request-id");
    const traceId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
    req.traceId = traceId;
    res.setHeader("x-request-id", traceId);

    const startedAt = Date.now();
    res.on("finish", () => {
      appLogger.info({
        traceId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  }
}
