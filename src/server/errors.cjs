class AppError extends Error {
  constructor(message, options = {}) {
    super(message || 'เกิดข้อผิดพลาด');
    this.name = 'AppError';
    this.status = Number(options.status || 500);
    this.code = options.code || 'internal_error';
    this.details = options.details;
  }
}

function toHttpError(error, fallbackStatus = 500) {
  if (error instanceof AppError) {
    const body = {
      ok: false,
      error: error.message,
      code: error.code,
    };
    if (error.details !== undefined) body.details = error.details;
    return { status: error.status || fallbackStatus, body };
  }
  const message = error instanceof Error ? error.message : String(error || 'เกิดข้อผิดพลาด');
  return {
    status: fallbackStatus,
    body: {
      ok: false,
      error: message,
      code: fallbackStatus >= 500 ? 'internal_error' : 'bad_request',
    },
  };
}

function sendError(res, error, fallbackStatus = 500) {
  const result = toHttpError(error, fallbackStatus);
  res.status(result.status).json(result.body);
}

module.exports = {
  AppError,
  toHttpError,
  sendError,
};
