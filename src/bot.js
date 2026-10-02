import { GoogleGenAI } from '@google/genai';
import { retrieveKnowledgeChunks } from './knowledgeBase.js';
import { SALES_PROMPT, FALLBACK_LINE } from './prompt.js';
import { guardOutgoing, hasPaymentIntent } from './guard.js';
import { sendText, markAsRead, setTyping } from './whatsapp.js';
import { escalate } from './escalate.js';
import { appendMessage, getLeadByNumber } from './leads.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

// In-memory sessions. Fine for one server; use Redis (you already run one for
// Evolution) when you scale past a single instance.
const sessions = new Map();
const seenMessageIds = new Set();              // Evolution re-delivers — dedupe
const optedOut = new Set();

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;     // 2 hours of silence = fresh conversation

function getSession(from) {
  const now = Date.now();
  const s = sessions.get(from);
  if (!s || now - s.lastSeen > SESSION_TTL_MS) {
    const fresh = { history: [], lead: {}, fallbackCount: 0, lastSeen: now };
    sessions.set(from, fresh);
    return fresh;
  }
  s.lastSeen = now;
  return s;
}

function isOutsideHours() {
  const ist = new Date(Date.now() + (330 - new Date().getTimezoneOffset()) * 60000);
  const day = ist.getUTCDay();           // 0 = Sunday
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (day === 0) return true;            // closed Sunday
  return mins < 9 * 60 + 30 || mins > 17 * 60 + 30;
}

/**
 * Pull lead fields out of the conversation as they appear, so the Kanban card
 * fills itself. Deliberately conservative — a wrong guess on the board is worse
 * than a blank field the team fills in.
 */
function captureLeadFields(session, text) {
  const lead = session.lead;

  const name = text.match(/\b(?:i am|i'm|my name is|this is|naan)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (name && !lead.name) lead.name = name[1];

  const business = text.match(/\b(?:my|our)\s+(?:business|company|shop|store|brand|startup|firm)\s+(?:is\s+)?(?:called\s+)?([\w\s&.'-]{2,40})/i);
  if (business && !lead.business) lead.business = business[1].trim();

  const SERVICES = {
    website: /\b(?:website|web\s*site|webpage|landing page)\b/i,
    ecommerce: /\b(?:e-?commerce|online store|shopping cart)\b/i,
    app: /\b(?:mobile app|android|ios|app development)\b/i,
    social: /\b(?:social media|instagram|insta|facebook|reels?)\b/i,
    ads: /\b(?:ads?|advertis\w+|campaign)\b/i,
    seo: /\bseo\b/i,
    branding: /\b(?:logo|branding|brand identity)\b/i,
    video: /\b(?:video|videography|editing|shoot)\b/i,
  };
  for (const [key, re] of Object.entries(SERVICES)) {
    if (re.test(text)) { lead.service = key; break; }
  }

  const timeline = text.match(/\b(?:this|next)\s+(?:week|month)\b|\b(?:asap|urgent|immediately)\b|\bin\s+\d+\s*(?:days?|weeks?|months?)\b/i);
  if (timeline && !lead.timeline) lead.timeline = timeline[0];

  return lead;
}

/** 3+ captured fields is a real lead worth a human's attention. */
function isQualified(lead) {
  return ['name', 'business', 'service', 'timeline'].filter(k => lead[k]).length >= 3;
}

export async function handleIncomingMessage(msg) {
  const { from, remoteJid, messageId, type, text, profileName } = msg;
  const to = remoteJid || from;           // always reply to the JID we were given

  if (seenMessageIds.has(messageId)) return;
  seenMessageIds.add(messageId);
  if (seenMessageIds.size > 5000) seenMessageIds.clear();

  markAsRead({ remoteJid: to, id: messageId });

  if (optedOut.has(from)) return;

  if (/^\s*(stop|unsubscribe|opt\s*out)\s*$/i.test(text)) {
    optedOut.add(from);
    return sendText(to, "Understood — we won't message you again. Thanks for letting us know.");
  }

  const session = getSession(from);

  // Non-text messages: acknowledge, hand to a human, don't guess at content.
  if (type !== 'text') {
    await escalate({
      from, remoteJid: to, profileName, tag: `media_${type}`,
      lastMessages: [`[${type} received]`], lead: session.lead,
    });
    return sendText(to,
      type === 'audio'
        ? "Thanks for the voice note! Could you type the key points so I can help right away, or shall I have the team call you back?"
        : "Got your file — I'll pass it to the team to review. Could you tell me briefly what it's regarding?");
  }

  if (!text) return;

  captureLeadFields(session, text);

  // ---- GUARD BEFORE the model for payment intent: the LLM never even sees it ----
  if (hasPaymentIntent(text)) {
    const { text: safe } = guardOutgoing('', { customerAskedAboutPayment: true });
    session.history.push({ role: 'user', content: text });
    session.history.push({ role: 'assistant', content: safe });
    const row = await escalate({
      from, remoteJid: to, profileName, tag: 'payment_query',
      lastMessages: [text], lead: session.lead,
    });
    appendMessage(row.id, { text: safe, from: 'bot' });
    return sendText(to, safe);
  }

  // Typing indicator while the model works — the reply is a second or two out.
  setTyping(to, 1800);

  // ---- Retrieve + generate ----
  const { chunks } = retrieveKnowledgeChunks(text);
  const context = chunks
    .map(c => `=== KNOWLEDGE CHUNK: ${c.title} [${c.id}] ===\n${c.content}`)
    .join('\n\n');

  let reply;
  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        ...session.history.slice(-10).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: `RETRIEVED KNOWLEDGE:\n${context}\n\nCUSTOMER MESSAGE:\n${text}` }] },
      ],
      config: {
        systemInstruction: SALES_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    });
    reply = result.text?.trim();
  } catch (err) {
    console.error('[llm] failed:', err.message);
    reply = null;
  }

  // Model down or empty → fall back rather than go silent.
  if (!reply) {
    reply = `${FALLBACK_LINE} Could you tell me a bit about your business in the meantime?`;
    await escalate({ from, remoteJid: to, profileName, tag: 'llm_error', lastMessages: [text], lead: session.lead });
  }

  // ---- GUARD AFTER the model ----
  const guarded = guardOutgoing(reply);
  let out = guarded.text;

  if (guarded.blocked) {
    await escalate({
      from, remoteJid: to, profileName, tag: `guard_${guarded.reasons.join('_')}`,
      lastMessages: [text], lead: session.lead,
    });
  }

  // Fallback used → always escalate, so no lead dies in the bot.
  if (out.includes('check with the team')) {
    session.fallbackCount += 1;
    await escalate({
      from, remoteJid: to, profileName, tag: 'fallback',
      lastMessages: [text, out], lead: session.lead,
    });
  }

  if (/\b(talk|speak|connect).{0,15}(human|person|someone|team member)\b/i.test(text)) {
    out += "\n\nI've let the team know — they'll reach out during working hours. For anything urgent: +91 97870 97006";
    await escalate({ from, remoteJid: to, profileName, tag: 'human_requested', lastMessages: [text], lead: session.lead });
  }

  // A lead with enough detail captured is worth a human's time even if nothing
  // else tripped — Section 16 of the Q&A playbook.
  if (isQualified(session.lead) && !session.escalatedAsQualified) {
    session.escalatedAsQualified = true;
    await escalate({ from, remoteJid: to, profileName, tag: 'qualified_lead', lastMessages: [text], lead: session.lead });
  }

  if (isOutsideHours()) {
    out += "\n\n_The team's offline right now, but I've logged this and they'll get back to you after 9:30 AM._";
  }

  session.history.push({ role: 'user', content: text });
  session.history.push({ role: 'assistant', content: out });

  // If this person is already on the board, keep its transcript current so the
  // team sees what the bot said before they take over.
  const row = getLeadByNumber(from);
  if (row) appendMessage(row.id, { text: out, from: 'bot' });

  return sendText(to, out);
}
