const readline = require('readline');
const { analyzeVictimMessage } = require('./victimAnalysis.js');
const {getMessages, createMessage, updateUser,findUserById } = require('../db/queries.js');

/**
 * ConsoleChatService
 * -------------------
 * Temporary, human-controlled chatbot implementation. A developer types
 * responses directly into the server console instead of calling an LLM.
 *
 * Multiple users can be chatting concurrently, so every incoming message
 * becomes a "pending request" sitting in a Map, identified by request ID.
 * The developer replies to a *specific* request ID (`reply <requestId>`),
 * never just "the next line typed" — order of arrival must not matter.
 *
 * This class exposes exactly the interface a future LLMChatService must
 * also implement:
 *
 *   generateResponse({ requestId, user, message, conversation }) -> Promise<string>
 *
 * Swapping this out later (see services/chat.js) requires no changes to
 * routes, the database schema, or the frontend contract.
 */
//class ConsoleChatService {
//   constructor() {
//     /** @type {Map<string, PendingRequest>} */
//     this.pending = new Map();
//     this.rl = null;
//     // requestId currently selected via `reply <id>`, awaiting the next
//     // line of input to be treated as the response body.
//     this.awaitingReplyFor = null;
//   }

//   /**
//    * Registers a new pending chat request and returns a promise that
//    * resolves with the assistant's reply text (typed into the console)
//    * or rejects on timeout.
//    */
//   generateResponse({ requestId, user, message, conversation }) {
//     const timeoutMs = Number(process.env.CHAT_RESPONSE_TIMEOUT_MS || 300000);

//     return new Promise((resolve, reject) => {
//       const timeoutHandle = setTimeout(() => {
//         const entry = this.pending.get(requestId);
//         if (!entry) return; // already resolved
//         this.pending.delete(requestId);
//         if (this.awaitingReplyFor === requestId) this.awaitingReplyFor = null;
//         console.log(`\n[CHAT] Request timed out\nRequest: ${requestId}\n`);
//         reject(new Error('CHAT_RESPONSE_TIMEOUT'));
//       }, timeoutMs);

//       this.pending.set(requestId, {
//         requestId,
//         userId: user.id,
//         conversationId: conversation.id,
//         content: message,
//         timestamp: new Date().toISOString(),
//         resolve,
//         reject,
//         timeoutHandle,
//       });

//       this._printPendingBanner(this.pending.get(requestId));
//     });
//   }

//   _printPendingBanner(entry) {
//     console.log('\n==================================================');
//     console.log('PENDING RESPONSE');
//     console.log('==================================================');
//     console.log(`Request ID: ${entry.requestId}`);
//     console.log(`User ID: ${entry.userId}`);
//     console.log('');
//     console.log('User:');
//     console.log(entry.content);
//     console.log('');
//     console.log(`Type "reply ${entry.requestId}" to respond.`);
//     console.log('==================================================\n');
//   }

//   _resolveRequest(requestId, responseText) {
//     const entry = this.pending.get(requestId);
//     if (!entry) {
//       console.log(`[CHAT] No pending request with ID "${requestId}".`);
//       return false;
//     }
//     clearTimeout(entry.timeoutHandle);
//     this.pending.delete(requestId);
//     entry.resolve(responseText);
//     console.log(`[CHAT] Response sent for request ${requestId}.\n`);
//     return true;
//   }

//   _printPendingList() {
//     if (this.pending.size === 0) {
//       console.log('[CHAT] No pending requests.\n');
//       return;
//     }
//     console.log('\nPENDING REQUESTS:\n');
//     for (const entry of this.pending.values()) {
//       console.log(entry.requestId);
//       console.log(`User: ${entry.userId}`);
//       console.log(`Message: ${entry.content}`);
//       console.log('');
//     }
//   }

//   _printHelp() {
//     console.log(`
// Available console commands:
//   pending             List all pending chat requests.
//   reply <requestId>   Select a pending request and type its response
//                        on the next line.
//   help                Show this help text.
//   exit                Shut down the server.
// `);
//   }

//   /**
//    * Starts the interactive console REPL. Called once from server.js
//    * after the HTTP server is listening. The console stays available for
//    * the lifetime of the process.
//    */
//   start() {
//     this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
//     console.log('[CHAT] Console chatbot ready. Type "help" for commands.\n');
//     this.rl.setPrompt('> ');
//     this.rl.prompt();

//     this.rl.on('line', (line) => {
//       const input = line.trim();

//       // If we're mid-`reply <id>`, this line IS the response text.
//       if (this.awaitingReplyFor) {
//         const requestId = this.awaitingReplyFor;
//         this.awaitingReplyFor = null;
//         this._resolveRequest(requestId, input);
//         this.rl.prompt();
//         return;
//       }

//       if (input === '') {
//         this.rl.prompt();
//         return;
//       }

//       const [command, ...rest] = input.split(' ');

//       switch (command) {
//         case 'pending':
//           this._printPendingList();
//           break;

//         case 'reply': {
//           const requestId = rest[0];
//           if (!requestId) {
//             console.log('Usage: reply <requestId>');
//             break;
//           }
//           if (!this.pending.has(requestId)) {
//             console.log(`[CHAT] No pending request with ID "${requestId}".`);
//             break;
//           }
//           this.awaitingReplyFor = requestId;
//           console.log('Enter response:');
//           break;
//         }

//         case 'help':
//           this._printHelp();
//           break;

//         case 'exit':
//           console.log('Shutting down...');
//           process.exit(0);
//           break;

//         default:
//           console.log(`Unknown command "${command}". Type "help" for a list of commands.`);
//       }

//       this.rl.prompt();
//     });
//   }
// }

class LLMChatService {
  async generateResponse({ requestId, user, message, conversation }) {
    const userId = user.id;

    const userData = await findUserById(userId);

    if (!userData) {
      throw new Error('USER_NOT_FOUND');
    }

    const chatHistory = (await getMessages(conversation.id)).map(message => ({
      role: message.role,
      text: message.content
    }));

    const dynamicProfileString = `Name: ${userData.name || "Unknown"} | Age: ${userData.age || "N/A"} | Gender: ${userData.gender || "N/A"} | Crime Category: ${userData.crime_category || "General"} | Case Stage: ${userData.case_stage || "Active"}`;

    const aiResponse = await analyzeVictimMessage(
      dynamicProfileString,
      chatHistory,
      message
    );

    if (!aiResponse) {
      throw new Error('FAILED_TO_GENERATE_AI_RESPONSE');
    }

    await updateUser(userId, {
      latestDistressScore: aiResponse.distress_score,
      latestRiskLevel: aiResponse.risk_level,
      latestEmotion: aiResponse.primary_emotion,
      needsEscalation: aiResponse.immediate_escalation,
      recommendedIntervention: aiResponse.recommended_intervention,
      lastUpdated: new Date().toISOString()
    });

    return aiResponse.chat_reply;
  }
}

module.exports = new LLMChatService();

// module.exports = new ConsoleChatService();
