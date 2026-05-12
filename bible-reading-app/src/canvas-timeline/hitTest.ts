// src/canvas-timeline/hitTest.ts
//
// Maps a (x, y) click coordinate on the tracks canvas to a timeline item.

import type { TrackLayout, AnyItem } from './types';
import type { HebrewTimeScale } from './HebrewTimeScale';

const POINT_HIT_RADIUS_PX = 10;

/**
 * Find the item at canvas coordinates (x, y).
 *
 * Point items (diamonds) are checked first so they always win over range bars
 * that occupy the same pixel area.
 *
 * @param x          X position in CSS pixels relative to the LEFT edge of the
 *                   tracks canvas (i.e. including the shell column).
 * @param y          Y position in CSS pixels relative to the TOP edge of the
 *                   tracks canvas (already adjusted for scrollTop by caller).
 * @param tracks     Pre-computed layout array (output of computeTrackLayouts).
 * @param scale      HebrewTimeScale configured for the current viewport.
 * @param shellWidth Width of the group-label column in CSS pixels.
 * @param canvasWidth Full CSS width of the tracks canvas.
 */
export function hitTest(
  x: number,
  y: number,
  tracks: TrackLayout[],
  scale: HebrewTimeScale,
  shellWidth: number,
  canvasWidth: number,
): AnyItem | null {
  // Ignore clicks in the shell (label) column – RTL-aware
  const inShell = scale.isRtl
    ? x > canvasWidth - shellWidth
    : x < shellWidth;
  if (inShell) return null;

  for (const track of tracks) {
    if (y < track.y || y >= track.y + track.height) continue;

    // Pass 1: point items (diamonds) have click priority
    for (const { item, row, rowHeight } of track.renderedItems) {
      if (item.end) continue; // skip range items in this pass
      const rowTop = track.y + row * rowHeight;
      if (y < rowTop || y >= rowTop + rowHeight) continue;
      const cx = scale.timeToPx(item.start.getTime());
      if (Math.abs(x - cx) <= POINT_HIT_RADIUS_PX) return item;
    }

    // Pass 2: range items
    for (const { item, row, rowHeight } of track.renderedItems) {
      if (!item.end) continue; // skip point items in this pass
      const rowTop = track.y + row * rowHeight;
      if (y < rowTop || y >= rowTop + rowHeight) continue;
      const startMs = item.start.getTime();
      const endMs = item.end.getTime();
      const [x1, x2] = scale.timeRangeToPxSpan(startMs, endMs);
      if (x >= x1 && x <= x2) return item;
    }
  }

  return null;
}
