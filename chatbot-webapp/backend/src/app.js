const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { randomUUID } = require('crypto');
const AppError = require('./utils/AppError');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const conversationRoutes = require('./routes/conversation');
const messagesRoutes = require('./routes/messages');

const app = express();

// --- CORS -------------------------------------------------------------
// Only the configured frontend origin may call this API. Do not widen
// this to "*" in production.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());

// --- Body parsing with a reasonable size limit -------------------------
app.use(express.json({ limit: '1mb' }));

// --- Request ID ---------------------------------------------------------
// Accept a client-supplied X-Request-ID (useful for the frontend to
// correlate its own logs), otherwise generate one. Used throughout the
// chat flow to match a console reply to the right pending HTTP request.
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// --- Routes --------------------------------------------------------------
const API_BASE = '/api/v1';
app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/profile`, profileRoutes);
app.use(`${API_BASE}/conversation`, conversationRoutes);
app.use(`${API_BASE}/messages`, messagesRoutes);

// --- 404 -------------------------------------------------------------
app.use((req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found.'));
});

// --- Malformed JSON / centralized error handler -------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Malformed JSON in request body.' },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Unexpected error: log full detail server-side, never leak it to the client.
  console.error(`[ERROR] Unhandled error on request ${req.requestId}:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
});

module.exports = app;
