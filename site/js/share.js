/**
 * Share card generation.
 *
 * The satisfaction peak right after a result is the highest-probability moment
 * anyone will share, and most products miss it by burying sharing in a settings
 * menu. So the card is generated on the result screen, immediately.
 *
 * Critically, winning is not the only shareable moment — that would cover about
 * a tenth of players. Beating a bot, a best pick, and a streak milestone all
 * produce a card, so most sessions end with something worth posting.
 *
 * Drawn on canvas with no external images: token art would taint the canvas
 * cross-origin and break export on exactly the devices we care about.
 */

const W = 1200;
const H = 675;

const INK = '#ffffff';
const DIM = '#8a8a93';
const BG = '#000000';
const ACCENT = '#7c5cff';
const LIME = '#c8ff4d';
const POS = '#2fd671';
const NEG = '#ff4d4d';

const FONT = '-apple-system, BlinkMacSystemFont, Inter, "Segoe UI", Roboto, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Pick the single most postable fact from a result.
 * Order matters: the rarest, most flex-worthy line wins.
 */
export function headlineFor({ rank, score, ghostsBeaten, ghostTotal, beatBtc, bestPick, streak }) {
  if (rank === 1) return { kicker: 'FINISHED', line: '1st place', tone: LIME };
  if (beatBtc && score > 0) return { kicker: 'TODAY', line: 'Beat Buy & Hold BTC', tone: LIME };
  if (ghostsBeaten === ghostTotal && ghostTotal > 0) return { kicker: 'TODAY', line: 'Beat every algorithm', tone: LIME };
  if (bestPick && bestPick.change > 0) {
    return { kicker: 'BEST PICK', line: `${bestPick.sym} ${bestPick.change > 0 ? '+' : ''}${bestPick.change.toFixed(1)}%`, tone: POS };
  }
  if (streak >= 3) return { kicker: 'STREAK', line: `${streak} days running`, tone: '#ffc53d' };
  if (ghostsBeaten > 0) return { kicker: 'TODAY', line: `Beat ${ghostsBeaten} of ${ghostTotal} algorithms`, tone: INK };
  return { kicker: 'TODAY', line: 'Ran the slate', tone: INK };
}

export function drawCard(canvas, result) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const glowA = ctx.createRadialGradient(150, 40, 0, 150, 40, 720);
  glowA.addColorStop(0, 'rgba(124,92,255,0.30)');
  glowA.addColorStop(1, 'rgba(124,92,255,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, W, H);

  const glowB = ctx.createRadialGradient(W - 90, H + 40, 0, W - 90, H + 40, 620);
  glowB.addColorStop(0, 'rgba(200,255,77,0.16)');
  glowB.addColorStop(1, 'rgba(200,255,77,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, W - 36, H - 36, 30);
  ctx.stroke();

  const PAD = 72;

  // brand
  ctx.fillStyle = ACCENT;
  roundRect(ctx, PAD, PAD - 6, 42, 42, 13);
  ctx.fill();
  ctx.fillStyle = LIME;
  roundRect(ctx, PAD + 8, PAD + 13, 26, 4, 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `800 30px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CUTLINE', PAD + 56, PAD + 27);

  ctx.fillStyle = DIM;
  ctx.font = `600 22px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(result.contestId ?? '', W - PAD, PAD + 27);
  ctx.textAlign = 'left';

  // headline
  const head = headlineFor(result);

  ctx.fillStyle = DIM;
  ctx.font = `800 20px ${FONT}`;
  ctx.letterSpacing = '3px';
  ctx.fillText(head.kicker, PAD, 232);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = head.tone;
  ctx.font = `850 92px ${FONT}`;
  ctx.fillText(head.line, PAD, 322);

  // score
  const tone = result.score > 0 ? POS : result.score < 0 ? NEG : DIM;
  ctx.fillStyle = DIM;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('Score', PAD, 402);

  ctx.fillStyle = tone;
  ctx.font = `850 66px ${FONT}`;
  const scoreText = `${result.score > 0 ? '+' : ''}${result.score.toFixed(2)}`;
  ctx.fillText(scoreText, PAD, 468);

  const scoreW = ctx.measureText(scoreText).width;

  ctx.fillStyle = DIM;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('pts', PAD + scoreW + 14, 468);

  // picks
  if (Array.isArray(result.picks) && result.picks.length) {
    let x = PAD;
    const y = 520;
    ctx.font = `800 24px ${FONT}`;
    for (const sym of result.picks.slice(0, 6)) {
      const label = String(sym).toUpperCase();
      const w = ctx.measureText(label).width + 34;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      roundRect(ctx, x, y, w, 50, 25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, 50, 25);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(label, x + 17, y + 34);
      x += w + 10;
      if (x > W - PAD - 140) break;
    }
  }

  // footer
  ctx.fillStyle = DIM;
  ctx.font = `600 23px ${FONT}`;
  ctx.fillText('Free daily crypto pick’em', PAD, H - PAD + 6);

  ctx.fillStyle = LIME;
  ctx.font = `800 23px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(result.url ?? 'cutline.app', W - PAD, H - PAD + 6);
  ctx.textAlign = 'left';

  return canvas;
}

export function cardToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Native share sheet where available, download plus clipboard text otherwise.
 * Returns a short status string for the caller to surface.
 */
export async function shareCard(canvas, result) {
  const blob = await cardToBlob(canvas);
  if (!blob) return 'Could not build the card';

  const file = new File([blob], `cutline-${result.contestId ?? 'result'}.png`, { type: 'image/png' });
  const head = headlineFor(result);
  const text = `${head.line} — ${result.score > 0 ? '+' : ''}${result.score.toFixed(2)} pts on today's slate.`;

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'Shared';
    } catch (err) {
      if (err?.name === 'AbortError') return '';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  try {
    await navigator.clipboard.writeText(text);
    return 'Card saved, caption copied';
  } catch {
    return 'Card saved';
  }
}
