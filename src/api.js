import express from 'express';
import {
  listLeads, getLead, updateLead, deleteLead, appendMessage, stats, STAGES,
} from './leads.js';
import { sendText, connectionState } from './whatsapp.js';

export const api = express.Router();

/**
 * One shared token for the team. Anyone holding it can read every lead and send
 * WhatsApp messages as the business — so serve this over HTTPS only, and swap it
 * for per-user auth once more than a couple of people use the board.
 */
api.use((req, res, next) => {
  const token = req.get('x-dashboard-token') ?? req.query.token;
  if (!process.env.DASHBOARD_TOKEN) {
    return res.status(503).json({ error: 'DASHBOARD_TOKEN is not set on the server' });
  }
  if (token !== process.env.DASHBOARD_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

api.get('/leads', (_req, res) => {
  res.json({ stages: STAGES, leads: listLeads(), stats: stats() });
});

api.get('/leads/:id', (req, res) => {
  const row = getLead(req.params.id);
  return row ? res.json(row) : res.status(404).json({ error: 'not found' });
});

api.patch('/leads/:id', (req, res) => {
  const row = updateLead(req.params.id, req.body ?? {});
  if (!row) {
    return res.status(400).json({ error: 'unknown lead, or invalid stage', stages: STAGES });
  }
  res.json(row);
});

api.delete('/leads/:id', (req, res) => {
  return deleteLead(req.params.id)
    ? res.json({ ok: true })
    : res.status(404).json({ error: 'not found' });
});

/** Reply to a lead from the board — the human taking over from the bot. */
api.post('/leads/:id/reply', async (req, res) => {
  const row = getLead(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });

  const text = String(req.body?.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'empty message' });
  if (text.length > 4000) return res.status(400).json({ error: 'message too long for WhatsApp' });

  try {
    await sendText(row.remoteJid || row.number, text, { delay: 400 });
    appendMessage(row.id, { text, from: 'team' });
    res.json({ ok: true, lead: getLead(row.id) });
  } catch (err) {
    console.error('[api] reply failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

api.get('/connection', async (_req, res) => {
  res.json({ state: await connectionState(), instance: process.env.EVOLUTION_INSTANCE ?? '' });
});
