import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export interface JsonObjectRules {
  allowedKeys: readonly string[];
  requiredKeys?: readonly string[];
}

export function validateJsonObject(rules: JsonObjectRules): RequestHandler {
  const allowedKeys = new Set(rules.allowedKeys);
  return (request, _response, next) => {
    const body: unknown = request.body;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      next(new AppError(400, 'INVALID_REQUEST_BODY', 'Request body must be a JSON object.'));
      return;
    }

    const record = body as Record<string, unknown>;
    const unknownKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      next(new AppError(400, 'UNKNOWN_REQUEST_FIELD', 'Request body contains an unsupported field.'));
      return;
    }
    const missingKeys = (rules.requiredKeys ?? []).filter((key) => !(key in record));
    if (missingKeys.length > 0) {
      next(new AppError(400, 'MISSING_REQUEST_FIELD', 'Request body is missing a required field.'));
      return;
    }
    next();
  };
}
