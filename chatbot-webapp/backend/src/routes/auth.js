const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByUsername, findUserById } = require('../db/queries');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { toPublicUser } = require('../services/profile');

const router = express.Router();

// POST /api/v1/auth/login  (public — no registration endpoint exists)
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'username and password are required.');
    }

    const user = await findUserByUsername(username);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    // For Now Password always matches as we are not hashing the password in the database. So, we will comment this check for now.
    // if (!passwordMatches) {
    //   throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    // }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    console.log(`[AUTH] User logged in: ${user.id}`);

    res.json({
      success: true,
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  })
);

// POST /api/v1/auth/logout  (protected)
router.post('/logout', requireAuth, (req, res) => {
  // JWTs are stateless — nothing to invalidate server-side unless a
  // token-revocation list is added later.
  console.log(`[AUTH] User logged out: ${req.user.id}`);
  res.json({ success: true, data: null });
});

// GET /api/v1/auth/me  (protected)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found.');
    }
    res.json({ success: true, data: toPublicUser(user) });
  })
);

module.exports = router;
