import fs from 'node:fs';
import path from 'node:path';

// Serverless hosts ship a read-only bundle; /tmp is the only writable path there
// and it dies with the instance. See the persistence note in README.
const DIR = process.env.DATA_DIR ?? (process.env.VERCEL ? '/tmp/data' : 'data');
const STORE = path.join(DIR, 'leads.json');       // current state — the Kanban board reads this
const AUDIT = path.join(DIR, 'leads.jsonl');      // append-only history — never rewritten

export const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

/** Fields the dashboard is allowed to write. Anything else in a PATCH is ignored. */
const EDITABLE = ['stage', 'name', 'business', 'service', 'timeline', 'notes', 'value', 'owner'];

/**
 * Created on first write rather than at import. On a read-only filesystem this
 * used to throw during module load and kill the process before a single route
 * was served.
 */
function ensureDir() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    return true;
  } catch (err) {
    console.error(`[leads] cannot create ${DIR}:`, err.message);
    return false;
  }
}

function load() {
  try {
    const db = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    return Array.isArray(db?.leads) ? db : { leads: [] };
  } catch {
    return { leads: [] };
  }
}

/** Write to a temp file then rename — a crash mid-write can't leave a truncated store. */
function save(db) {
  if (!ensureDir()) return;
  try {
    const tmp = `${STORE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, STORE);
  } catch (err) {
    console.error('[leads] store write failed:', err.message);
  }
}

function audit(entry) {
  if (!ensureDir()) return;
  try {
    fs.appendFileSync(AUDIT, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
  } catch (err) {
    console.error('[leads] audit write failed:', err.message);
  }
}

function newId() {
  return `L${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function listLeads() {
  return load().leads;
}

export function getLead(id) {
  return load().leads.find(l => l.id === id) ?? null;
}

export function getLeadByNumber(number) {
  return load().leads.find(l => l.number === number) ?? null;
}

/**
 * One lead per WhatsApp number. Repeat contact updates the row rather than
 * duplicating it, so the board stays one-card-per-person.
 */
export function upsertLead({ number, remoteJid, profileName, tag, lastMessages = [], lead = {} }) {
  const db = load();
  const now = new Date().toISOString();
  let row = db.leads.find(l => l.number === number);

  if (!row) {
    row = {
      id: newId(),
      number,
      remoteJid: remoteJid ?? '',
      stage: 'new',
      name: lead.name || profileName || '',
      profileName: profileName || '',
      business: lead.business || '',
      service: lead.service || '',
      timeline: lead.timeline || '',
      value: '',
      owner: '',
      notes: '',
      tags: [],
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    db.leads.unshift(row);
  }

  if (remoteJid) row.remoteJid = remoteJid;
  if (profileName) row.profileName = profileName;
  row.name = lead.name || row.name || profileName || '';
  row.business = lead.business || row.business;
  row.service = lead.service || row.service;
  row.timeline = lead.timeline || row.timeline;
  row.updatedAt = now;

  if (tag && !row.tags.includes(tag)) row.tags.push(tag);
  for (const m of lastMessages) {
    if (m) row.messages.push({ at: now, from: 'customer', text: String(m).slice(0, 500) });
  }
  row.messages = row.messages.slice(-30);

  save(db);
  audit({ event: 'upsert', id: row.id, number, tag, lastMessages, lead });
  return row;
}

export function updateLead(id, patch = {}) {
  if (patch.stage && !STAGES.includes(patch.stage)) return null;

  const db = load();
  const row = db.leads.find(l => l.id === id);
  if (!row) return null;

  for (const k of EDITABLE) {
    if (k in patch) row[k] = typeof patch[k] === 'string' ? patch[k].slice(0, 2000) : patch[k];
  }
  row.updatedAt = new Date().toISOString();

  save(db);
  audit({ event: 'update', id, patch });
  return row;
}

/** Record an outbound message — from the bot, or typed by the team on the board. */
export function appendMessage(id, { text, from = 'team' }) {
  const db = load();
  const row = db.leads.find(l => l.id === id);
  if (!row) return null;

  row.messages.push({ at: new Date().toISOString(), from, text: String(text).slice(0, 500) });
  row.messages = row.messages.slice(-30);
  row.updatedAt = new Date().toISOString();

  save(db);
  audit({ event: 'message', id, from, text });
  return row;
}

export function deleteLead(id) {
  const db = load();
  const before = db.leads.length;
  db.leads = db.leads.filter(l => l.id !== id);
  if (db.leads.length === before) return false;

  save(db);
  audit({ event: 'delete', id });
  return true;
}

export function stats() {
  const leads = listLeads();
  const byStage = Object.fromEntries(STAGES.map(s => [s, 0]));
  for (const l of leads) if (l.stage in byStage) byStage[l.stage] += 1;

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    total: leads.length,
    byStage,
    thisWeek: leads.filter(l => new Date(l.createdAt).getTime() >= since).length,
    needsAttention: leads.filter(l => l.stage === 'new').length,
  };
}
