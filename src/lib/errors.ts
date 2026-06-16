export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401, "AUTH_UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden access") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.field = field;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.retryAfter = retryAfter;
  }
}

export class QuotaError extends AppError {
  constructor(message: string = "Quota exceeded") {
    super(message, 402, "QUOTA_EXCEEDED");
  }
}

export class AIError extends AppError {
  constructor(message: string = "AI service error") {
    super(message, 502, "AI_PROVIDER_ERROR");
  }
}

export class YouTubeError extends AppError {
  constructor(message: string = "YouTube API error") {
    super(message, 502, "YOUTUBE_API_ERROR");
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation error") {
    super(message, 500, "DATABASE_ERROR");
  }
}

export class PaymentError extends AppError {
  constructor(message: string = "Payment required") {
    super(message, 402, "PAYMENT_REQUIRED");
  }
}
