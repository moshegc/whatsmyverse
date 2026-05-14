// src/canvas-timeline/timelineState.ts
//
// Pure functions for zoom / pan and timeline boundary constants.
// Mirrors Perfetto's HighPrecisionTimeSpan operations but uses plain numbers
// (ms since Unix epoch) instead of bigint nanoseconds.

import { HDate } from '@hebcal/core';

const ONE_DAY_MS = 1_000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 365.25;

// The absolute bounds of the timeline: 1 year before Hebrew year 1 through
// 1 year after Hebrew year 6000.
export const TIMELINE_MIN_MS: number =
  new HDate(1, 7, 1).greg().getTime() - ONE_YEAR_MS;
export const TIMELINE_MAX_MS: number =
  new HDate(1, 7, 6000).greg().getTime() + ONE_YEAR_MS;

export const MIN_ZOOM_MS = 3 * ONE_DAY_MS;

export interface VisibleWindow {
  start: number; // ms
  end: number;   // ms
}

export const INITIAL_WINDOW: VisibleWindow = {
  start: TIMELINE_MIN_MS,
  end: TIMELINE_MAX_MS,
};

/**
 * Zoom the visible window around a fractional center point.
 * @param factor  >1 zooms out, <1 zooms in.
 * @param centerRatio  0 = left edge, 0.5 = center, 1 = right edge.
 */
export function zoomWindow(
  win: VisibleWindow,
  factor: number,
  centerRatio: number,
): VisibleWindow {
  const currentDuration = win.end - win.start;
  const newDuration = Math.max(
    MIN_ZOOM_MS,
    Math.min(TIMELINE_MAX_MS - TIMELINE_MIN_MS, currentDuration * factor),
  );
  const durationDelta = currentDuration - newDuration;
  let newStart = win.start + durationDelta * centerRatio;

  // Clamp to total range
  newStart = Math.max(TIMELINE_MIN_MS, newStart);
  const newEnd = newStart + newDuration;
  if (newEnd > TIMELINE_MAX_MS) {
    newStart = TIMELINE_MAX_MS - newDuration;
  }
  return { start: newStart, end: newStart + newDuration };
}

/**
 * Translate the visible window by deltaMs milliseconds (positive = forward in time).
 */
export function panWindow(win: VisibleWindow, deltaMs: number): VisibleWindow {
  const duration = win.end - win.start;
  let newStart = win.start + deltaMs;
  newStart = Math.max(TIMELINE_MIN_MS, newStart);
  if (newStart + duration > TIMELINE_MAX_MS) {
    newStart = TIMELINE_MAX_MS - duration;
  }
  return { start: newStart, end: newStart + duration };
}
