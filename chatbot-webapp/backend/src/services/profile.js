const { findUserById, findUserByEmail, updateUser } = require('../db/queries');
const AppError = require('../utils/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only these fields may ever be changed via PUT /api/v1/profile.
// id, passwordHash, createdAt, and any future admin/permission fields
// are never accepted from the request body.
const EDITABLE_FIELDS = ['name', 'email', 'phone', 'photo'];

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    photo: row.photo,
  };
}

async function getProfile(userId) {
  const row = await findUserById(userId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  return toPublicUser(row);
}

function validateUpdates(body) {
  const updates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 200) {
      throw new AppError(400, 'VALIDATION_ERROR', 'name must be a non-empty string (max 200 chars).');
    }
    updates.name = body.name.trim();
  }

  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email must be a valid email address.');
    }
    updates.email = body.email.trim().toLowerCase();
  }

  if (body.phone !== undefined) {
    if (body.phone !== null && (typeof body.phone !== 'string' || body.phone.length > 40)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'phone must be a string (max 40 chars) or null.');
    }
    updates.phone = body.phone;
  }

  if (body.photo !== undefined) {
    if (body.photo !== null && (typeof body.photo !== 'string' || body.photo.length > 2000)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'photo must be a URL string (max 2000 chars) or null.');
    }
    updates.photo = body.photo;
  }

  // Reject attempts to set anything outside the whitelist (id, password
  // hash, permissions, createdAt, etc.) instead of silently ignoring
  // them, so the frontend gets clear feedback.
  const disallowed = Object.keys(body).filter((k) => !EDITABLE_FIELDS.includes(k));
  if (disallowed.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', `Field(s) not editable: ${disallowed.join(', ')}`);
  }

  return updates;
}

async function updateProfile(userId, body) {
  const updates = validateUpdates(body);

  if (Object.keys(updates).length === 0) {
    return await getProfile(userId);
  }

  if (updates.email) {
    const existing = await findUserByEmail(updates.email);
    if (existing && existing.id !== userId) {
      throw new AppError(409, 'CONFLICT', 'That email is already in use.');
    }
  }

  await updateUser(userId, updates);

  return await getProfile(userId);
}

module.exports = { getProfile, updateProfile, toPublicUser };
