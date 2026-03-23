export class MaestroError extends Error {
  public readonly statusCode: number;
  public readonly detail?: string;
  constructor(message: string, statusCode = 500, detail?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detail = detail;
    Error.captureStackTrace(this, this.constructor);
  }
}
export class NotFoundError extends MaestroError {
  constructor(resource: string, identifier?: string) {
    super(identifier ? `${resource} '${identifier}' not found` : `${resource} not found`, 404);
  }
}
export class AuthenticationError extends MaestroError {
  constructor(msg = "Authentication failed") { super(msg, 401); }
}
export class WebhookSignatureError extends MaestroError {
  constructor() { super("Invalid webhook signature", 401); }
}
export class ValidationError extends MaestroError {
  constructor(msg: string) { super(msg, 422); }
}
