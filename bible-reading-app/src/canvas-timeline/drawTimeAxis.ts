// src/canvas-timeline/drawTimeAxis.ts
//
// Draws the horizontal time-axis strip at the top of the canvas.
// Shows Hebrew year ticks with both Hebrew and Gregorian date labels.
// At sub-year zoom levels, switches to day/week/month granularity.

import { HDate } from '@hebcal/core';
import { gematriya } from '@hebcal/hdate';
import type { HebrewTimeScale } from './HebrewTimeScale';
import { type Locale, gematriyaYear } from '../i18n';

const ONE_DAY_MS = 1_000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 365.25;

/** Height of the context-band row at the top of the axis strip (sub-year mode and future year-mode bands). */
const TOP_BAND_H = 16;

// ── Year-mode tick types ─────────────────────────────────────────────────────

interface YearTick {
  ms: number;
  x: number;
  hebrewYear: number;
  gregorianYear: number;
}

// ── Sub-year tick types ──────────────────────────────────────────────────────

interface SubYearTick {
  ms: number;
  x: number;
  /** Short Hebrew unit: month name (month-level) or day number (day-level). */
  primaryLabel: string;
  /**
   * Short Gregorian unit: month abbrev (month-level) or day number (day-level).
   * When intervalMs < 10 days the day-of-week is prepended: e.g. "Mon 8".
   */
  secondaryLabel: string;
}

// ── Context band types ────────────────────────────────────────────────────────

/** A contiguous span of time shown as a single labeled strip in the top row of the axis. */
interface ContextBand {
  startMs: number;
  endMs: number;
  label: string;
}

// ── Year-mode helpers ────────────────────────────────────────────────────────

function niceYearInterval(visibleYears: number, trackWidth: number): number {
  // Aim for at least 40 px per tick so year labels don't bunch up.
  const maxTicks = Math.max(3, Math.floor(trackWidth / 40));
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 3000];
  for (const c of candidates) {
    if (visibleYears / c <= maxTicks) return c;
  }
  return 3000;
}

function computeYearTicks(scale: HebrewTimeScale): YearTick[] {
  const visibleYears = (scale.visibleEnd - scale.visibleStart) / ONE_YEAR_MS;
  const trackWidth = Math.abs(scale.pxRight - scale.pxLeft);
  const interval = niceYearInterval(visibleYears, trackWidth);

  let startHYear: number;
  try {
    startHYear = new HDate(new Date(scale.visibleStart)).getFullYear();
  } catch {
    startHYear = 1;
  }

  const firstTickYear = Math.ceil(startHYear / interval) * interval;
  const lastTickYear = Math.ceil(startHYear + visibleYears + interval);
  const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);

  const ticks: YearTick[] = [];
  for (
    let year = Math.max(1, firstTickYear);
    year <= Math.min(6100, lastTickYear);
    year += interval
  ) {
    let ms: number;
    try {
      ms = new HDate(1, 7, year).greg().getTime();
    } catch {
      continue;
    }
    if (ms < scale.visibleStart || ms > scale.visibleEnd) continue;

    const x = scale.timeToPx(ms);
    if (x < trackPxLeft - 1 || x > trackPxRight + 1) continue;

    const gregYear = new Date(ms).getUTCFullYear();
    ticks.push({ ms, x, hebrewYear: year, gregorianYear: gregYear });
  }
  return ticks;
}

function formatHebrewYear(year: number, locale: Locale): string {
  if (locale === 'he') {
    try { return gematriyaYear(year); } catch { return year.toString(); }
  }
  return year.toString();
}

function formatGregorianYear(astronomicalYear: number): string {
  if (astronomicalYear > 0) return `${astronomicalYear} CE`;
  if (astronomicalYear === 0) return '1 BCE';
  return `${-astronomicalYear + 1} BCE`;
}

// ── Year-mode context band helpers ───────────────────────────────────────────

/** Format a Hebrew year range label for a context band (decade/century/millennium). */
function formatYearBandLabel(bandStart: number, bandEnd: number, locale: Locale): string {
  return `${formatHebrewYear(bandStart, locale)}\u2013${formatHebrewYear(bandEnd, locale)}`;
}

/**
 * For year-mode: compute context bands one grouping level above the current tick interval.
 *   tick interval < 10   → decade bands  (groupSize = 10)
 *   tick interval < 100  → century bands (groupSize = 100)
 *   tick interval < 1000 → millennium bands (groupSize = 1000)
 *   tick interval >= 1000 → null (no meaningful parent group)
 */
export function computeYearContextBands(scale: HebrewTimeScale, locale: Locale): ContextBand[] | null {
  const visibleYears = (scale.visibleEnd - scale.visibleStart) / ONE_YEAR_MS;
  const trackWidth = Math.abs(scale.pxRight - scale.pxLeft);
  const tickInterval = niceYearInterval(visibleYears, trackWidth);

  let groupSize: number;
  if (tickInterval >= 1000) return null;
  else if (tickInterval >= 100) groupSize = 1000;
  else if (tickInterval >= 10) groupSize = 100;
  else groupSize = 10;

  let startHYear: number;
  try {
    startHYear = new HDate(new Date(scale.visibleStart)).getFullYear();
  } catch {
    startHYear = 1;
  }

  const firstBandStart = Math.max(1, Math.floor(startHYear / groupSize) * groupSize);
  const lastBandEnd = Math.ceil(startHYear + visibleYears + groupSize);

  const bands: ContextBand[] = [];
  for (let year = firstBandStart; year <= Math.min(6100, lastBandEnd); year += groupSize) {
    let startMs: number;
    let endMs: number;
    try {
      startMs = new HDate(1, 7, Math.max(1, year)).greg().getTime();
      endMs = new HDate(1, 7, Math.min(6100, year + groupSize)).greg().getTime();
    } catch {
      continue;
    }
    if (endMs < scale.visibleStart || startMs > scale.visibleEnd) continue;
    bands.push({ startMs, endMs, label: formatYearBandLabel(year, year + groupSize - 1, locale) });
  }
  return bands;
}

// ── Sub-year helpers ─────────────────────────────────────────────────────────

/** Describes one sub-year tick interval in terms of HDate calendar units. */
interface SubYearInterval {
  count: number;
  /** 'd' = day, 'M' = month (passed directly to HDate.add). */
  unit: 'd' | 'M';
  /** Approximate millisecond length — used only for tick-density estimates. */
  approxMs: number;
}

const SUB_MONTH_INTERVALS: SubYearInterval[] = [
  { count:  1, unit: 'd', approxMs: ONE_DAY_MS },
  { count:  7, unit: 'd', approxMs: 7 * ONE_DAY_MS },
  { count: 14, unit: 'd', approxMs: 14 * ONE_DAY_MS },
];

const SUB_YEAR_INTERVALS: SubYearInterval[] = [  
  { count:  1, unit: 'M', approxMs: Math.round(30.4375 * ONE_DAY_MS) },
  { count:  6, unit: 'M', approxMs: Math.round(182.625 * ONE_DAY_MS) },
  { count: 12, unit: 'M', approxMs: Math.round(ONE_YEAR_MS) },
  { count: 24, unit: 'M', approxMs: Math.round(2 * ONE_YEAR_MS) },
];

function niceSubYearInterval(durationMs: number, trackWidth: number, isMonthLevel: boolean): SubYearInterval {
  // Aim for at least 30 px per tick so date+year labels don't bunch up.
  const maxTicks = Math.max(3, Math.floor(trackWidth / 40));
  if (isMonthLevel) {
  for (const iv of SUB_YEAR_INTERVALS) {
    if (durationMs / iv.approxMs <= maxTicks) return iv;    
  }
   return { count: 1, unit: 'M', approxMs: Math.round(30.4375 * ONE_DAY_MS) };
} else {
  for (const iv of SUB_MONTH_INTERVALS) {
    if (durationMs / iv.approxMs <= maxTicks) return iv;
  }
   return { count: 1, unit: 'd', approxMs: Math.round(ONE_DAY_MS) };
}
}
 

const GREG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const HEBREW_MONTHS_EN = [
  '', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II',
];

const HEBREW_MONTHS_HE = [
  '', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב׳',
];

const DOW_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_SHORT_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שב׳'];

// ── Sub-year context band helpers ─────────────────────────────────────────────

/**
 * Sub-year, month-level ticks context: one band per Hebrew year overlapping
 * the visible range.
 * Label: e.g. "5784 / 2024 CE" (en) or "תשפ״ד / 2024 CE" (he)
 */
export function computeYearBands(scale: HebrewTimeScale, locale: Locale): ContextBand[] {
  let startHYear: number;
  try {
    startHYear = Math.max(1, new HDate(new Date(scale.visibleStart)).getFullYear() - 1);
  } catch {
    startHYear = 1;
  }
  const endHYear = Math.min(6100, startHYear + 4);

  const bands: ContextBand[] = [];
  for (let year = startHYear; year <= endHYear; year++) {
    let startMs: number;
    let endMs: number;
    try {
      startMs = new HDate(1, 7, year).greg().getTime();
      endMs = new HDate(1, 7, year + 1).greg().getTime();
    } catch {
      continue;
    }
    if (endMs < scale.visibleStart || startMs > scale.visibleEnd) continue;
    const gregYear = new Date(startMs).getUTCFullYear();
    const label = `${formatHebrewYear(year, locale)} / ${formatGregorianYear(gregYear)}`;
    bands.push({ startMs, endMs, label });
  }
  return bands;
}

/**
 * Sub-year, day-level ticks context: one band per Hebrew month overlapping
 * the visible range.
 * Label: e.g. "Av 5784 / Aug 2024" (en) or "אב תשפ״ד / Aug 2024" (he)
 */
export function computeMonthBands(scale: HebrewTimeScale, locale: Locale): ContextBand[] {
  let startDate: HDate;
  let startYear: number;  
  try {
    startDate = new HDate(new Date(scale.visibleStart));
    startYear = Math.max(1, startDate.getFullYear() - 1);
  } catch {
    return [];
  }
  const endYear = Math.min(6100, startYear + 2);

  const bands: ContextBand[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const monthsInYear = HDate.isLeapYear(y) ? 13 : 12;
    for (let m = startDate.getMonth(); m <= monthsInYear; m++) {
      let startMs: number;
      let endMs: number;
      try {   
        const currDate = new HDate(1, m, y);   
        startMs = currDate.greg().getTime();        
        endMs = currDate.add(1, 'M').greg().getTime();        
      } catch {
        console.log(`Error computing month band for year ${y} month ${m}`);
        continue;
      }
      if (endMs < scale.visibleStart || startMs > scale.visibleEnd) continue;
      const heMonthName = locale === 'he'
        ? (HEBREW_MONTHS_HE[m] ?? '')
        : (HEBREW_MONTHS_EN[m] ?? '');
      const heYearStr = formatHebrewYear(y, locale);
      const bandDate = new Date(startMs);
      const gregMonthStr = GREG_MONTHS_SHORT[bandDate.getUTCMonth()];
      const gregYear = bandDate.getUTCFullYear();
      const gregYearStr = gregYear > 0 ? String(gregYear) : `${1 - gregYear} BCE`;
      bands.push({ startMs, endMs, label: `${heMonthName} ${heYearStr} / ${gregMonthStr} ${gregYearStr}` });
    }
  }
  return bands;
}

function computeSubYearTicks(
  scale: HebrewTimeScale,
  locale: Locale,
): { ticks: SubYearTick[]; isMonthLevel: boolean } {
  const duration = scale.visibleEnd - scale.visibleStart;
  //console.log(`duration=${duration} visibleStart=${scale.visibleStart} visibleEnd=${scale.visibleEnd}`);
  const ONE_MONTH_MS_APPROX = Math.round(30.4375 * ONE_DAY_MS);  
  const isMonthLevel = duration >= 2 * ONE_MONTH_MS_APPROX;
  const trackWidth = Math.abs(scale.pxRight - scale.pxLeft);
  const interval = niceSubYearInterval(duration, trackWidth, isMonthLevel);  
  const showDow = interval.approxMs < 10 * ONE_DAY_MS;
  const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);

  // Anchor to 1 Tishrei of the Hebrew year containing visibleStart, then
  // advance using HDate.add so every tick lands on a true calendar boundary.
  let cursor: HDate;
  try {
    let hYear = new HDate(new Date(scale.visibleStart)).getFullYear();
    if (new HDate(1, 7, Math.max(1, hYear)).greg().getTime() > scale.visibleStart) {
      hYear = Math.max(1, hYear - 1);
    }
    cursor = new HDate(1, 7, hYear);
    // Step forward until the *next* tick would reach or pass visibleStart,
    // so cursor is the last tick position before the visible window.
    let safety = 0;
    while (safety++ < 10000) {
      const next = cursor.add(interval.count, interval.unit);
      if (next.greg().getTime() >= scale.visibleStart) break;
      cursor = next;
    }    
  } catch {
    cursor = new HDate(new Date(scale.visibleStart));
  }

  const ticks: SubYearTick[] = [];
  let safety = 0;
  while (safety++ < 10000) {
    const d = cursor.greg();
    const t = d.getTime();
    if (t > scale.visibleEnd) break;

    if (t >= scale.visibleStart) {
      const x = scale.timeToPx(t);
      if (x >= trackPxLeft - 1 && x <= trackPxRight + 1) {
        let primaryLabel: string;
        let secondaryLabel: string;

        if (isMonthLevel) {
          // Show only the month name — year is in the context band
          const monthIdx = cursor.getMonth() as number;
          primaryLabel = locale === 'he'
            ? (HEBREW_MONTHS_HE[monthIdx] ?? '')
            : (HEBREW_MONTHS_EN[monthIdx] ?? '');
          secondaryLabel = GREG_MONTHS_SHORT[d.getUTCMonth()] ?? '';
        } else {
          // Show only the day number — month+year is in the context band
          try {
            primaryLabel = locale === 'he'
              ? gematriya(cursor.getDate())
              : String(cursor.getDate());
          } catch {
            primaryLabel = String(cursor.getDate());
          }
          const gregDay = String(d.getUTCDate());
          if (showDow) {
            const dow = locale === 'he' ? DOW_SHORT_HE[d.getDay()] : DOW_SHORT_EN[d.getDay()];
            secondaryLabel = `${dow} ${gregDay}`;
          } else {
            secondaryLabel = gregDay;
          }
        }

        ticks.push({ ms: t, x, primaryLabel, secondaryLabel });
      }
    }

    cursor = cursor.add(interval.count, interval.unit);
  }  
  return { ticks, isMonthLevel };
}

// ── Context band drawing helper ─────────────────────────────────────────────

/**
 * Draw the top context-band strip in the track area of the axis.
 * Fills the band background, draws a full-width separator at TOP_BAND_H,
 * and for each band draws a label pinned to its leading edge (clamped to the
 * track bounds so it stays readable while panning).
 *
 * Leading edge convention (RTL-aware):
 *   LTR → `scale.timeToPx(band.startMs)` is left edge → text-align left
 *   RTL → `scale.timeToPx(band.startMs)` is RIGHT edge → text-align right
 */
function drawContextBand(
  ctx: CanvasRenderingContext2D,
  bands: ContextBand[],
  scale: HebrewTimeScale,
  canvasWidth: number,
): void {
  const isRtl = scale.isRtl;
  const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);

  // Context band background — track area only (shell keeps its own colour)
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(trackPxLeft, 0, trackPxRight - trackPxLeft, TOP_BAND_H);

  // Full-width separator at the bottom of the band
  ctx.strokeStyle = '#bfc5cb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TOP_BAND_H - 0.5);
  ctx.lineTo(canvasWidth, TOP_BAND_H - 0.5);
  ctx.stroke();

  if (bands.length === 0) return;

  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  const textY = (TOP_BAND_H - 1) / 2;
  const padding = 4;

  for (const band of bands) {
    // The "leading" pixel is where this band's period begins in canvas space
    const leadingX = scale.timeToPx(band.startMs);
    const trailingX = scale.timeToPx(band.endMs);

    // In LTR: band occupies [leadingX, trailingX]; in RTL it's [trailingX, leadingX]
    const bandPxLeft  = Math.max(trackPxLeft,  Math.min(leadingX, trailingX));
    const bandPxRight = Math.min(trackPxRight, Math.max(leadingX, trailingX));

    // Vertical divider at the start (leading) edge of this band
    const dividerX = isRtl ? trailingX : leadingX;
    if (dividerX > trackPxLeft + 1 && dividerX < trackPxRight - 1) {
      ctx.strokeStyle = '#bfc5cb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(dividerX) + 0.5, 0);
      ctx.lineTo(Math.round(dividerX) + 0.5, TOP_BAND_H);
      ctx.stroke();
    }

    // Skip label if the visible slice of this band is too narrow to be useful
    if (bandPxRight - bandPxLeft < padding * 2) continue;

    // Clip the label to this band's visible pixel extent so it never bleeds
    // into an adjacent band even when the leading edge is off-screen.
    ctx.save();
    ctx.beginPath();
    ctx.rect(bandPxLeft, 0, bandPxRight - bandPxLeft, TOP_BAND_H);
    ctx.clip();

    ctx.fillStyle = '#3a4a5a';
    if (isRtl) {
      // Anchor near the right (leading) edge, but stay inside the band
      const anchorX = Math.min(bandPxRight - padding, Math.max(bandPxLeft + padding, leadingX - padding));
      ctx.textAlign = 'right';
      ctx.fillText(band.label, anchorX, textY);
    } else {
      // Anchor near the left (leading) edge, but stay inside the band
      const anchorX = Math.max(bandPxLeft + padding, Math.min(bandPxRight - padding, leadingX + padding));
      ctx.textAlign = 'left';
      ctx.fillText(band.label, anchorX, textY);
    }

    ctx.restore();
  }
}

// ── Shell drawing helper ─────────────────────────────────────────────────────

function drawAxisShell(
  ctx: CanvasRenderingContext2D,
  shellWidth: number,
  canvasWidth: number,
  axisHeight: number,
  isRtl: boolean,
): void {
  const shellX = isRtl ? canvasWidth - shellWidth : 0;

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(shellX, 0, shellWidth, axisHeight);

  // Shell edge border (right in LTR, left in RTL)
  const borderX = isRtl ? shellX + 0.5 : shellX + shellWidth - 0.5;
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(borderX, 0);
  ctx.lineTo(borderX, axisHeight);
  ctx.stroke();

  // Hamburger / burger button icon (≡)
  const lineW = Math.min(14, shellWidth - 6);
  const cx = shellX + shellWidth / 2;
  const cy = axisHeight / 2;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (const offset of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(cx - lineW / 2, cy + offset);
    ctx.lineTo(cx + lineW / 2, cy + offset);
    ctx.stroke();
  }
}

// ── Public entry point ───────────────────────────────────────────────────────

/**
 * Draw the time axis strip onto `ctx`.
 *
 * All coordinates are in CSS pixels (caller has already applied DPR scaling).
 */
export function drawTimeAxis(
  ctx: CanvasRenderingContext2D,
  scale: HebrewTimeScale,
  canvasWidth: number,
  axisHeight: number,
  shellWidth: number,
  locale: Locale,
): void {
  const isRtl = scale.isRtl;

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, 0, canvasWidth, axisHeight);

  // Bottom border
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, axisHeight - 0.5);
  ctx.lineTo(canvasWidth, axisHeight - 0.5);
  ctx.stroke();

  // Shell area (drawn on top of background)
  drawAxisShell(ctx, shellWidth, canvasWidth, axisHeight, isRtl);

  // ── Ticks and labels ──────────────────────────────────────────────────────
  const visibleDuration = scale.visibleEnd - scale.visibleStart;
  const isSubYearMode = visibleDuration < ONE_YEAR_MS * 2;

  if (isSubYearMode) {
    const { ticks, isMonthLevel } = computeSubYearTicks(scale, locale);    
    const ctxBands = isMonthLevel
      ? computeYearBands(scale, locale)
      : computeMonthBands(scale, locale);
    drawContextBand(ctx, ctxBands, scale, canvasWidth);
    for (const tick of ticks) {
      const x = Math.round(tick.x) + 0.5;

      // Tick mark
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, axisHeight - 8);
      ctx.lineTo(x, axisHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Primary label: Hebrew short unit (month name or day number), bottom
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(tick.primaryLabel, x, axisHeight - 13);

      // Secondary label: Gregorian short unit (optionally prefixed with DOW), above primary
      ctx.fillStyle = '#888';
      ctx.font = '10px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(tick.secondaryLabel, x, axisHeight - 28);
    }
  } else {
    // Year-mode context band (decade / century / millennium grouping)
    const yearCtxBands = computeYearContextBands(scale, locale);
    if (yearCtxBands !== null) {
      drawContextBand(ctx, yearCtxBands, scale, canvasWidth);
    }

    const ticks = computeYearTicks(scale);
    for (const tick of ticks) {
      const x = Math.round(tick.x) + 0.5;

      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, axisHeight - 8);
      ctx.lineTo(x, axisHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Hebrew year (primary, bottom) — when the year is an exact multiple of
      // 1000 (gematria shows a single letter), also show the number in parentheses
      let heLabel = formatHebrewYear(tick.hebrewYear, locale);
      if (locale === 'he' && tick.hebrewYear % 1000 === 0) {
        heLabel = `${heLabel} (${tick.hebrewYear.toLocaleString('en')})`;
      }
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(heLabel, x, axisHeight - 13);

      // Gregorian year (secondary, above primary)
      const gregLabel = formatGregorianYear(tick.gregorianYear);
      ctx.fillStyle = '#888';
      ctx.font = '10px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(gregLabel, x, axisHeight - 28);
    }
  }
}

// ── Grid lines ───────────────────────────────────────────────────────────────

/**
 * Draw faint vertical grid lines on the tracks canvas at the same x-positions
 * as the current date-axis ticks.  Call this BEFORE drawing track content so
 * the lines appear behind items.
 *
 * @param canvasHeight  Total height of the tracks canvas in CSS pixels.
 */
export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  scale: HebrewTimeScale,
  canvasHeight: number,
  shellWidth: number,
  canvasWidth: number,
  locale: Locale,
): void {
  const visibleDuration = scale.visibleEnd - scale.visibleStart;
  const isSubYearMode = visibleDuration < ONE_YEAR_MS * 2;

  const tickXs: number[] = isSubYearMode
    ? computeSubYearTicks(scale, locale).ticks.map((t) => t.x)
    : computeYearTicks(scale).map((t) => t.x);

  if (tickXs.length === 0) return;

  // Clip to track area (exclude shell column)
  const isRtl = scale.isRtl;
  const clipLeft = isRtl ? 0 : shellWidth;
  const clipRight = isRtl ? canvasWidth - shellWidth : canvasWidth;

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, 0, clipRight - clipLeft, canvasHeight);
  ctx.clip();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (const x of tickXs) {
    const px = Math.round(x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvasHeight);
    ctx.stroke();
  }

  ctx.restore();
}
