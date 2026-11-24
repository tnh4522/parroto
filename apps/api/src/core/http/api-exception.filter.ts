import { randomUUID } from "node:crypto";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import {
  appLogger,
  type RequestWithTrace,
} from "../observability/logger.service";

export class AppDomainException extends HttpException {
  constructor(
    statusCode: HttpStatus,
    public readonly code: string,
    message: string
  ) {
    super({ statusCode, code, message }, statusCode);
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "VALIDATION_ERROR";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMIT_EXCEEDED";
    default:
      return status >= 500 ? "INTERNAL_SERVER_ERROR" : "HTTP_ERROR";
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithTrace>();
    const traceId = req?.traceId ?? randomUUID();

    if (exception instanceof ZodError) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        code: "VALIDATION_ERROR",
        message: exception.issues[0]?.message ?? "Request validation failed",
        traceId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();

      let code = defaultCodeForStatus(statusCode);
      let message = exception.message;

      if (typeof rawResponse === "object" && rawResponse !== null) {
        const record = rawResponse as Record<string, unknown>;
        if (typeof record.code === "string") {
          code = record.code;
        }
        if (typeof record.message === "string") {
          message = record.message;
        } else if (Array.isArray(record.message) && record.message[0]) {
          message = String(record.message[0]);
        }
      }

      res.status(statusCode).json({
        statusCode,
        code,
        message,
        traceId,
      });
      return;
    }

    // Handle Prisma well-known error codes without coupling strictly to runtime imports
    if (typeof exception === "object" && exception !== null && "code" in exception) {
      const prismaCode = (exception as { code?: unknown }).code;
      if (prismaCode === "P2002") {
        res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          code: "CONFLICT",
          message: "Resource already exists",
          traceId,
        });
        return;
      }
      if (prismaCode === "P2025") {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          code: "NOT_FOUND",
          message: "Requested resource was not found",
          traceId,
        });
        return;
      }
    }

    appLogger.error({ traceId, err: exception }, "Unhandled backend exception");
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      traceId,
    });
  }
}
