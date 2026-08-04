const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const AiChatMessage = require('../models/AiChatMessage');

const HISTORY_LIMIT = 20;

const SYSTEM_PROMPT = `You are the in-app AI assistant for AnyWork, a local jobs marketplace app connecting people who need everyday help (delivery, cleaning, moving, etc.) with workers nearby.
Answer questions about using the app: posting jobs, applying to jobs, payments, ratings, account/profile settings, and general how-it-works questions.
Keep replies short, friendly, and in plain language. If asked something unrelated to the app or outside your knowledge, say so honestly and suggest contacting human support (Call or Email Support on the Help & Support screen).`;

const callOllama = async (messages) => {
  let res;
  try {
    res = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });
  } catch {
    throw new ApiError(503, 'AI assistant is unavailable. Make sure Ollama is running.', 'AI_UNAVAILABLE');
  }

  if (!res.ok) {
    throw new ApiError(502, 'AI assistant failed to respond', 'AI_UPSTREAM_ERROR');
  }

  const data = await res.json();
  return data.message?.content?.trim() || '';
};

const askAssistant = async ({ userId, text }) => {
  await AiChatMessage.create({ user: userId, role: 'user', text });

  const history = await AiChatMessage.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .then((docs) => docs.reverse());

  const reply = await callOllama(history.map((msg) => ({ role: msg.role, content: msg.text })));

  const assistantMessage = await AiChatMessage.create({ user: userId, role: 'assistant', text: reply });

  return assistantMessage;
};

const getHistory = async ({ userId, limit = 50 }) =>
  AiChatMessage.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then((docs) => docs.reverse());

module.exports = { askAssistant, getHistory };
