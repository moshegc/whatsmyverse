#!/usr/bin/env node
/**
 * migrate-point-events.js
 *
 * Under the new date semantics, a "point event" (single moment in time) is
 * expressed by having ONLY an endDate (startDate empty). Previously, point
 * events used ONLY a startDate (endDate empty).
 *
 * This script finds every CSV row where:
 *   - startDate is non-empty AND endDate is empty
 *
 * ...and moves the startDate value into endDate, clearing startDate.
 *
 * Usage:
 *   node scripts/migrate-point-events.js            # dry run (preview only)
 *   node scripts/migrate-point-events.js --apply    # write changes to disk
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

let totalChanged = 0;

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

  const changed = [];
  for (const row of rows) {
    const start = row['startDate'].trim();
    const end = row['endDate'].trim();
    if (start && !end) {
      changed.push({ id: row['id'], from: start });
      row['endDate'] = start;
      row['startDate'] = '';
    }
  }

  if (changed.length === 0) {
    console.log(`  [ok]   ${path.basename(filePath)} – no point events to migrate`);
    continue;
  }

  console.log(`  [${APPLY ? 'write' : 'dry  '}] ${path.basename(filePath)} – ${changed.length} row(s):`);
  for (const c of changed) {
    console.log(`           id="${c.id}"  startDate="${c.from}" → endDate`);
  }

  if (APPLY) {
    fs.writeFileSync(filePath, serializeCSV(headers, rows), 'utf8');
  }

  totalChanged += changed.length;
}

console.log('');
if (APPLY) {
  console.log(`Done. ${totalChanged} row(s) migrated.`);
} else {
  console.log(`Dry run complete. ${totalChanged} row(s) would be migrated.`);
  console.log('Re-run with --apply to write changes to disk.');
}
