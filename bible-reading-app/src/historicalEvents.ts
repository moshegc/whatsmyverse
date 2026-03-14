// src/historicalEvents.ts

import { HDate } from '@hebcal/core';
import Papa from 'papaparse';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A category groups related historical events on the timeline.
 * Each category becomes its own row (vis-timeline "group") displayed
 * above the reading-schedule rows.
 */
export interface HistoricalEventCategory {
  /** Unique key used as the vis-timeline group id */
  id: string;
  /** Display name shown in the timeline sidebar */
  name: string;
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
}

/**
 * A single historical event.
 *
 * - If `endDate` is provided the event is rendered as a **range** (bar).
 * - If `endDate` is omitted/undefined the event is rendered as a **point** (dot / marker).
 */
export interface HistoricalEvent {
  /** Unique id – must be unique across ALL timeline items */
  id: string;
  /** Must match a `HistoricalEventCategory.id` */
  categoryId: string;
  /** Short label shown on the timeline item */
  name: string;
  /**
   * Hebrew-date string in the format "day MonthName year",
   * e.g. "1 Tishrei 2048" or "15 Nisan 2448".
   */
  startDate: string;
  /**
   * Optional end date (same format).  When provided the item is a range;
   * when omitted the item is a point event.
   */
  endDate?: string;
  /** Optional longer description shown in the popup */
  description?: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Parse a Hebrew-date string like "1 Tishrei 2048" into an HDate */
export function parseHebrewDate(dateString: string): HDate {
  const parts = dateString.trim().split(/\s+/);
  return new HDate(parseInt(parts[0], 10), parts[1], parseInt(parts[2], 10));
}

// ─── Categories ─────────────────────────────────────────────────────────────

export const historicalEventCategories: HistoricalEventCategory[] = [
  {
    id: 'biblical-figures',
    name: 'Biblical Figures',
    color: '#4a90d9',
    order: 10,
    csvFile: '/data/biblical-figures.csv',
    stacked: true,           // cascading so overlapping lifetimes show
  },
  {
    id: 'major-events',
    name: 'Major Events',
    color: '#d94a4a',
    order: 20,
    csvFile: '/data/major-events.csv',
  },
  {
    id: 'bible-books',
    name: 'Bible Book Periods',
    color: '#50b87a',
    order: 30,
    csvFile: '/data/bible-books.csv',
  },
  // Add more categories by creating a CSV and adding an entry here.
  // Keep `order` below 100 so they stay above the reading-schedule rows.
];

// ─── CSV loader ─────────────────────────────────────────────────────────────

interface CsvEventRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
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
    name: row.name.trim(),
    startDate: row.startDate.trim(),
    endDate: row.endDate?.trim() || undefined,
    description: row.description?.trim() || undefined,
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
