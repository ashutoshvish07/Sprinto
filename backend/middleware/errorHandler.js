const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  // Make sure statusCode is always a valid number
  let statusCode = err.statusCode || err.status || 500
  if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
    statusCode = 500
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404
    err.message = 'Resource not found'
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue || {})[0] || 'Field'
    err.message = `${field} already exists`
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400
    err.message = Object.values(err.errors).map((e) => e.message).join(', ')
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    err.message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    err.message = 'Token expired'
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
  })
}

module.exports = { asyncHandler, ApiError, errorHandler }