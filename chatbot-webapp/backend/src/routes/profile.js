const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const profileService = require('../services/profile');

const router = express.Router();

router.use(requireAuth);

// GET /api/v1/profile
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  })
);

// PUT /api/v1/profile
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const updated = await profileService.updateProfile(req.user.id, req.body || {});
    res.json({ success: true, data: updated });
  })
);

module.exports = router;
