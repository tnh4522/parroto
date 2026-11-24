import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodType, ZodTypeDef } from "zod";

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput, ZodTypeDef, unknown>) {}

  transform(value: unknown): TOutput {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Request payload validation failed";
      throw new BadRequestException({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message,
      });
    }
    return parsed.data;
  }
}
