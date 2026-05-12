// src/canvas-timeline/hitTest.ts
//
// Maps a (x, y) click coordinate on the tracks canvas to a timeline item.

import type { TrackLayout, AnyItem } from './types';
import type { HebrewTimeScale } from './HebrewTimeScale';

const POINT_HIT_RADIUS_PX = 10;

/**
 * Find the item at canvas coordinates (x, y).
 *
 * @param x          X position in CSS pixels relative to the LEFT edge of the
 *                   tracks canvas (i.e. including the shell column).
 * @param y          Y position in CSS pixels relative to the TOP edge of the
 *                   tracks canvas (already adjusted for scrollTop by caller).
 * @param tracks     Pre-computed layout array (output of computeTrackLayouts).
 * @param scale      HebrewTimeScale configured for the current viewport.
 * @param shellWidth Width of the group-label column in CSS pixels.
 */
export function hitTest(
  x: number,
  y: number,
  tracks: TrackLayout[],
  scale: HebrewTimeScale,
  shellWidth: number,
): AnyItem | null {
  // Ignore clicks in the shell (label) column
  if (x < shellWidth) return null;

  for (const track of tracks) {
    if (y < track.y || y >= track.y + track.height) continue;

    for (const { item, row, rowHeight } of track.renderedItems) {
      const rowTop = track.y + row * rowHeight;
      const rowBottom = rowTop + rowHeight;
      if (y < rowTop || y >= rowBottom) continue;

      const startMs = item.start.getTime();
      const isPoint = !item.end;

      if (isPoint) {
        const cx = scale.timeToPx(startMs);
        if (Math.abs(x - cx) <= POINT_HIT_RADIUS_PX) return item;
      } else {
        const endMs = item.end!.getTime();
        const [x1, x2] = scale.timeRangeToPxSpan(startMs, endMs);
        if (x >= x1 && x <= x2) return item;
      }
    }
  }

  return null;
}
