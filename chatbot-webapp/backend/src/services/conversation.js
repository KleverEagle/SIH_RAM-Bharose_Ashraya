const {
  findConversationByUserId,
  createConversation,
  updateConversation,
} = require('../db/queries');

function toPublicConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Returns the authenticated user's single conversation, creating it if
 * this is their first time interacting with the chatbot.
 *
 * The UNIQUE constraint on conversations.user_id (see db/schema.js) is
 * the actual enforcement mechanism; this function just implements
 * find-or-create on top of it.
 */
async function getOrCreateConversation(userId) {
  const existing = await findConversationByUserId(userId);
  if (existing) return toPublicConversation(existing);

  const created = await createConversation(userId);
  return toPublicConversation(created);
}

async function touchConversation(conversationId) {
  await updateConversation(conversationId, {
    updatedAt: new Date().toISOString(),
  });
}

module.exports = { getOrCreateConversation, touchConversation };
