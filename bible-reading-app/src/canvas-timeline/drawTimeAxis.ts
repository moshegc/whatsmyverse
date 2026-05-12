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
  /** e.g. "Aug 8" */
  gregDateLabel: string;
  /** e.g. "5 Av" (English) or "ה׳ אב" (Hebrew locale) */
  hebrewDateLabel: string;
}

// ── Year-mode helpers ────────────────────────────────────────────────────────

function niceYearInterval(visibleYears: number): number {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 3000];
  for (const c of candidates) {
    if (visibleYears / c <= 12) return c;
  }
  return 3000;
}

function computeYearTicks(scale: HebrewTimeScale): YearTick[] {
  const visibleYears = (scale.visibleEnd - scale.visibleStart) / ONE_YEAR_MS;
  const interval = niceYearInterval(visibleYears);

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

    const gregYear = new Date(ms).getFullYear();
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

function niceSubYearIntervalMs(durationMs: number): number {
  for (const interval of SUB_YEAR_INTERVALS_MS) {
    if (durationMs / interval <= 12) return interval;
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

function computeSubYearTicks(scale: HebrewTimeScale, locale: Locale): SubYearTick[] {
  const duration = scale.visibleEnd - scale.visibleStart;
  const intervalMs = niceSubYearIntervalMs(duration);
  const startTime = Math.floor(scale.visibleStart / intervalMs) * intervalMs;
  const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);

  const ticks: SubYearTick[] = [];
  for (let t = startTime; t <= scale.visibleEnd + intervalMs; t += intervalMs) {
    if (t < scale.visibleStart || t > scale.visibleEnd) continue;

    const x = scale.timeToPx(t);
    if (x < trackPxLeft - 1 || x > trackPxRight + 1) continue;

    const d = new Date(t);
    const gregDateLabel = `${GREG_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;

    let hebrewDateLabel = '';
    try {
      const hd = new HDate(d);
      const monthIdx = hd.getMonth() as number;
      if (locale === 'he') {
        const monthName = HEBREW_MONTHS_HE[monthIdx] ?? '';
        const dayGem = gematriya(hd.getDate());
        hebrewDateLabel = `${dayGem} ${monthName}`;
      } else {
        const monthName = HEBREW_MONTHS_EN[monthIdx] ?? '';
        hebrewDateLabel = `${hd.getDate()} ${monthName}`;
      }
    } catch {
      hebrewDateLabel = '';
    }

    ticks.push({ ms: t, x, gregDateLabel, hebrewDateLabel });
  }
  return ticks;
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
    const ticks = computeSubYearTicks(scale, locale);
    for (const tick of ticks) {
      const x = Math.round(tick.x) + 0.5;

      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, axisHeight - 10);
      ctx.lineTo(x, axisHeight);
      ctx.stroke();

      // Hebrew date (primary, bottom)
      ctx.fillStyle = '#222';
      ctx.font = 'bold 10px -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(tick.hebrewDateLabel, x, axisHeight - 14);

      // Gregorian date (secondary, top)
      ctx.fillStyle = '#888';
      ctx.font = '10px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(tick.gregDateLabel, x, axisHeight - 27);
    }
  } else {
    const ticks = computeYearTicks(scale);
    for (const tick of ticks) {
      const x = Math.round(tick.x) + 0.5;

      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, axisHeight - 10);
      ctx.lineTo(x, axisHeight);
      ctx.stroke();

      // Hebrew year (primary, bottom)
      const heLabel = formatHebrewYear(tick.hebrewYear, locale);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(heLabel, x, axisHeight - 14);

      // Gregorian year (secondary, top)
      const gregLabel = formatGregorianYear(tick.gregorianYear);
      ctx.fillStyle = '#888';
      ctx.font = '10px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(gregLabel, x, axisHeight - 27);
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
    ? computeSubYearTicks(scale, locale).map((t) => t.x)
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
