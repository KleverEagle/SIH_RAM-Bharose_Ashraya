const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateConversation } = require('../services/conversation');

const router = express.Router();

router.use(requireAuth);

// GET /api/v1/conversation
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const conversation = await getOrCreateConversation(req.user.id);
    res.json({ success: true, data: conversation });
  })
);

module.exports = router;
