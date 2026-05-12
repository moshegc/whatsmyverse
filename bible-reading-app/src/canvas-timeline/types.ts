// src/canvas-timeline/types.ts
//
// Shared interfaces used across the canvas-timeline modules.

import type { TimelineItem } from '../generateTimelineData';
import type { HistoricalTimelineItem } from '../generateHistoricalTimelineData';

export type AnyItem = TimelineItem | HistoricalTimelineItem;

export interface RenderedItemEntry {
  item: AnyItem;
  /** Row index within the track (0 for non-stacked groups) */
  row: number;
  /** Height of each row in this track, in CSS pixels */
  rowHeight: number;
}

export interface TrackLayout {
  groupId: string;
  label: string;
  color: string;
  /** Top y position of this track on the tracks canvas, in CSS pixels */
  y: number;
  /** Total height of this track, in CSS pixels */
  height: number;
  /** Height of a single row, in CSS pixels */
  rowHeight: number;
  renderedItems: RenderedItemEntry[];
}
