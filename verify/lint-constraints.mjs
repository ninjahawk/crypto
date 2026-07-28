#!/usr/bin/env node
/**
 * Architectural invariants.
 *
 * These are properties unit tests structurally cannot catch, and every one of
 * them will be violated by a perfectly reasonable-looking change some weeks
 * from now unless a machine is checking. Each rule cites the decision it
 * enforces so a future reader can see why it exists before deleting it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_JS = join(ROOT, 'site', 'js');

const RULES = [
  {
    id: 'no-field-size',
    decision: 'DECISIONS 0004',
    why: 'Total field size is never displayed. Show the cut line instead.',
    // Matches "of 312", "312 players", "312 entrants" in user-facing strings.
    pattern: /(\bof\s+\$?\{?\s*(field|total|entrant|player)|\b(field|entrant|player)(Size|Count|s?\.length)\s*\}?\s*(players|entrants|entries))/i,
    files: (p) => p.startsWith(join('site', 'js')),
  },
  {
    id: 'no-direct-price-api',
    decision: 'DECISIONS 0007',
    why: 'Clients read our published snapshot only. Price APIs are the scheduled job\'s business.',
    pattern: /(api\.coingecko\.com|api\.dexscreener\.com|api\.coinmarketcap\.com|price\.jup\.ag)/i,
    files: (p) => p.startsWith(join('site', 'js')),
  },
  {
    id: 'no-pick-mutation',
    decision: 'DECISIONS 0006',
    why: 'Pick records are append-only. A locked entry is a claim we may have to verify.',
    pattern: /\.(entries|picks)\s*\[[^\]]+\]\s*\.\s*picks\s*=|delete\s+\w+\.entries\[/,
    files: (p) => p.startsWith(join('site', 'js')),
  },
  {
    id: 'no-forbidden-words',
    decision: 'spec/GLOSSARY.md',
    why: '"bet"/"wager"/"odds"/"deposit"/"earn" invite a gambling or compensation reading we cannot afford.',
    // Only user-facing string literals, so identifiers like `betaFlag` are safe.
    pattern: /(['"`])[^'"`]*\b(bet|bets|betting|wager|wagers|odds|deposit|deposits|payout odds)\b[^'"`]*\1/i,
    files: (p) => p.startsWith(join('site', 'js')),
    allow: [/glossary/i, /forbidden/i, /lint-constraints/],
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (['.js', '.mjs', '.html'].includes(extname(full))) out.push(full);
  }
  return out;
}

const failures = [];

for (const file of walk(SITE_JS)) {
  const rel = relative(ROOT, file);
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  for (const rule of RULES) {
    if (rule.files && !rule.files(rel)) continue;

    lines.forEach((line, i) => {
      // Comments explain the rules; they must not trip them.
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (!rule.pattern.test(code)) return;
      if (rule.allow?.some((re) => re.test(rel))) return;
      failures.push({ rule, file: rel, line: i + 1, text: line.trim() });
    });
  }
}

if (failures.length === 0) {
  console.log(`✓ ${RULES.length} architectural invariants hold`);
  process.exit(0);
}

console.error(`✗ ${failures.length} constraint violation(s)\n`);
for (const f of failures) {
  console.error(`  ${f.file}:${f.line}  [${f.rule.id}]  (${f.rule.decision})`);
  console.error(`    ${f.rule.why}`);
  console.error(`    → ${f.text}\n`);
}
process.exit(1);
