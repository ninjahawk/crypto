/**
 * Live price feed.
 *
 * The browser opens a public market-data WebSocket directly. Public streams on
 * the major exchanges need no key, no account and no signature — and critically,
 * the connection belongs to the *user's* browser, not to us. Ten thousand
 * players means ten thousand connections the exchange absorbs and we never see.
 * Cost stays exactly $0 and there is no rate limit for us to hit, which is why
 * this beats anything we could poll server-side.
 *
 * That refines DECISIONS 0007. The rule existed so per-user price fetching
 * could not turn into a per-user bill; a client-held public socket has no such
 * failure mode. What has *not* changed is settlement: prizes are still decided
 * against our archived snapshots, never against whatever a client claims it saw
 * (DECISIONS 0006). This feed drives the screen, not the payout.
 */

const ENDPOINT = 'wss://stream.binance.com:9443/stream';

// Backoff so a downed exchange doesn't turn into a reconnect storm.
const RETRY_MS = [1000, 2000, 5000, 10000, 30000];

export function createPriceFeed(tokens, onUpdate) {
  // tokens: { [coingeckoId]: { ws: 'btcusdt', price: number } }
  const bySymbol = new Map();
  for (const [id, token] of Object.entries(tokens)) {
    if (token?.ws) bySymbol.set(token.ws.toLowerCase(), id);
  }

  const state = {
    socket: null,
    attempt: 0,
    closed: false,
    live: false,
    lastMessageAt: 0,
  };

  if (bySymbol.size === 0) return { stop() {}, isLive: () => false };

  function connect() {
    if (state.closed) return;

    const streams = [...bySymbol.keys()].map((s) => `${s}@miniTicker`).join('/');
    let socket;
    try {
      socket = new WebSocket(`${ENDPOINT}?streams=${streams}`);
    } catch {
      return scheduleRetry();
    }
    state.socket = socket;

    socket.addEventListener('open', () => {
      state.attempt = 0;
      state.live = true;
    });

    socket.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      const tick = payload?.data;
      if (!tick?.s) return;

      const id = bySymbol.get(String(tick.s).toLowerCase());
      const price = Number(tick.c);
      if (!id || !Number.isFinite(price) || price <= 0) return;

      state.lastMessageAt = Date.now();
      onUpdate(id, price);
    });

    socket.addEventListener('close', () => {
      state.live = false;
      scheduleRetry();
    });

    socket.addEventListener('error', () => {
      state.live = false;
      try { socket.close(); } catch { /* already gone */ }
    });
  }

  function scheduleRetry() {
    if (state.closed) return;
    const wait = RETRY_MS[Math.min(state.attempt, RETRY_MS.length - 1)];
    state.attempt += 1;
    setTimeout(connect, wait);
  }

  connect();

  return {
    stop() {
      state.closed = true;
      try { state.socket?.close(); } catch { /* already gone */ }
    },
    // Stale means the socket is technically open but nothing is arriving.
    isLive: () => state.live && Date.now() - state.lastMessageAt < 30000,
  };
}
