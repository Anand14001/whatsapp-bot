/* Digital Dude lead board — vanilla JS, no build step. */

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

/** Bot tags that should stand out on a card. */
const TAG_TONE = {
  payment_query: 'alert',
  guard_invented_price: 'alert',
  guard_guarantee: 'warn',
  guard_identity_leak: 'warn',
  llm_error: 'alert',
  human_requested: 'warn',
  fallback: 'warn',
  qualified_lead: 'good',
};

const state = {
  token: null,
  stages: Object.keys(STAGE_LABELS),
  leads: [],
  stats: null,
  openId: null,
  query: '',
  dirty: false,        // true while the drawer has unsaved edits — pauses polling
};

const $ = id => document.getElementById(id);

/* ---------- API ---------- */

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-dashboard-token': state.token,
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    forgetToken();
    throw new Error('Token rejected');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

/* ---------- token gate ---------- */

function rememberToken(token) {
  state.token = token;
  try { localStorage.setItem('dd_token', token); } catch { /* private window */ }
}

function forgetToken() {
  state.token = null;
  try { localStorage.removeItem('dd_token'); } catch { /* ignore */ }
  $('app').hidden = true;
  $('gate').hidden = false;
  $('gate-err').textContent = 'That token was rejected.';
}

async function tryToken(token) {
  state.token = token;
  await apiFetch('/leads');          // throws if unauthorized
  rememberToken(token);
  $('gate').hidden = true;
  $('app').hidden = false;
  return true;
}

/* ---------- rendering ---------- */

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function matchesQuery(lead) {
  if (!state.query) return true;
  const q = state.query.toLowerCase();
  return [lead.name, lead.profileName, lead.number, lead.business, lead.service, lead.notes]
    .some(v => (v ?? '').toLowerCase().includes(q));
}

function renderStats() {
  const s = state.stats;
  if (!s) return;
  const tiles = [
    ['Total', s.total],
    ['New', s.byStage.new],
    ['Qualified', s.byStage.qualified],
    ['Proposal', s.byStage.proposal],
    ['Won', s.byStage.won],
    ['This week', s.thisWeek],
  ];
  $('stats').innerHTML = tiles
    .map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`)
    .join('');
}

function cardHtml(lead) {
  const tags = (lead.tags ?? []).slice(-3)
    .map(t => `<span class="chip ${TAG_TONE[t] ?? ''}">${escapeHtml(t.replace(/_/g, ' '))}</span>`)
    .join('');
  const service = lead.service
    ? `<span class="chip">${escapeHtml(lead.service)}</span>` : '';
  const title = escapeHtml(lead.name || lead.profileName || 'Unknown');

  return `
    <article class="card" draggable="true" data-id="${lead.id}" tabindex="0">
      <h3>${title}</h3>
      <div class="num">+${escapeHtml(lead.number)}</div>
      ${lead.business ? `<div class="biz">${escapeHtml(lead.business)}</div>` : ''}
      <div class="meta">${service}${tags}</div>
      <footer>
        <span>${lead.messages?.length ?? 0} msg</span>
        <span>${timeAgo(lead.updatedAt)}</span>
      </footer>
    </article>`;
}

function renderBoard() {
  const visible = state.leads.filter(matchesQuery);
  $('board').innerHTML = state.stages.map(stage => {
    const inStage = visible.filter(l => l.stage === stage);
    return `
      <section class="column" style="--stage-color: var(--stage-${stage})">
        <h2>${STAGE_LABELS[stage] ?? stage}<span class="count">${inStage.length}</span></h2>
        <div class="cards" data-stage="${stage}" style="--stage-color: var(--stage-${stage})">
          ${inStage.map(cardHtml).join('')}
        </div>
      </section>`;
  }).join('');

  wireDragAndDrop();
}

function renderConnection(stateText) {
  const pill = $('conn');
  $('conn-text').textContent = stateText;
  pill.classList.toggle('open', stateText === 'open');
  pill.classList.toggle('bad', stateText !== 'open');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(message, ms = 2600) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

/* ---------- drag and drop ---------- */

function wireDragAndDrop() {
  for (const card of document.querySelectorAll('.card')) {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => openDrawer(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(card.dataset.id); }
    });
  }

  for (const zone of document.querySelectorAll('.cards')) {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', async e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const id = e.dataTransfer.getData('text/plain');
      const stage = zone.dataset.stage;
      const lead = state.leads.find(l => l.id === id);
      if (!lead || lead.stage === stage) return;

      // Move it locally first so the board feels instant, then persist.
      const previous = lead.stage;
      lead.stage = stage;
      renderBoard();
      try {
        await apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
        toast(`Moved to ${STAGE_LABELS[stage]}`);
        await load();
      } catch (err) {
        lead.stage = previous;
        renderBoard();
        toast(`Could not move: ${err.message}`);
      }
    });
  }
}

/* ---------- drawer ---------- */

const FIELDS = ['name', 'business', 'service', 'timeline', 'value', 'owner', 'notes'];

function openDrawer(id) {
  const lead = state.leads.find(l => l.id === id);
  if (!lead) return;
  state.openId = id;
  state.dirty = false;

  $('d-title').textContent = lead.name || lead.profileName || 'Unknown';
  $('d-sub').innerHTML =
    `+${escapeHtml(lead.number)} · created ${timeAgo(lead.createdAt)} · updated ${timeAgo(lead.updatedAt)}`;

  $('d-stage').innerHTML = state.stages
    .map(s => `<option value="${s}">${STAGE_LABELS[s] ?? s}</option>`).join('');
  $('d-stage').value = lead.stage;

  for (const f of FIELDS) $(`d-${f}`).value = lead[f] ?? '';

  $('d-transcript').innerHTML = (lead.messages ?? []).map(m => `
    <div class="msg ${m.from ?? 'customer'}">
      ${escapeHtml(m.text)}
      <time>${new Date(m.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</time>
    </div>`).join('') || '<span class="hint">No messages recorded yet.</span>';
  $('d-transcript').scrollTop = $('d-transcript').scrollHeight;

  $('d-tags').innerHTML = (lead.tags ?? []).length
    ? lead.tags.map(t => `<span class="chip ${TAG_TONE[t] ?? ''}">${escapeHtml(t.replace(/_/g, ' '))}</span>`).join('')
    : '<span class="hint">None</span>';

  $('drawer').hidden = false;
  $('backdrop').hidden = false;
}

function closeDrawer() {
  $('drawer').hidden = true;
  $('backdrop').hidden = true;
  state.openId = null;
  state.dirty = false;
}

/** Save on change rather than behind a Save button — fewer lost edits. */
async function saveField(field, value) {
  if (!state.openId) return;
  try {
    await apiFetch(`/leads/${state.openId}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
    });
    state.dirty = false;
    await load();
    toast('Saved');
  } catch (err) {
    toast(`Save failed: ${err.message}`);
  }
}

async function sendReply() {
  const text = $('d-reply').value.trim();
  if (!text || !state.openId) return;

  $('d-send').disabled = true;
  try {
    await apiFetch(`/leads/${state.openId}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
    $('d-reply').value = '';
    await load();
    openDrawer(state.openId);
    toast('Sent on WhatsApp');
  } catch (err) {
    toast(`Not sent: ${err.message}`);
  } finally {
    $('d-send').disabled = false;
  }
}

/* ---------- load + poll ---------- */

async function load() {
  const data = await apiFetch('/leads');
  state.stages = data.stages ?? state.stages;
  state.leads = data.leads ?? [];
  state.stats = data.stats ?? null;
  renderStats();
  renderBoard();
}

async function pollConnection() {
  try {
    const { state: s } = await apiFetch('/connection');
    renderConnection(s);
  } catch {
    renderConnection('unreachable');
  }
}

/* ---------- wiring ---------- */

function wireUi() {
  $('gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('gate-err').textContent = '';
    try {
      await tryToken($('gate-token').value.trim());
      await start();
    } catch {
      $('gate-err').textContent = 'That token was rejected.';
    }
  });

  $('search').addEventListener('input', e => {
    state.query = e.target.value;
    renderBoard();
  });

  $('refresh').addEventListener('click', () => { load(); pollConnection(); });
  $('logout').addEventListener('click', forgetToken);

  $('theme').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('dd_theme', next); } catch { /* ignore */ }
  });

  $('d-close').addEventListener('click', closeDrawer);
  $('backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer();
  });

  $('d-stage').addEventListener('change', e => saveField('stage', e.target.value));
  for (const f of FIELDS) {
    const el = $(`d-${f}`);
    el.addEventListener('input', () => { state.dirty = true; });
    el.addEventListener('change', () => saveField(f, el.value));
  }

  $('d-send').addEventListener('click', sendReply);
  $('d-reply').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
  });

  $('d-delete').addEventListener('click', async () => {
    if (!state.openId) return;
    const lead = state.leads.find(l => l.id === state.openId);
    if (!confirm(`Delete ${lead?.name || lead?.number}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/leads/${state.openId}`, { method: 'DELETE' });
      closeDrawer();
      await load();
      toast('Lead deleted');
    } catch (err) {
      toast(`Delete failed: ${err.message}`);
    }
  });
}

async function start() {
  await load();
  await pollConnection();

  // Poll, but never clobber a half-typed edit.
  setInterval(() => { if (!state.dirty && !document.hidden) load().catch(() => {}); }, 10_000);
  setInterval(() => { if (!document.hidden) pollConnection(); }, 60_000);
}

(async function init() {
  try {
    const saved = localStorage.getItem('dd_theme');
    if (saved) document.documentElement.dataset.theme = saved;
  } catch { /* ignore */ }

  wireUi();

  // Token from ?token=… (then scrubbed from the URL bar), else from localStorage.
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('token');
  let stored = null;
  try { stored = localStorage.getItem('dd_token'); } catch { /* ignore */ }

  const candidate = fromUrl || stored;
  if (fromUrl) {
    url.searchParams.delete('token');
    history.replaceState({}, '', url);
  }

  if (candidate) {
    try {
      await tryToken(candidate);
      await start();
      return;
    } catch { /* fall through to the gate */ }
  }
  $('gate').hidden = false;
})();
