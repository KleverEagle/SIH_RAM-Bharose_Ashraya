require('dotenv').config();

// Fail fast if critical config is missing.
if (!process.env.JWT_SECRET) {
  console.error('[ERROR] JWT_SECRET is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const app = require('./app');
const consoleChatService = require('./services/llm');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Listening on port ${PORT}`);
  console.log(`[SERVER] CORS allowed origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  // Console REPL for the temporary human-controlled chatbot.
  // consoleChatService.start();
});

process.on('unhandledRejection', (err) => {
  console.error('[ERROR] Unhandled promise rejection:', err);
});

module.exports = server;
