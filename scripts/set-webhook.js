/**
 * Point the Evolution GO instance at this bot.
 *   node scripts/set-webhook.js                 → uses PUBLIC_URL from .env
 *   node scripts/set-webhook.js https://x.ngrok-free.app
 */
import 'dotenv/config';
import { setWebhook, listInstances } from '../src/whatsapp.js';

const base = (process.argv[2] ?? process.env.PUBLIC_URL ?? '').replace(/\/+$/, '');
const secret = process.env.WEBHOOK_SECRET;

if (!base) {
  console.error('No URL. Pass one as an argument or set PUBLIC_URL in .env.');
  console.error('It must be reachable from the internet — Railway cannot call localhost.');
  process.exit(1);
}
if (!/^https?:\/\//.test(base)) {
  console.error(`"${base}" needs a scheme, e.g. https://...`);
  process.exit(1);
}
if (!secret) {
  console.error('WEBHOOK_SECRET is not set in .env.');
  process.exit(1);
}

const url = `${base}/webhook/${secret}`;
console.log('setting webhook →', url.replace(secret, '<WEBHOOK_SECRET>'));
await setWebhook(url);

const { data = [] } = await listInstances();
const me = data.find(i => i.name === process.env.EVOLUTION_INSTANCE) ?? data[0];
console.log('instance:', me?.name, '| connected:', me?.connected, '| events:', me?.events);
console.log('webhook now:', me?.webhook || '(empty — the server did not store it)');
