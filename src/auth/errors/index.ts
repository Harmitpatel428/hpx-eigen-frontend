/** Base error for all Auth/API related exceptions */
export class ApiError extends Error {
  public readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

/** Triggered when the server returns 401 Unauthorized */
export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed', code = '401') {
    super(message, code);
    this.name = 'AuthenticationError';
  }
}

/** Triggered when the server returns 403 Forbidden */
export class AuthorizationError extends ApiError {
  constructor(message = 'Permission denied', code = '403') {
    super(message, code);
    this.name = 'AuthorizationError';
  }
}

/** Triggered when the server returns 400 Bad Request (e.g. invalid credentials) */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', code = '400') {
    super(message, code);
    this.name = 'ValidationError';
  }
}

/** Triggered on network disconnection or timeout */
export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed', code = 'NETWORK_ERR') {
    super(message, code);
    this.name = 'NetworkError';
  }
}

/** Triggered when the server returns 500+ Internal Server Error */
export class ServerError extends ApiError {
  constructor(message = 'Internal server error', code = '500') {
    super(message, code);
    this.name = 'ServerError';
  }
}

/** Triggered when the server returns 429 Too Many Requests */
export class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', code = '429') {
    super(message, code);
    this.name = 'RateLimitError';
  }
}

/** Triggered when required environment variables or configurations are missing/malformed */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
