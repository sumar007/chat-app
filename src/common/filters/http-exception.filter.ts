import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors || null;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = exception.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error for debugging
    console.error('Exception caught:', {
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json(errorResponse);
  }
}
