// src/canvas-timeline/drawTimeAxis.ts
//
// Draws the horizontal time-axis strip at the top of the canvas.
// Shows Hebrew year ticks with both Hebrew and Gregorian date labels.

import { HDate } from '@hebcal/core';
import { gematriya } from '@hebcal/hdate';
import type { HebrewTimeScale } from './HebrewTimeScale';
import type { Locale } from '../i18n';

interface Tick {
  ms: number;
  x: number;
  hebrewYear: number;
  /** Full proleptic Gregorian year (negative = BCE astronomical year) */
  gregorianYear: number;
}

const ONE_YEAR_MS = 1_000 * 60 * 60 * 24 * 365.25;

/**
 * Pick a nice tick interval in Hebrew years so there are roughly 8–12 ticks
 * in the visible window.
 */
function niceTickInterval(visibleYears: number): number {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 3000];
  for (const c of candidates) {
    if (visibleYears / c <= 12) return c;
  }
  return 3000;
}

function computeTicks(
  scale: HebrewTimeScale,
): Tick[] {
  const visibleYears = (scale.visibleEnd - scale.visibleStart) / ONE_YEAR_MS;
  const interval = niceTickInterval(visibleYears);

  // Find the approximate Hebrew year at the start of the visible window
  let startHYear: number;
  try {
    startHYear = new HDate(new Date(scale.visibleStart)).getFullYear();
  } catch {
    startHYear = 1;
  }

  const firstTickYear = Math.ceil(startHYear / interval) * interval;
  const lastTickYear = Math.ceil(startHYear + visibleYears + interval);

  const ticks: Tick[] = [];
  for (
    let year = Math.max(1, firstTickYear);
    year <= Math.min(6100, lastTickYear);
    year += interval
  ) {
    let ms: number;
    try {
      ms = new HDate(1, 7, year).greg().getTime(); // 1 Tishrei of `year`
    } catch {
      continue;
    }
    if (ms < scale.visibleStart || ms > scale.visibleEnd) continue;

    const x = scale.timeToPx(ms);
    const trackPxLeft = Math.min(scale.pxLeft, scale.pxRight);
    const trackPxRight = Math.max(scale.pxLeft, scale.pxRight);
    if (x < trackPxLeft - 1 || x > trackPxRight + 1) continue;

    // Gregorian year from the JavaScript Date
    const gregYear = new Date(ms).getFullYear();

    ticks.push({ ms, x, hebrewYear: year, gregorianYear: gregYear });
  }

  // Also add a shell/label divider tick at x = shellWidth when RTL is off
  return ticks;
}

/**
 * Format a Hebrew year as a string.
 * In Hebrew locale: gematriya notation (e.g. "ה׳תשפ״ד").
 * In English locale: plain number (e.g. "5784").
 */
function formatHebrewYear(year: number, locale: Locale): string {
  if (locale === 'he') {
    try {
      return gematriya(year);
    } catch {
      return year.toString();
    }
  }
  return year.toString();
}

/**
 * Format a proleptic Gregorian year as a CE/BCE string.
 * Astronomical year 0 = 1 BCE, negative = earlier BCE.
 */
function formatGregorianYear(astronomicalYear: number): string {
  if (astronomicalYear > 0) return `${astronomicalYear} CE`;
  if (astronomicalYear === 0) return '1 BCE';
  return `${-astronomicalYear + 1} BCE`;
}

/**
 * Draw the time axis strip onto `ctx`.
 *
 * This function should be called on the axis canvas (fixed height at top).
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
  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, 0, canvasWidth, axisHeight);

  // Shell background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, shellWidth, axisHeight);

  // Bottom border
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, axisHeight - 0.5);
  ctx.lineTo(canvasWidth, axisHeight - 0.5);
  ctx.stroke();

  // Shell right border
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shellWidth - 0.5, 0);
  ctx.lineTo(shellWidth - 0.5, axisHeight);
  ctx.stroke();

  // ── Ticks and labels ──────────────────────────────────────────────────────
  const ticks = computeTicks(scale);

  for (const tick of ticks) {
    const x = Math.round(tick.x) + 0.5;

    // Tick mark
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, axisHeight - 10);
    ctx.lineTo(x, axisHeight);
    ctx.stroke();

    // Hebrew year (primary label, upper)
    const heLabel = formatHebrewYear(tick.hebrewYear, locale);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(heLabel, x, axisHeight - 14);

    // Gregorian year (secondary label, lower)
    const gregLabel = formatGregorianYear(tick.gregorianYear);
    ctx.fillStyle = '#888';
    ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    ctx.fillText(gregLabel, x, axisHeight - 27);
  }
}
