import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        throw new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
