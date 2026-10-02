/**
 * The only file that knows Evolution GO exists. Swap this (and the webhook
 * parsing in server.js) to move to the official Cloud API — SETUP_GUIDE Appendix D.
 *
 * Evolution GO (whatsmeow) is NOT Evolution API v2: routes carry no instance
 * segment, and the instance is identified by its own token in the apikey header.
 * The global/server key only opens the admin routes.
 */
const BASE = (process.env.EVOLUTION_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const KEY = process.env.EVOLUTION_API_KEY ?? '';            // instance token
const GLOBAL_KEY = process.env.EVOLUTION_GLOBAL_KEY ?? '';  // server key, admin routes only
const INSTANCE_ID = process.env.EVOLUTION_INSTANCE_ID ?? '';

async function evo(method, path, body, { admin = false } = {}) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { apikey: admin ? GLOBAL_KEY : KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(`Evolution ${res.status} on ${path}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

/**
 * Outbound rate limit. A loop bug or an over-eager broadcast is how unofficial
 * numbers get banned, so the cap is enforced here rather than trusted upstream.
 */
const MAX_PER_MINUTE = Number(process.env.MAX_MESSAGES_PER_MINUTE ?? 20);
let windowStart = Date.now();
let sentInWindow = 0;

function rateLimitOk() {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= MAX_PER_MINUTE) return false;
  sentInWindow += 1;
  return true;
}

/**
 * `to` is a bare number with country code ("919787097006") or a full JID
 * ("919787097006@s.whatsapp.net", "123...@lid"). Both route; prefer the JID you
 * received, since @lid identities have no dialable number.
 *
 * `delay` makes Evolution hold the message briefly — paired with the typing
 * indicator it stops replies landing in the same millisecond as the question.
 */
export function sendText(to, text, { delay = 1200 } = {}) {
  if (!rateLimitOk()) {
    return Promise.reject(new Error(`rate limit: over ${MAX_PER_MINUTE} messages/minute — not sent`));
  }
  return evo('POST', 'send/text', { number: to, text, delay });
}

export function markAsRead({ remoteJid, id }) {
  return evo('POST', 'message/markread', {
    number: remoteJid,
    id: [id],                // Go build takes an array of ids, not read-receipt objects
  }).catch(() => {});        // cosmetic — never fail a reply over a read receipt
}

export function setTyping(to, delay = 1500) {
  return evo('POST', 'message/presence', {
    number: to, state: 'composing', delay,
  }).catch(() => {});
}

/**
 * Normalised to the v2 vocabulary the rest of the app already speaks, so
 * server.js's watchdog ("open" means healthy) keeps working unchanged.
 */
export async function connectionState() {
  try {
    const r = await evo('GET', 'instance/status');
    const d = r?.data ?? {};
    const connected = d.Connected ?? d.connected;
    const loggedIn = d.LoggedIn ?? d.loggedIn;
    if (connected && loggedIn) return 'open';
    if (connected) return 'connecting';
    return 'close';
  } catch {
    return 'unreachable';
  }
}

/**
 * Set or re-set the webhook. Handy as an npm script after an ngrok restart.
 * Evolution GO has no webhook/set route — the webhook URL and the event
 * subscription both ride on instance/connect, which is a no-op for the WhatsApp
 * session when it is already paired.
 */
export function setWebhook(url, events = ['MESSAGE', 'CONNECTION']) {
  return evo('POST', 'instance/connect', {
    webhookUrl: url,
    subscribe: events,
    immediate: true,
  });
}

/** Admin route — uses the global key. Useful to look up tokens and ids. */
export function listInstances() {
  return evo('GET', 'instance/all', undefined, { admin: true });
}

export { INSTANCE_ID };
