import { loadAll, closePrices as computeClosePrices, openMeta } from './data.js';
import { scoreContest, cutLine, rankEntries } from './scoring.js';
import { buildGhosts } from './ghosts.js';
import { getState, ensurePlayer, entryFor, setInterests, setEmail, dismissIntro, recordResult, ensureBook } from './state.js';
import { intervalReturn, equity } from './bankroll.js';
import { submitEmail, isValidEmail, storedEmail } from './email.js';
import { el, $, clear, toast, fmtCountdown } from './ui.js';
import { drawCard, shareCard } from './share.js';
import { createPriceFeed } from './prices.js';

import { renderSlate } from './views/slate.js';
import { renderTrade } from './views/trade.js';
import { renderContest } from './views/contest.js';
import { renderBoard } from './views/board.js';
import { renderSeason } from './views/season.js';
import { renderRules } from './views/rules.js';

const TABS = [
  { id: 'contest', label: 'Contest' },
  { id: 'trade', label: 'Trade' },
  { id: 'slate', label: 'Slate' },
  { id: 'board', label: 'Board' },
  { id: 'season', label: 'Season' },
  { id: 'rules', label: 'Rules' },
];

const RENDERERS = {
  slate: renderSlate,
  trade: renderTrade,
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
  app.view = entryFor(app.data.slate.contestId) ? 'trade' : 'slate';
  render();

  // The countdown ticks every second, but a full re-render at 1Hz would drop
  // taps mid-selection. Patch only the countdown text; refetch prices slowly.
  app.ticker = setInterval(tickCountdowns, 1000);
  // Floor under the live feed: even if every price source is blocked for this
  // user, our own published snapshot still refreshes the screen. Degrades to
  // "updates every couple of minutes" instead of "frozen forever".
  app.poller = setInterval(refreshData, 120000);
  startLiveFeed();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshData();
  });
}

/**
 * Live prices from public DEX aggregators, with failover between sources.
 *
 * Repaints are throttled: ticks can arrive faster than a render, and rendering
 * per tick would fight the user for the main thread mid-trade.
 */
function startLiveFeed() {
  let dirty = false;

  app.feed = createPriceFeed(app.data.snapshot.tokens, (id, price, ch24) => {
    const token = app.data.snapshot.tokens[id];
    if (!token) return;
    token.price = price;
    if (Number.isFinite(ch24)) token.ch24 = ch24;
    dirty = true;
  });

  app.repaint = setInterval(() => {
    if (!dirty) return;
    dirty = false;
    // Never repaint under an open ticket — it would move the price the user is
    // reading mid-decision.
    if ($('.sheet')) return;
    render();
    markLive();
  }, 500);
}

function markLive() {
  const dot = $('#livedot');
  if (dot) dot.classList.toggle('is-live', Boolean(app.feed?.isLive()));
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

  // Ghosts hold fixed baskets, so their interval return is the basket's
  // percent change. The player's is their account's percent change over the
  // same window. Both are percent return — directly comparable (DECISIONS 0018).
  let ranked = [];
  try {
    ranked = scoreContest(ghosts, slate.openPrices, closes, {});
  } catch (err) {
    console.error('ghost scoring failed', err);
  }

  // The account exists whether or not anyone has picked, because trading is
  // available immediately.
  const book = ensureBook(slate.contestId, closes);
  const hasTraded = book.log.length > 0;

  if (hasTraded) {
    ranked = rankEntries([
      ...ranked,
      {
        entryId: 'me',
        name: 'You',
        picks: Object.keys(book.positions),
        lockedAt: entry?.lockedAt ?? slate.opensAt,
        isGhost: false,
        score: intervalReturn(book, slate.contestId, closes),
      },
    ]);
  }

  const cut = hasTraded ? cutLine(ranked, 'me', slate.payingPositions) : null;

  return {
    slate,
    snapshot,
    history,
    entry,
    ranked,
    cut,
    closePrices: closes,
    book,
    equity: equity(book, closes),
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
  markLive();
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
  const contestId = app.data.slate.contestId;
  const entry = entryFor(contestId);

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

  // The ask is concrete — an address for a result, not "updates". It lands
  // here because this is the moment the player has something they want the
  // outcome of, which is the only time this exchange is honest.
  const input = el('input', {
    class: 'field',
    type: 'email',
    inputmode: 'email',
    autocomplete: 'email',
    placeholder: 'you@email.com',
    value: storedEmail() ?? '',
  });

  const submit = el('button', {
    class: 'btn is-lime',
    text: 'Send me my result',
    onClick: async (e) => {
      const btn = e.currentTarget;
      const address = input.value.trim();
      if (!isValidEmail(address)) {
        input.classList.add('is-bad');
        return toast('That address does not look right');
      }
      btn.disabled = true;
      const res = await submitEmail(address, app.data.config, {
        contestId,
        picks: entry?.picks ?? null,
      });
      btn.disabled = false;
      setInterests([...chosen]);
      setEmail(address);
      closeSheet();
      toast(res.message);
    },
  });

  openSheet([
    el('div', { class: 'eyebrow', text: "You're in" }),
    el('h2', { style: 'margin:6px 0 4px;font-size:26px;letter-spacing:-0.03em', text: '$10,000 deployed.' }),
    el('p', { class: 'prose', style: 'margin:0 0 16px' }, [
      'Contest settles at ',
      el('b', { text: '00:00 UTC' }),
      '. Drop your email and we\'ll send you where you finished.',
    ]),
    input,
    el('div', { style: 'margin-top:12px' }, [submit]),
    el('div', { class: 'eyebrow', style: 'margin:22px 0 10px', text: 'What are you here for?' }),
    ...options,
    el('div', { style: 'text-align:center;margin-top:14px' }, [
      el('button', {
        class: 'linkbtn',
        text: 'Skip for now',
        onClick: () => { setInterests([...chosen]); dismissIntro(); closeSheet(); },
      }),
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
