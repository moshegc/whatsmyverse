// src/canvas-timeline/stackItems.ts
//
// Greedy interval scheduling — assigns overlapping timeline items to rows so
// that no two items in the same row overlap.  Used for the "stacked" groups
// such as "biblical-figures" where many lifespans overlap.

import type { AnyItem, RenderedItemEntry } from './types';

export interface StackResult {
  stacked: RenderedItemEntry[];
  maxRows: number;
}

/**
 * Given an array of items, distribute them into rows so that no two items
 * in the same row overlap in time.
 *
 * The rowHeight is passed in so the caller can choose different sizes for
 * stacked vs non-stacked groups.
 */
export function stackItems(items: AnyItem[], rowHeight: number): StackResult {
  // Sort ascending by start time for greedy assignment
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  // rowEnds[r] = the latest end time (ms) of any item placed in row r so far
  const rowEnds: number[] = [];
  const stacked: RenderedItemEntry[] = [];

  for (const item of sorted) {
    const startMs = item.start.getTime();
    // Treat point items (no end) as having a 1-ms duration so they still
    // participate in overlap detection with a minimal footprint.
    const endMs = (item.end ? item.end.getTime() : item.start.getTime()) + 1;

    let assignedRow = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= startMs) {
        assignedRow = r;
        break;
      }
    }
    if (assignedRow === -1) {
      assignedRow = rowEnds.length;
      rowEnds.push(endMs);
    } else {
      rowEnds[assignedRow] = endMs;
    }

    stacked.push({ item, row: assignedRow, rowHeight });
  }

  return { stacked, maxRows: Math.max(1, rowEnds.length) };
}
