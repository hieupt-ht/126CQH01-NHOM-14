import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

interface BodyParserError extends Error {
  status?: number;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (response.headersSent) return;

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  const parserError = error as BodyParserError;
  if (parserError?.type === 'entity.parse.failed') {
    response.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
    return;
  }
  if (parserError?.type === 'entity.too.large') {
    response.status(413).json({ success: false, error: { code: 'REQUEST_TOO_LARGE', message: 'Request body exceeds the allowed size.' } });
    return;
  }

  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
  });
};
