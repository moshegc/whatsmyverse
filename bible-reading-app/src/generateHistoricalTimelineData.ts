// src/generateHistoricalTimelineData.ts

import {
  historicalEventCategories,
  historicalEvents,
  parseHebrewDate,
  type HistoricalEvent,
  type HistoricalEventCategory,
} from './historicalEvents';

// ─── Timeline-item type for historical events ─────────────────────────────

export interface HistoricalTimelineItem {
  id: string;
  start: Date;
  end?: Date;
  content: string;
  group: string;
  type: 'range' | 'point';
  title: string;        // tooltip on hover
  className: string;    // for CSS styling
  style?: string;
  /** Original event data for the popup */
  _event: HistoricalEvent;
}

// ─── Generator ─────────────────────────────────────────────────────────────

/** Build a lookup of categories by id for quick access */
function buildCategoryMap(): Map<string, HistoricalEventCategory> {
  const map = new Map<string, HistoricalEventCategory>();
  for (const cat of historicalEventCategories) {
    map.set(cat.id, cat);
  }
  return map;
}

/**
 * Convert every entry in `historicalEvents` into a vis-timeline item.
 * Items with an `endDate` become "range" bars; those without become "point" markers.
 */
export function generateHistoricalTimelineData(): HistoricalTimelineItem[] {
  const categoryMap = buildCategoryMap();
  const items: HistoricalTimelineItem[] = [];

  for (const event of historicalEvents) {
    const category = categoryMap.get(event.categoryId);
    if (!category) {
      console.warn(
        `[historicalEvents] Unknown categoryId "${event.categoryId}" for event "${event.id}" – skipping.`,
      );
      continue;
    }

    const startHDate = parseHebrewDate(event.startDate);
    const isRange = !!event.endDate;

    const item: HistoricalTimelineItem = {
      id: `hist-${event.id}`,
      start: startHDate.greg(),
      content: event.name,
      group: event.categoryId,
      type: isRange ? 'range' : 'point',
      title: event.description || event.name,
      className: `hist-item hist-${event.categoryId}`,
      style: isRange
        ? `background-color: ${category.color}; border-color: ${category.color};`
        : `color: ${category.color}; border-color: ${category.color};`,
      _event: event,
    };

    if (isRange && event.endDate) {
      const endHDate = parseHebrewDate(event.endDate);
      item.end = endHDate.greg();
    }

    items.push(item);
  }

  return items;
}
