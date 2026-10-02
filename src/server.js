import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import { handleIncomingMessage } from './bot.js';
import { api } from './api.js';
import { connectionState } from './whatsapp.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const SECRET = process.env.WEBHOOK_SECRET ?? '';

/** Constant-time compare, so the secret can't be guessed a character at a time. */
function secretOk(given) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Pull the human-readable text out of whichever message shape arrived. */
function extractText(message = {}) {
  return (
    message.conversation ??
    message.Conversation ??
    message.extendedTextMessage?.text ??
    message.ExtendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    message.buttonsResponseMessage?.selectedDisplayText ??
    message.listResponseMessage?.title ??
    ''
  );
}

/** Evolution's messageType → the simple kinds the bot reasons about. */
function simpleType(messageType) {
  if (messageType === 'conversation' || messageType === 'extendedTextMessage') return 'text';
  if (messageType === 'audioMessage') return 'audio';
  if (messageType === 'imageMessage') return 'image';
  if (messageType === 'videoMessage') return 'video';
  if (messageType === 'documentMessage') return 'document';
  return messageType ?? 'unknown';
}

/** First key of the message object — the Go build omits messageType. */
function inferType(message = {}) {
  const k = Object.keys(message)[0] ?? '';
  return k.charAt(0).toLowerCase() + k.slice(1);
}

/**
 * Evolution GO (whatsmeow) and Evolution API v2 disagree on envelope shape and
 * on struct casing, and the Go build's event names are bare ("MESSAGE") rather
 * than lower-dotted. Normalise both into one shape here so bot.js never has to
 * care which server is upstream.
 */
function normalise(body = {}) {
  const data = body.data ?? body.Data ?? body;

  // whatsmeow native: { Info: { Chat, Sender, ID, IsFromMe, PushName }, Message: {...} }
  const info = data.Info ?? data.info;
  if (info) {
    return {
      remoteJid: info.Chat ?? info.chat ?? info.RemoteJid ?? '',
      fromMe: Boolean(info.IsFromMe ?? info.isFromMe ?? info.FromMe),
      id: info.ID ?? info.Id ?? info.id ?? '',
      message: data.Message ?? data.message ?? {},
      messageType: info.Type ?? info.type,
      pushName: info.PushName ?? info.pushName ?? '',
    };
  }

  // v2: { data: { key: { remoteJid, fromMe, id }, message, messageType, pushName } }
  const key = data.key ?? data.Key;
  if (key) {
    return {
      remoteJid: key.remoteJid ?? key.RemoteJid ?? '',
      fromMe: Boolean(key.fromMe ?? key.FromMe),
      id: key.id ?? key.Id ?? '',
      message: data.message ?? data.Message ?? {},
      messageType: data.messageType,
      pushName: data.pushName ?? data.PushName ?? '',
    };
  }

  return { remoteJid: '', fromMe: false, id: '', message: {}, pushName: '' };
}

const CONNECTION_EVENTS = new Set(['connection', 'connection.update', 'connection_update']);
const MESSAGE_EVENTS = new Set(['message', 'messages', 'messages.upsert', 'messages_upsert']);

app.post('/webhook/:secret', (req, res) => {
  if (!SECRET || !secretOk(req.params.secret)) {
    console.warn('[webhook] bad secret — rejected');
    return res.sendStatus(401);
  }

  // ACK immediately. Evolution retries what it thinks failed, and a retry means
  // the customer gets the same reply twice.
  res.sendStatus(200);

  const event = String(req.body?.event ?? req.body?.Event ?? '').toLowerCase();

  if (CONNECTION_EVENTS.has(event)) {
    console.log('[evolution] connection:', JSON.stringify(req.body?.data ?? req.body).slice(0, 200));
    return;
  }

  // Receipts, presence, sent-echoes — anything that is not an inbound message.
  if (event && !MESSAGE_EVENTS.has(event)) return;

  const m = normalise(req.body);

  if (!m.remoteJid) {
    if (process.env.WEBHOOK_DEBUG) {
      console.log('[webhook] unrecognised payload:', JSON.stringify(req.body).slice(0, 600));
    }
    return;
  }

  if (m.fromMe) return;                              // the bot's own messages — ignore, or loop forever
  if (m.remoteJid.endsWith('@g.us')) return;         // group chat
  if (m.remoteJid === 'status@broadcast') return;    // someone's status update
  if (m.remoteJid.endsWith('@newsletter')) return;   // channel

  const text = extractText(m.message);

  handleIncomingMessage({
    remoteJid: m.remoteJid,                          // reply to this — works for @s.whatsapp.net and @lid
    from: m.remoteJid.split('@')[0],                 // digits, for logs and lead records
    messageId: m.id,
    type: simpleType(m.messageType ?? inferType(m.message)),
    text: typeof text === 'string' ? text.trim() : '',
    profileName: m.pushName,
  }).catch(err => console.error('[bot] handler failed:', err));
});

app.use('/api', api);
app.use('/', express.static('public'));

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`[server] listening on ${PORT}`);
  console.log(`[server] dashboard: http://localhost:${PORT}/?token=<DASHBOARD_TOKEN>`);

  for (const k of ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'WEBHOOK_SECRET', 'DASHBOARD_TOKEN', 'GEMINI_API_KEY']) {
    if (!process.env[k]) console.warn(`[server] WARNING: ${k} is not set`);
  }
  console.log('[evolution] connection state:', await connectionState());
});

/**
 * A dropped WhatsApp session goes silent rather than erroring, so something has
 * to watch it. Logs a line on every change — point your alerting at this.
 */
let lastState = null;
setInterval(async () => {
  const state = await connectionState();
  if (state !== lastState) {
    console.log(`[evolution] state changed: ${lastState ?? 'startup'} → ${state}`);
    if (state !== 'open') console.warn('[evolution] NOT CONNECTED — re-scan the QR from the handset');
    lastState = state;
  }
}, Number(process.env.CONNECTION_CHECK_MS ?? 120_000)).unref();
