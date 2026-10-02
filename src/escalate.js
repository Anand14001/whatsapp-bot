import { sendText } from './whatsapp.js';
import { upsertLead } from './leads.js';

const SALES_NUMBERS = (process.env.SALES_TEAM_NUMBERS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);

export async function escalate({ from, remoteJid, profileName, tag, lastMessages = [], lead = {} }) {
  const row = upsertLead({ number: from, remoteJid, profileName, tag, lastMessages, lead });

  const note =
    `🔔 *WhatsApp lead* — ${tag}\n\n` +
    `*Name:* ${row.name || 'not given'}\n` +
    `*Number:* +${from}\n` +
    `*Business:* ${row.business || 'not given'}\n` +
    `*Asked:* ${lastMessages.join(' | ').slice(0, 400)}\n` +
    `*Stage:* ${row.stage}\n` +
    `*Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  // No 24-hour window and no templates on Evolution: this lands whenever the team
  // number has WhatsApp. Don't put the bot's OWN number in SALES_TEAM_NUMBERS —
  // a number can't message itself, and the attempt errors every single time.
  for (const n of SALES_NUMBERS) {
    try {
      await sendText(n, note);
    } catch (err) {
      console.error('[escalate] notify failed for', n, err.message);
    }
  }
  console.log('[escalate]', tag, from, '→', row.id);
  return row;
}
