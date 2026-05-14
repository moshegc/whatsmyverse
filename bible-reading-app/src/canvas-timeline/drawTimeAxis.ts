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

const SUB_YEAR_INTERVALS_MS = [
  ONE_DAY_MS,
  2 * ONE_DAY_MS,
  7 * ONE_DAY_MS,
  14 * ONE_DAY_MS,
  Math.round(30.4375 * ONE_DAY_MS),
  Math.round(91.3125 * ONE_DAY_MS),
  Math.round(182.625 * ONE_DAY_MS),
  Math.round(ONE_YEAR_MS),
];

function niceSubYearIntervalMs(durationMs: number, trackWidth: number): number {
  // Aim for at least 30 px per tick so date+year labels don't bunch up.
  const maxTicks = Math.max(3, Math.floor(trackWidth / 30));
  for (const interval of SUB_YEAR_INTERVALS_MS) {
    if (durationMs / interval <= maxTicks) return interval;
  }
  return Math.round(ONE_YEAR_MS);
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
  let startYear: number;
  try {
    startYear = Math.max(1, new HDate(new Date(scale.visibleStart)).getFullYear() - 1);
  } catch {
    return [];
  }
  const endYear = Math.min(6100, startYear + 4);

  const bands: ContextBand[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const monthsInYear = HDate.isLeapYear(y) ? 13 : 12;
    for (let m = 1; m <= monthsInYear; m++) {
      let startMs: number;
      let endMs: number;
      try {
        startMs = new HDate(1, m, y).greg().getTime();
        const nextM = m < monthsInYear ? m + 1 : 1;
        const nextY = m < monthsInYear ? y : y + 1;
        endMs = new HDate(1, nextM, nextY).greg().getTime();
      } catch {
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
): { ticks: SubYearTick[]; intervalMs: number } {
  const duration = scale.visibleEnd - scale.visibleStart;
  const trackWidth = Math.abs(scale.pxRight - scale.pxLeft);
  const intervalMs = niceSubYearIntervalMs(duration, trackWidth);
  const ONE_MONTH_MS_APPROX = Math.round(30.4375 * ONE_DAY_MS);
  const isMonthLevel = intervalMs >= ONE_MONTH_MS_APPROX;
  const showDow = intervalMs < 10 * ONE_DAY_MS;

  const startTime = Math.floor(scale.visibleStart / intervalMs) * intervalMs;
  const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);

  const ticks: SubYearTick[] = [];
  for (let t = startTime; t <= scale.visibleEnd + intervalMs; t += intervalMs) {
    if (t < scale.visibleStart || t > scale.visibleEnd) continue;

    const hd = new HDate(new Date(t));
    const d = hd.greg();

    const x = scale.timeToPx(d.getTime());
    if (x < trackPxLeft - 1 || x > trackPxRight + 1) continue;

    let primaryLabel: string;
    let secondaryLabel: string;

    if (isMonthLevel) {
      // Show only the month name — year is in the context band
      const monthIdx = hd.getMonth() as number;
      primaryLabel = locale === 'he'
        ? (HEBREW_MONTHS_HE[monthIdx] ?? '')
        : (HEBREW_MONTHS_EN[monthIdx] ?? '');
      secondaryLabel = GREG_MONTHS_SHORT[d.getUTCMonth()] ?? '';
    } else {
    // Show only the day number — month+year is in the context band
    try {
      primaryLabel = locale === 'he'
        ? gematriya(hd.getDate())
        : String(hd.getDate());
    } catch {
      primaryLabel = String(hd.getDate());
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
  return { ticks, intervalMs };
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

    // Vertical divider at the left canvas edge of this band
    const dividerX = isRtl ? scale.timeToPx(band.endMs) : leadingX;
    if (dividerX > trackPxLeft + 1 && dividerX < trackPxRight - 1) {
      ctx.strokeStyle = '#bfc5cb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(dividerX) + 0.5, 0);
      ctx.lineTo(Math.round(dividerX) + 0.5, TOP_BAND_H);
      ctx.stroke();
    }

    // Label anchored at the leading edge, clamped so it always stays visible
    ctx.fillStyle = '#3a4a5a';
    if (isRtl) {
      const anchorX = Math.min(trackPxRight - padding, Math.max(trackPxLeft + padding, leadingX));
      ctx.textAlign = 'right';
      ctx.fillText(band.label, anchorX, textY);
    } else {
      const anchorX = Math.max(trackPxLeft + padding, Math.min(trackPxRight - padding, leadingX));
      ctx.textAlign = 'left';
      ctx.fillText(band.label, anchorX, textY);
    }
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
    const { ticks, intervalMs } = computeSubYearTicks(scale, locale);
    const ONE_MONTH_MS_APPROX = Math.round(30.4375 * ONE_DAY_MS);
    const ctxBands = intervalMs >= ONE_MONTH_MS_APPROX
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

      // Hebrew year (primary, bottom)
      const heLabel = formatHebrewYear(tick.hebrewYear, locale);
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
