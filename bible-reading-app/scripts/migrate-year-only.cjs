#!/usr/bin/env node
/**
 * migrate-year-only.js
 *
 * Audits all history CSV files for dates that use "1 Tishrei YYYY" as a
 * placeholder (i.e., the day and month are not meaningful – only the year
 * matters). These can be simplified to the bare Hebrew year "YYYY", which
 * the new flexible date parser will automatically resolve to 1 Tishrei YYYY.
 *
 * Usage:
 *   node scripts/migrate-year-only.js            # audit / dry run
 *   node scripts/migrate-year-only.js --apply    # write simplified dates
 */

const fs = require('fs');
const path = require('path');

const CSV_FILES = [
  '../public/data/history/biblical-figures.csv',
  '../public/data/history/major-events.csv',
  '../public/data/history/bible-books.csv',
  '../public/data/history/exiles.csv',
  '../public/data/history/pogroms.csv',
  '../public/data/history/global-events.csv',
  '../public/data/history/land-of-israel.csv',
];

const APPLY = process.argv.includes('--apply');

// Pattern: "1 Tishrei YYYY" (the most common placeholder day+month)
const PLACEHOLDER_RE = /^1 Tishrei (\d+)$/;

// ── Minimal CSV parser (preserves original formatting) ───────────────────────

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function splitCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function serializeCSV(headers, rows) {
  const escape = (v) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}

// ── Main ─────────────────────────────────────────────────────────────────────

let totalFound = 0;

for (const relPath of CSV_FILES) {
  const filePath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`  [skip] File not found: ${filePath}`);
    continue;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(text);

  if (!headers.includes('startDate') || !headers.includes('endDate')) {
    console.warn(`  [skip] ${path.basename(filePath)} – missing startDate/endDate columns`);
    continue;
  }

  const dateFields = ['startDate', 'endDate'];
  const found = [];

  for (const row of rows) {
    for (const field of dateFields) {
      const val = row[field].trim();
      const m = PLACEHOLDER_RE.exec(val);
      if (m) {
        found.push({ id: row['id'], field, original: val, simplified: m[1] });
        if (APPLY) row[field] = m[1];
      }
    }
  }

  if (found.length === 0) {
    console.log(`  [ok]   ${path.basename(filePath)} – no placeholder dates found`);
    continue;
  }

  console.log(`  [${APPLY ? 'write' : 'audit'}] ${path.basename(filePath)} – ${found.length} placeholder date(s):`);
  for (const f of found) {
    console.log(`           id="${f.id}"  ${f.field}: "${f.original}" → "${f.simplified}"`);
  }

  if (APPLY) {
    fs.writeFileSync(filePath, serializeCSV(headers, rows), 'utf8');
  }

  totalFound += found.length;
}

console.log('');
if (APPLY) {
  console.log(`Done. ${totalFound} placeholder date(s) simplified.`);
} else {
  console.log(`Audit complete. ${totalFound} placeholder date(s) found.`);
  if (totalFound > 0) {
    console.log('Re-run with --apply to simplify them to bare Hebrew year numbers.');
  }
}
