import pino from "pino";

/**
 * Structured logger using Pino
 * Automatically pretty-prints in development, JSON in production
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Pretty print in development
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss",
      },
    },
  }),

  // Base fields
  base: {
    env: process.env.NODE_ENV || "development",
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        "user-agent": req.headers?.["user-agent"],
        // Don't log authorization headers
      },
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },

  // Redact sensitive fields
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "secret",
      "api_key",
      "apiKey",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log API request/response
 */
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  extra?: Record<string, any>,
) {
  logger.info(
    {
      type: "api_request",
      method,
      url,
      status,
      duration,
      ...extra,
    },
    `${method} ${url} ${status} ${duration}ms`,
  );
}

/**
 * Log cron job execution
 */
export function logCron(
  name: string,
  status: "started" | "completed" | "failed",
  duration?: number,
  error?: Error,
) {
  const logLevel = status === "failed" ? "error" : "info";
  logger[logLevel](
    {
      type: "cron",
      name,
      status,
      duration,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    },
    `Cron ${name}: ${status}${duration ? ` (${duration}ms)` : ""}`,
  );
}

/**
 * Log database operation
 */
export function logDatabase(operation: string, table: string, duration: number, rowCount?: number) {
  logger.debug(
    {
      type: "database",
      operation,
      table,
      duration,
      rowCount,
    },
    `DB ${operation} ${table} ${duration}ms${rowCount ? ` (${rowCount} rows)` : ""}`,
  );
}

/**
 * Log external API call
 */
export function logExternalAPI(
  service: string,
  endpoint: string,
  status: number,
  duration: number,
  error?: Error,
) {
  const logLevel = status >= 400 || error ? "warn" : "debug";
  logger[logLevel](
    {
      type: "external_api",
      service,
      endpoint,
      status,
      duration,
      error: error
        ? {
            message: error.message,
          }
        : undefined,
    },
    `${service} ${endpoint} ${status} ${duration}ms`,
  );
}

/**
 * Timer utility for measuring duration
 */
export function startTimer() {
  const start = Date.now();
  return {
    end: () => Date.now() - start,
  };
}

/**
 * Wrapper for API route handlers with automatic logging
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  name: string,
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const timer = startTimer();
    const childLogger = createLogger({ handler: name });

    try {
      childLogger.debug({ type: "handler_start" }, `Starting ${name}`);
      const result = await handler(...args);
      const duration = timer.end();
      childLogger.info(
        { type: "handler_complete", duration },
        `Completed ${name} in ${duration}ms`,
      );
      return result;
    } catch (error) {
      const duration = timer.end();
      childLogger.error(
        { type: "handler_error", duration, error },
        `Failed ${name} after ${duration}ms: ${(error as Error).message}`,
      );
      throw error;
    }
  }) as T;
}
