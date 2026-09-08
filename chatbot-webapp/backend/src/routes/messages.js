const express = require('express');
const { getMessages, createMessage } = require('../db/queries');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateConversation, touchConversation } = require('../services/conversation');
const chatService = require('../services/chat');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 4000;

function toPublicMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

router.use(requireAuth);

// GET /api/v1/messages
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const conversation = await getOrCreateConversation(req.user.id);

    const rows = await getMessages(conversation.id);

    res.json({ success: true, data: { messages: rows.map(toPublicMessage) } });
  })
);

// POST /api/v1/messages
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { content } = req.body || {};

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'content is required and must be a non-empty string.');
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `content must be at most ${MAX_MESSAGE_LENGTH} characters.`
      );
    }

    // 1 & 2: authenticated via middleware; find/create the user's conversation.
    const conversation = await getOrCreateConversation(req.user.id);

    // 3 & 4: validate (done above) and store the user's message.
    const userMessageRow = await createMessage(conversation.id, { role: 'user', content });
    await touchConversation(conversation.id);

    console.log('\n[CHAT] Message received');
    console.log(`Request: ${req.requestId}`);
    console.log(`User: ${req.user.id}`);
    console.log(`Message: ${content}`);

    // 5: pass the message to the chat service and wait for a response.
    let replyText;
    try {
      console.log(`[CHAT] Waiting for console response\nRequest: ${req.requestId}`);
      replyText = await chatService.generateResponse({
        requestId: req.requestId,
        user: { id: req.user.id },
        message: content,
        conversation,
      });
      console.log(`[CHAT] Console response received\nRequest: ${req.requestId}`);
    } catch (err) {
      if (err.message === 'CHAT_RESPONSE_TIMEOUT') {
        // Per spec: the user message stays saved (it was genuinely
        // received); we must NOT fabricate/store an assistant reply.
        throw new AppError(504, 'CHAT_RESPONSE_TIMEOUT', 'The chatbot response timed out.');
      }
      console.error(`[ERROR] Chat service failure for request ${req.requestId}:`, err);
      throw new AppError(502, 'CHAT_SERVICE_ERROR', 'The chatbot service failed to respond.');
    }

    // 6 & 7: store the assistant response (only now that we actually have one).
    const assistantMessageRow = await createMessage(conversation.id, {
      role: 'assistant',
      content: replyText,
    });
    await touchConversation(conversation.id);

    console.log(`[CHAT] Response sent\nRequest: ${req.requestId}\n`);

    // 8: return both messages.
    res.json({
      success: true,
      data: {
        userMessage: toPublicMessage(userMessageRow),
        assistantMessage: toPublicMessage(assistantMessageRow),
      },
    });
  })
);

module.exports = router;
