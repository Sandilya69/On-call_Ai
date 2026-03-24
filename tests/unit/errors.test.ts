// ============================================
// Unit Tests — Custom Error Classes
// ============================================

import { describe, it, expect } from "vitest";
import {
  MaestroError,
  NotFoundError,
  AuthenticationError,
  WebhookSignatureError,
  ValidationError,
} from "../../src/utils/errors.js";

describe("MaestroError", () => {
  it("should set message and default statusCode to 500", () => {
    const err = new MaestroError("something broke");
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.detail).toBeUndefined();
    expect(err.name).toBe("MaestroError");
  });

  it("should accept custom statusCode and detail", () => {
    const err = new MaestroError("bad", 418, "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.detail).toBe("I'm a teapot");
  });

  it("should be an instance of Error", () => {
    const err = new MaestroError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MaestroError);
  });
});

describe("NotFoundError", () => {
  it("should produce a 404 with resource name", () => {
    const err = new NotFoundError("Incident", "abc-123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Incident 'abc-123' not found");
    expect(err.name).toBe("NotFoundError");
  });

  it("should work without identifier", () => {
    const err = new NotFoundError("Team");
    expect(err.message).toBe("Team not found");
    expect(err.statusCode).toBe(404);
  });
});

describe("AuthenticationError", () => {
  it("should produce a 401", () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication failed");
  });

  it("should accept custom message", () => {
    const err = new AuthenticationError("Token expired");
    expect(err.message).toBe("Token expired");
    expect(err.statusCode).toBe(401);
  });
});

describe("WebhookSignatureError", () => {
  it("should produce a 401 with fixed message", () => {
    const err = new WebhookSignatureError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Invalid webhook signature");
  });
});

describe("ValidationError", () => {
  it("should produce a 422 with custom message", () => {
    const err = new ValidationError("Invalid date format");
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Invalid date format");
  });
});
