// src/canvas-timeline/stackItems.ts
//
// Greedy interval scheduling — assigns overlapping timeline items to rows so
// that no two items in the same row overlap.  Used for the "stacked" groups
// such as "biblical-figures" where many lifespans overlap.

import type { AnyItem, RenderedItemEntry } from './types';
import type { HistoricalTimelineItem } from '../generateHistoricalTimelineData';

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
export function stackItems(items: AnyItem[], rowHeight: number, subGroupOrder?: string[]): StackResult {
  const order = subGroupOrder || [];

  const n = items.length;
  if (n === 0) return { stacked: [], maxRows: 0 };

  const edges: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Int32Array(n);

  const getSubGroupIdx = (item: AnyItem) => {
    const subGroup = (item as HistoricalTimelineItem).subGroup || 'default';
    let idx = order.indexOf(subGroup);
    if (idx === -1) idx = order.length;
    return idx;
  };

  const startMs = new Float64Array(n);
  const endMs = new Float64Array(n);
  const subGroupIdx = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    startMs[i] = items[i].start.getTime();
    // Treat point items (no end) as having a 1-ms duration so they still
    // participate in overlap detection with a minimal footprint.
    endMs[i] = (items[i].end ? items[i].end!.getTime() : startMs[i]) + 1;
    subGroupIdx[i] = getSubGroupIdx(items[i]);
  }

  // Build DAG: directed edges only between overlapping items of DIFFERENT sub groups.
  // This enforces the rule that sub groups keep their vertical order when they overlap.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.max(startMs[i], startMs[j]) < Math.min(endMs[i], endMs[j])) {
        if (subGroupIdx[i] < subGroupIdx[j]) {
          edges[i].push(j);
          indegree[j]++;
        } else if (subGroupIdx[j] < subGroupIdx[i]) {
          edges[j].push(i);
          indegree[i]++;
        }
      }
    }
  }

  const minRow = new Int32Array(n);
  const rows = new Int32Array(n).fill(-1);

  // Ready queue for topological sort. We process earlier items first.
  const ready: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) ready.push(i);
  }

  const placedInRow: number[][] = [];

  while (ready.length > 0) {
    // Pick the item with the earliest start time to ensure tight left-to-right packing
    let bestIdx = 0;
    for (let i = 1; i < ready.length; i++) {
      if (startMs[ready[i]] < startMs[ready[bestIdx]]) {
        bestIdx = i;
      }
    }
    const u = ready.splice(bestIdx, 1)[0];

    // Find the lowest free row that is >= minRow[u]
    let r = minRow[u];
    while (true) {
      if (r >= placedInRow.length) {
        placedInRow.push([]);
      }
      const conflicts = placedInRow[r].some(
        (v) => Math.max(startMs[u], startMs[v]) < Math.min(endMs[u], endMs[v])
      );
      if (!conflicts) {
        break;
      }
      r++;
    }

    rows[u] = r;
    placedInRow[r].push(u);

    // Release outgoing edges
    for (const v of edges[u]) {
      // The dependent item must be strictly below this item
      minRow[v] = Math.max(minRow[v], r + 1);
      indegree[v]--;
      if (indegree[v] === 0) {
        ready.push(v);
      }
    }
  }

  const stacked: RenderedItemEntry[] = [];
  for (let i = 0; i < n; i++) {
    stacked.push({ item: items[i], row: rows[i], rowHeight });
  }

  return { stacked, maxRows: placedInRow.length };
}
