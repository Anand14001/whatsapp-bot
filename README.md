# Digital Dude — WhatsApp Sales Assistant

A WhatsApp sales bot on **Evolution API** (self-hosted) + **Gemini**, with a **Kanban lead board**
served from the same process.

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — the full build-and-deploy walkthrough. Read Step 0 and Step 13.
- [SALES_ASSISTANT_QA.md](SALES_ASSISTANT_QA.md) — the single source of truth for what the bot may
  say. Facts get confirmed here *first*, then mirrored into `src/knowledgeBase.js`.

> ⚠️ Evolution API drives WhatsApp through the WhatsApp **Web** protocol, not Meta's official Cloud
> API. It is against WhatsApp's Terms of Service and **numbers running automation this way do get
> banned**. Use a dedicated spare SIM, never the business's main number. SETUP_GUIDE Step 13 covers
> warm-up, pacing and the fallback plan; Appendix D covers switching to the official API.

---

## Quick start

```bash
# 1. Evolution API + Postgres + Redis
cp .env.example .env            # fill in EVOLUTION_API_KEY, GEMINI_API_KEY, the two secrets
docker compose up -d evolution-api postgres redis

# 2. Create the WhatsApp instance, then scan the QR at http://localhost:8081/manager
curl -s -X POST http://localhost:8081/instance/create \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"digital-dude","integration":"WHATSAPP-BAILEYS","qrcode":true}'

# 3. The bot
npm install
npm test                        # the output guard — must print ALL PASS
npm run dev

# 4. Point Evolution at the bot (ngrok locally, service name in production)
ngrok http 8080
curl -s -X POST http://localhost:8081/webhook/set/digital-dude \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"https://xxxx.ngrok-free.app/webhook/YOUR_WEBHOOK_SECRET","byEvents":false,"events":["MESSAGES_UPSERT","CONNECTION_UPDATE"]}}'
```

Then open the board: `http://localhost:8080/?token=<DASHBOARD_TOKEN>`

---

## How a message flows

```
customer → Evolution → POST /webhook/:secret → filter (fromMe? group? status?)
  → payment-intent pre-guard → knowledge retrieval → Gemini → OUTPUT GUARD
  → escalate if needed → lead store → Evolution sendText → customer
```

The **output guard** (`src/guard.js`) is the part that actually enforces "never share payment
details". The prompt asks the model not to; the guard makes sure it can't. `npm test` asserts 52
cases in both directions and must pass before any deploy.

## Files

| File | Role |
|---|---|
| `src/server.js` | Webhook intake, dashboard mount, connection monitor |
| `src/bot.js` | Conversation flow, sessions, lead-field capture, escalation triggers |
| `src/guard.js` | Regex output guard + incoming payment-intent detection |
| `src/prompt.js` | The WhatsApp system prompt and the exact fallback line |
| `src/knowledgeBase.js` | Knowledge chunks + keyword retrieval (converted from `dd-website`) |
| `src/whatsapp.js` | The only file that knows Evolution's API. Also the outbound rate limit |
| `src/leads.js` | Lead store — `data/leads.json` state + `data/leads.jsonl` audit log |
| `src/escalate.js` | Records the lead, notifies the sales numbers |
| `src/api.js` | Dashboard REST API (token-guarded) |
| `public/` | The Kanban board — vanilla JS, no build step |
| `test-guard.js` | The guard test suite (`npm test`) |

## The lead board

- Six stages: `new → contacted → qualified → proposal → won / lost` (`STAGES` in `src/leads.js`)
- Drag cards between columns; edits save on blur
- Each card shows the bot's flags — `payment_query`, `guard_invented_price`, `fallback`,
  `human_requested`, `qualified_lead` — so the gaps in the knowledge base surface as you work
- Open a card for the transcript, and reply on WhatsApp as the business without leaving the page
- A connection pill up top shows whether the WhatsApp session is still linked

Auth is a single shared `DASHBOARD_TOKEN`. That's fine on `localhost` and thin on a public domain —
put it behind HTTPS, and swap in per-user auth before more than a couple of people use it.

## Operating it

- `data/leads.json` is the only copy of the pipeline — back it up, along with the
  `evolution_instances` Docker volume (the WhatsApp session itself)
- Watch the logs for `[evolution] NOT CONNECTED` — a dropped session goes silent, not loud
- Repeated `fallback` tags on a topic mean a missing fact: confirm it with the team, add it to
  `SALES_ASSISTANT_QA.md`, then to `src/knowledgeBase.js`
- A spike in `guard_invented_price` means the prompt needs tightening, not the guard loosening
