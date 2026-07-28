import { loadAll, closePrices as computeClosePrices, openMeta } from './data.js';
import { scoreContest, cutLine } from './scoring.js';
import { buildGhosts } from './ghosts.js';
import { getState, ensurePlayer, entryFor, setInterests, dismissIntro, recordResult } from './state.js';
import { el, $, clear, toast, fmtCountdown } from './ui.js';
import { drawCard, shareCard } from './share.js';

import { renderSlate } from './views/slate.js';
import { renderContest } from './views/contest.js';
import { renderBoard } from './views/board.js';
import { renderSeason } from './views/season.js';
import { renderRules } from './views/rules.js';

const TABS = [
  { id: 'contest', label: 'Contest' },
  { id: 'slate', label: 'Slate' },
  { id: 'board', label: 'Board' },
  { id: 'season', label: 'Season' },
  { id: 'rules', label: 'Rules' },
];

const RENDERERS = {
  slate: renderSlate,
  contest: renderContest,
  board: renderBoard,
  season: renderSeason,
  rules: renderRules,
};

const app = {
  data: null,
  view: 'slate',
  draft: [],
  ticker: null,
};

async function boot() {
  ensurePlayer();
  const mount = $('#view');

  try {
    app.data = await loadAll();
  } catch (err) {
    clear(mount).append(
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty-title', text: 'Could not load today’s slate' }),
        el('div', { text: 'The daily snapshot may still be publishing. Try again in a minute.' }),
        el('div', { style: 'margin-top:18px' }, [
          el('button', { class: 'btn is-quiet', text: 'Retry', onClick: () => location.reload() }),
        ]),
      ]),
    );
    console.error(err);
    return;
  }

  buildNav();
  // Land on the slate when there is no entry yet — the first meaningful action
  // should be one tap away, not behind a dashboard.
  app.view = entryFor(app.data.slate.contestId) ? 'contest' : 'slate';
  render();

  // The countdown ticks every second, but a full re-render at 1Hz would drop
  // taps mid-selection. Patch only the countdown text; refetch prices slowly.
  app.ticker = setInterval(tickCountdowns, 1000);
  app.poller = setInterval(refreshData, 60000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshData();
  });
}

function tickCountdowns() {
  for (const node of document.querySelectorAll('[data-countdown]')) {
    const remaining = Date.parse(node.dataset.countdown) - Date.now();
    if (remaining <= 0) {
      node.textContent = 'Closed';
      node.classList.remove('is-urgent');
    } else {
      node.textContent = `⏱ ${fmtCountdown(remaining)}`;
      node.classList.toggle('is-urgent', remaining < 60 * 60 * 1000);
    }
  }
}

async function refreshData() {
  try {
    app.data = await loadAll();
    render();
  } catch {
    /* keep showing the last good snapshot rather than blanking the screen */
  }
}

function buildNav() {
  const nav = clear($('#navchips'));
  for (const tab of TABS) {
    nav.append(
      el('button', {
        class: 'chip',
        type: 'button',
        role: 'tab',
        'aria-selected': String(app.view === tab.id),
        text: tab.label,
        onClick: () => go(tab.id),
      }),
    );
  }
}

function syncNav() {
  [...$('#navchips').children].forEach((chip, i) => {
    chip.setAttribute('aria-selected', String(TABS[i].id === app.view));
  });
}

function go(target) {
  if (target === '#share') return openShare();
  app.view = target;
  syncNav();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Everything a view needs, derived fresh on each render. */
function buildContext() {
  const { slate, snapshot, history } = app.data;
  const entry = entryFor(slate.contestId);
  const closes = computeClosePrices(slate, snapshot);
  const meta = openMeta(slate);

  const ghosts = buildGhosts(slate.tokens, meta, slate.picksRequired, {
    prevWinnerPicks: history.contests?.[0]?.winner?.picks ?? null,
    opensAt: slate.opensAt,
  });

  const entries = [...ghosts];
  if (entry) {
    entries.push({
      entryId: 'me',
      name: 'You',
      picks: entry.picks,
      lockedAt: entry.lockedAt,
      isGhost: false,
    });
  }

  let ranked = [];
  try {
    ranked = scoreContest(entries, slate.openPrices, closes, { picksRequired: slate.picksRequired });
  } catch (err) {
    console.error('scoring failed', err);
  }

  const cut = entry ? cutLine(ranked, 'me', slate.payingPositions) : null;

  return {
    slate,
    snapshot,
    history,
    entry,
    ranked,
    cut,
    closePrices: closes,
    draft: app.draft,
    now: Date.now(),
  };
}

function render() {
  const ctx = buildContext();
  const mount = $('#view');
  const renderer = RENDERERS[app.view] ?? renderSlate;

  // The slate's dock label tracks the selection, so it rebuilds on each toggle.
  const handle = renderer(ctx, mount, go, (picks) => {
    app.draft = picks;
    paintDock(handle.dock());
  });

  paintDock(handle?.dock?.() ?? null);
  tickCountdowns();
  maybeShowIntro();
}

function paintDock(node) {
  const dock = clear($('#dock'));
  if (node) dock.append(node);
  $('.dock').style.display = node ? '' : 'none';
}

// ---------------------------------------------------------------- intro ----

/**
 * Interest picker, shown only after the first entry is locked.
 *
 * Deferred deliberately: every screen before activation costs users, and this
 * lands once they already have picks worth keeping (DECISIONS 0012/0015).
 */
const INTERESTS = [
  { id: 'memecoins', glyph: '🐸', label: 'Memecoins' },
  { id: 'majors', glyph: '₿', label: 'Majors only' },
  { id: 'daily', glyph: '⚡', label: 'Play every day' },
  { id: 'prizes', glyph: '💸', label: 'Here for the prizes' },
];

function maybeShowIntro() {
  const state = getState();
  if (state.seenIntro) return;
  if (!entryFor(app.data.slate.contestId)) return;
  if ($('.sheet')) return;
  showIntro();
}

function showIntro() {
  const chosen = new Set();

  const options = INTERESTS.map((item) =>
    el('button', {
      class: 'choice',
      type: 'button',
      'aria-pressed': 'false',
      onClick: (e) => {
        const btn = e.currentTarget;
        const on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
        if (on) chosen.delete(item.id);
        else chosen.add(item.id);
      },
    }, [
      el('span', { class: 'choice-glyph', text: item.glyph }),
      el('span', { text: item.label }),
    ]),
  );

  openSheet([
    el('div', { class: 'eyebrow', text: 'One quick thing' }),
    el('h2', { style: 'margin:6px 0 4px;font-size:24px;letter-spacing:-0.03em', text: "You're in." }),
    el('p', { class: 'prose', style: 'margin:0 0 18px', text: 'What brings you here? Pick any that fit — it shapes your slate.' }),
    ...options,
    el('div', { style: 'margin-top:18px' }, [
      el('button', {
        class: 'btn',
        text: 'Continue',
        onClick: () => {
          setInterests([...chosen]);
          closeSheet();
          toast('See you at 00:00 UTC for the next slate.');
        },
      }),
    ]),
    el('div', { style: 'text-align:center;margin-top:12px' }, [
      el('button', { class: 'linkbtn', text: 'Skip', onClick: () => { dismissIntro(); closeSheet(); } }),
    ]),
  ]);
}

// ---------------------------------------------------------------- share ----

function openShare() {
  const ctx = buildContext();
  if (!ctx.entry) return toast('Make your picks first');

  const me = ctx.ranked.find((r) => r.entryId === 'me');
  const ghosts = ctx.ranked.filter((r) => r.isGhost);
  const btc = ghosts.find((g) => g.entryId === 'hodl-btc');

  const holdings = ctx.entry.picks.map((id) => {
    const open = ctx.slate.openPrices[id];
    const close = ctx.closePrices[id];
    const change = open > 0 ? ((close - open) / open) * 100 : 0;
    return { sym: ctx.snapshot.tokens[id]?.sym?.toUpperCase() ?? id, change };
  });
  const bestPick = [...holdings].sort((a, b) => b.change - a.change)[0] ?? null;

  const result = {
    contestId: ctx.slate.contestId,
    score: me?.score ?? 0,
    rank: me?.rank ?? null,
    picks: holdings.map((h) => h.sym),
    ghostsBeaten: me ? ghosts.filter((g) => g.score < me.score).length : 0,
    ghostTotal: ghosts.length,
    beatBtc: Boolean(me && btc && me.score > btc.score),
    bestPick,
    streak: getState().streak.count,
    url: location.host || 'cutline.app',
  };

  // Record the settled result so the season view has a record to show.
  if (Date.parse(ctx.slate.closesAt) <= Date.now() && me) {
    recordResult(ctx.slate.contestId, { rank: me.rank, score: me.score, fieldNote: 'vs algorithms' });
  }

  const canvas = el('canvas', { class: 'share-preview' });
  drawCard(canvas, result);

  openSheet([
    el('div', { class: 'eyebrow', text: 'Share' }),
    el('h2', { style: 'margin:6px 0 16px;font-size:24px;letter-spacing:-0.03em', text: 'Post your card' }),
    canvas,
    el('button', {
      class: 'btn is-lime',
      text: 'Share card',
      onClick: async (e) => {
        e.currentTarget.disabled = true;
        const status = await shareCard(canvas, result);
        e.currentTarget.disabled = false;
        if (status) toast(status);
      },
    }),
    el('div', { style: 'text-align:center;margin-top:12px' }, [
      el('button', { class: 'linkbtn', text: 'Close', onClick: closeSheet }),
    ]),
  ]);
}

// ---------------------------------------------------------------- sheet ----

function openSheet(children) {
  closeSheet();
  const panel = el('div', { class: 'sheet-panel' }, [el('div', { class: 'sheet-grab' }), ...children]);
  const sheet = el('div', {
    class: 'sheet',
    role: 'dialog',
    'aria-modal': 'true',
    onClick: (e) => { if (e.target === sheet) closeSheet(); },
  }, [panel]);
  document.body.append(sheet);
  document.addEventListener('keydown', onEscape);
}

function closeSheet() {
  $('.sheet')?.remove();
  document.removeEventListener('keydown', onEscape);
}

function onEscape(e) {
  if (e.key === 'Escape') closeSheet();
}

boot();
