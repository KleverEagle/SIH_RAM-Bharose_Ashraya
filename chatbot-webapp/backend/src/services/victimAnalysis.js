const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


async function analyzeVictimMessage(victimProfile, chatHistory, currentMessage, retries = 3) {
    let formattedHistory = "";
    if (chatHistory && chatHistory.length > 0) {
        formattedHistory = chatHistory.map(msg => `${msg.role === 'user' ? 'Victim' : 'AI'}: ${msg.text}`).join("\n");
    } else {
        formattedHistory = "No previous history. This is the start of the conversation.";
    }

    const prompt = `
  You are an empathetic, trauma-informed psychological monitoring assistant for victims of atrocities in India, linked with NHAA (14566).
  
  VICTIM CONTEXT:
  - Profile: ${victimProfile}
  
  CRITICAL RULES:
  1. LANGUAGE (AUTO-DETECT): Identify the language and script of the CURRENT VICTIM MESSAGE (e.g., Hindi, English, Marathi, Hinglish). Write the 'chat_reply' in that exact same language and script. Keep all JSON keys strictly in English.
  2. DYNAMIC TONE: If distress score > 70, use short, grounding safety sentences. If < 40, use a warm conversational tone.
  3. PROACTIVE GUIDANCE: End your 'chat_reply' with a helpful, concise, actionable question offering support.
  4. EMERGENCY ROUTING: Set 'immediate_escalation' to true if risk_level is Critical or immediate physical danger/intimidation is detected. Otherwise set to false.
  5. RESOURCE INJECTION: Provide a specific Indian administrative or legal resource, helpline number (such as NHAA 14566), or portal link in 'actionable_link' if high risk/action is needed, or null if low risk.
  6. LOCALIZATION: Account for Indian regional phrasing, colloquial expressions of distress, and context-specific cultural idioms so local terms are accurately understood.

  PAST CONVERSATION HISTORY:
  ${formattedHistory}

  CURRENT VICTIM MESSAGE: 
  "${currentMessage}"

  Analyze the message and respond ONLY with a valid raw JSON object (no markdown formatting blocks, just the raw JSON) matching these exact keys:
  {
    "chat_reply": "your concise empathetic response ending with a proactive question",
    "distress_score": a number from 1 to 100,
    "risk_level": "Low", "Medium", or "Critical",
    "primary_emotion": "one or two emotion words in English",
    "recommended_intervention": "what the district authority/nodal officer should do (in English)",
    "immediate_escalation": true or false,
    "actionable_link": "precise resource name, helpline number, or portal link, or null"
  }
  `;

    // Updated active Groq production model fallback chain
    const modelChain = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];

    for (const modelName of modelChain) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const apiCall = groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: prompt
                        },
                        {
                            role: "user",
                            content: currentMessage
                        }
                    ],
                    model: modelName,
                    temperature: 0.2
                });

                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("API Request Timeout")), 15000)
                );

                const response = await Promise.race([apiCall, timeout]);
                let rawContent = response.choices[0].message.content.trim();

                // Clean markdown code blocks if the model includes them
                if (rawContent.startsWith("```json")) {
                    rawContent = rawContent.replace(/^```json/, "").replace(/```$/, "").trim();
                } else if (rawContent.startsWith("```")) {
                    rawContent = rawContent.replace(/^```/, "").replace(/```$/, "").trim();
                }

                return JSON.parse(rawContent);

            } catch (error) {
                const waitTime = error.status === 429 ? 5000 : 2000;
                console.warn(`⚠️ [${modelName}] Attempt ${attempt} failed (${error.status || error.message || 'Server Error'}). Retrying in ${waitTime / 1000} seconds...`);

                if (attempt === retries) {
                    console.warn(`⚠️ Model ${modelName} exhausted all retries. Shifting to fallback model tier...`);
                } else {
                    await new Promise(res => setTimeout(res, waitTime));
                }
            }
        }
    }

    console.error("❌ All models and retries failed for this case.");
    return null;
}

module.exports = { analyzeVictimMessage };
