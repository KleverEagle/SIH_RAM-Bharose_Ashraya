/**
 * Chat service abstraction.
 *
 * Routes call `generateResponse(...)` from this module and never talk to
 * ConsoleChatService (or, later, LLMChatService) directly. To switch the
 * backend from the console implementation to a real LLM in the future,
 * change only the `activeChatService` assignment below.
 */
const LLMChatService = require('./llm');

const activeChatService = LLMChatService; 
// Later: const activeChatService = require('./llmProvider');

/**
 * @param {object} params
 * @param {string} params.requestId
 * @param {{id: string}} params.user
 * @param {string} params.message
 * @param {{id: string}} params.conversation
 * @returns {Promise<string>} the assistant's reply text
 */
function generateResponse(params) {
  return activeChatService.generateResponse(params);
}

module.exports = { generateResponse };
