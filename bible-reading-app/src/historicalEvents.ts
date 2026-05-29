// src/historicalEvents.ts

import { HDate } from '@hebcal/core';
import Papa from 'papaparse';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A category groups related historical events on the timeline.
 * Each category becomes its own row (CanvasTimeline "group") displayed
 * above the reading-schedule rows.
 */
export interface HistoricalEventCategory {
  /** Unique key used as the CanvasTimeline group id */
  id: string;
  /** Display name shown in the timeline sidebar */
  name: string;
  /** Hebrew display name */
  nameHe?: string;
  /** Fixed colour for every item in this category (CSS color string) */
  color: string;
  /**
   * Display order – lower numbers appear higher on the timeline.
   * Reading-schedule groups start at order 100, so keep these below 100.
   */
  order: number;
  /**
   * Path to the CSV data file (relative to `public/`).
   * CSV columns: id, name, startDate, endDate, description
   * `endDate` may be empty for point events.
   */
  csvFile: string;
  /**
   * When true, items in this group will be stacked (cascading) so
   * overlapping ranges are all visible.  Default false (single row).
   */
  stacked?: boolean;
  /**
   * When stacked is true, specify a custom order for sub groups inside this category.
   */
  subGroupOrder?: string[];
}

/**
 * A single historical event.
 *
 * Render semantics (based on which date fields are populated):
 * - `startDate` only  → **ongoing** bar from startDate to today + gradient fade
 * - `endDate` only    → **point** marker (diamond) at that date
 * - both present      → **range** bar from startDate to endDate
 *
 * Date format (any field): flexible parser accepts:
 *   - Full Hebrew date:     "15 Nisan 2448"
 *   - Full Gregorian date:  "15 January 1917"
 *   - Gregorian year+era:   "500 BCE" | "1948 CE"
 *   - Bare Hebrew year:     "5784"  (defaults to 1 Tishrei N)
 */
export interface HistoricalEvent {
  /** Unique id – must be unique across ALL timeline items */
  id: string;
  /** Must match a `HistoricalEventCategory.id` */
  categoryId: string;
  /** Optional region or sub-category id parsed from the CSV's categoryId column */
  regionId?: string;
  /** Short label shown on the timeline item */
  name: string;
  /** Hebrew name */
  nameHe?: string;
  /**
   * Start date string.  Present for range and ongoing items; omitted for point events.
   */
  startDate?: string;
  /**
   * End date string.  Present for range items; also used as the point date for
   * point events (startDate omitted).  Omitted for ongoing items.
   */
  endDate?: string;
  /** Optional longer description shown in the popup */
  description?: string;
  /** Hebrew description */
  descriptionHe?: string;
  /** Optional Wikipedia or external link shown in the detail card */
  link?: string;
  /** Optional Hebrew Wikipedia or external link shown in the detail card when locale is 'he' */
  linkHe?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a Hebrew-date string like "1 Tishrei 2048" into an HDate */
export function parseHebrewDate(dateString: string): HDate {
  const parts = dateString.trim().split(/\s+/);
  return new HDate(parseInt(parts[0], 10), parts[1], parseInt(parts[2], 10));
}

export function hDateToUtcMidnight(hd: HDate): Date {
  const d = hd.greg(); // local midnight, but LMT-shifted in UTC
  const out = new Date(0);
  // getFullYear/getMonth/getDate read local-time components = the intended calendar date
  out.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  return out;
}

/**
 * Hebrew month names recognised by the flexible date parser.
 * Includes alternate spellings used in the CSV data.
 */
const HEBREW_MONTH_NAMES = [
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat',
  'Adar', 'Adar I', 'Adar II',
];

/**
 * Parse a date string in any of the supported formats into a JS `Date`
 * (UTC midnight on the resolved calendar date).
 *
 * Supported formats (evaluated in order):
 *  1. Full Hebrew date   – "15 Nisan 2448"  (contains a Hebrew month name)
 *  2. Full Gregorian date – "15 January 1917" (contains a Gregorian month name)
 *  3. Gregorian BCE year – "500 BCE" or "500 BC"
 *  4. Gregorian CE year  – "1948 CE" or "1948 AD"
 *  5. Bare integer       – "5784"  → Hebrew year, defaults to 1 Tishrei N
 */
export function parseDateString(dateString: string): Date {
  const s = dateString.trim();

  // 1. Hebrew month name present → full Hebrew date
  if (HEBREW_MONTH_NAMES.some((m) => s.includes(m))) {
    const parts = s.split(/\s+/);
    const hd = new HDate(parseInt(parts[0], 10), parts[1], parseInt(parts[2], 10));
    return hDateToUtcMidnight(hd);
  }

  // 2. Gregorian full date with a Gregorian month name (e.g. "15 January 1917")
  const gregFullMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{1,4})$/);
  if (gregFullMatch) {
    const parsed = new Date(`${gregFullMatch[2]} ${gregFullMatch[1]}, ${gregFullMatch[3]}`);
    if (!isNaN(parsed.getTime())) {
      const out = new Date(0);
      out.setUTCFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      return out;
    }
  }

  // 3. BCE / BC → negative Gregorian year (astronomical year numbering)
  //    JS year 0 = 1 BCE, so BCE year N → JS year = 1 - N
  const bceMatch = s.match(/^(\d+)\s*(?:BCE|BC)$/i);
  if (bceMatch) {
    const out = new Date(0);
    out.setUTCFullYear(1 - parseInt(bceMatch[1], 10), 0, 1);
    return out;
  }

  // 4. CE / AD → positive Gregorian year
  const ceMatch = s.match(/^(\d+)\s*(?:CE|AD)$/i);
  if (ceMatch) {
    const out = new Date(0);
    out.setUTCFullYear(parseInt(ceMatch[1], 10), 0, 1);
    return out;
  }

  // 5. Bare integer → Hebrew year, default to 1 Tishrei
  const bareYearMatch = s.match(/^(\d+)$/);
  if (bareYearMatch) {
    const hd = new HDate(1, 'Tishrei', parseInt(bareYearMatch[1], 10));
    return hDateToUtcMidnight(hd);
  }

  // Fallback: treat as full Hebrew date (will throw if malformed)
  const parts = s.split(/\s+/);
  const hd = new HDate(parseInt(parts[0], 10), parts[1], parseInt(parts[2], 10));
  return hDateToUtcMidnight(hd);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export const historicalEventCategories: HistoricalEventCategory[] = [
  {
    id: 'biblical-figures',
    name: 'Figures',
    nameHe: 'דמויות ואישים',
    color: '#4a90d9',
    order: 10,
    csvFile: '/data/history/biblical-figures.csv',
    stacked: true,           // cascading so overlapping lifetimes show
  },
  {
    id: 'major-events',
    name: 'Major Events',
    nameHe: 'אירועים מרכזיים',
    color: '#142af5',
    order: 20,
    csvFile: '/data/history/major-events.csv',
  },
  {
    id: 'bible-books',
    name: 'Bible Book Periods',
    nameHe: 'תקופות ספרי התנ״ך',
    color: '#50b87a',
    order: 30,
    csvFile: '/data/history/bible-books.csv',
  },
  {
    id: 'land-of-israel',
    name: 'Rulers of the Land of Israel',
    nameHe: 'שליטי ארץ ישראל',
    color: '#27ae60',
    order: 40,
    csvFile: '/data/history/land-of-israel.csv'    
  },
  {
    id: 'jewish-exiles',
    name: 'Exiles & Expulsions',
    nameHe: 'גלויות וגירושים',
    color: '#ca2323',
    order: 50,
    csvFile: '/data/history/exiles.csv',
    stacked: true,
  },
  {
    id: 'jewish-pogroms',
    name: 'Pogroms & Persecutions',
    nameHe: 'פוגרומים ורדיפות',
    color: '#8b1a1a',
    order: 60,
    csvFile: '/data/history/pogroms.csv',
    stacked: false,
  },
  {
    id: 'global-events',
    name: 'World History',
    nameHe: 'היסטוריה עולמית',
    color: '#e67e22',
    order: 70,
    csvFile: '/data/history/global-events.csv',
    stacked: true,
    subGroupOrder: [
      'egypt',
      'mesopotamia',
      'greece',
      'rome',
      'religion',
      'europe',
      'asia',
      'america',
      'world',
      'default',
    ],
  }  
  // Add more categories by creating a CSV and adding an entry here.
  // Keep `order` below 100 so they stay above the reading-schedule rows.
];

// ─── CSV loader ─────────────────────────────────────────────────────────────

interface CsvEventRow {
  id: string;
  categoryId?: string;
  name: string;
  nameHe: string;
  startDate: string;
  endDate: string;
  description: string;
  descriptionHe: string;
  link: string;
  linkHe: string;
}

function fetchCsvSync(filePath: string): string {
  const request = new XMLHttpRequest();
  request.open('GET', filePath, false);
  request.send(null);
  if (request.status !== 200) {
    throw new Error(`Failed to fetch CSV: ${filePath} (${request.status})`);
  }
  return request.responseText;
}

function loadEventsFromCsv(category: HistoricalEventCategory): HistoricalEvent[] {
  const csvText = fetchCsvSync(category.csvFile);
  const results = Papa.parse<CsvEventRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return results.data.map((row) => ({
    id: row.id.trim(),
    categoryId: category.id,
    regionId: row.categoryId?.trim() || undefined,
    name: row.name.trim(),
    nameHe: row.nameHe?.trim() || undefined,
    startDate: row.startDate?.trim() || undefined,
    endDate: row.endDate?.trim() || undefined,
    description: row.description?.trim() || undefined,
    descriptionHe: row.descriptionHe?.trim() || undefined,
    link: row.link?.trim() || undefined,
    linkHe: row.linkHe?.trim() || undefined,
  }));
}

// ─── Exported data ──────────────────────────────────────────────────────────

/**
 * All historical events loaded from the CSV files declared in each category.
 * Computed once on module load.
 */
export const historicalEvents: HistoricalEvent[] = historicalEventCategories.flatMap(
  (cat) => loadEventsFromCsv(cat),
);
