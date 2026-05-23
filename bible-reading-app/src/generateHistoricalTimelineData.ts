// src/generateHistoricalTimelineData.ts

import {
  historicalEventCategories,
  historicalEvents,
  parseDateString,
  type HistoricalEvent,
  type HistoricalEventCategory,
} from './historicalEvents';
import { localize, type Locale } from './i18n';

// ─── Timeline-item type for historical events ─────────────────────────────

export interface HistoricalTimelineItem {
  id: string;
  start: Date;
  end?: Date;
  content: string;
  group: string;
  /** range: bar with defined end | point: diamond marker | ongoing: bar ending at today + gradient */
  type: 'range' | 'point' | 'ongoing';
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
export function generateHistoricalTimelineData(locale: Locale = 'en'): HistoricalTimelineItem[] {
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

    const hasStart = !!event.startDate;
    const hasEnd = !!event.endDate;

    if (!hasStart && !hasEnd) {
      console.warn(
        `[historicalEvents] Event "${event.id}" has neither startDate nor endDate – skipping.`,
      );
      continue;
    }

    const displayName = localize(event.name, event.nameHe, locale);
    const displayDesc = localize(
      event.description || event.name,
      event.descriptionHe || event.nameHe,
      locale,
    );

    let itemType: 'range' | 'point' | 'ongoing';
    let startDate: Date;
    let endDate: Date | undefined;

    if (hasStart && hasEnd) {
      // Defined range: bar from startDate to endDate
      itemType = 'range';
      startDate = parseDateString(event.startDate!);
      endDate = parseDateString(event.endDate!);
    } else if (hasStart) {
      // Ongoing: bar from startDate to today, with gradient fade
      itemType = 'ongoing';
      startDate = parseDateString(event.startDate!);
      endDate = new Date();
    } else {
      // Point event: diamond marker at endDate
      itemType = 'point';
      startDate = parseDateString(event.endDate!);
      endDate = undefined;
    }

    const item: HistoricalTimelineItem = {
      id: `hist-${event.id}`,
      start: startDate,
      end: endDate,
      content: displayName,
      group: event.categoryId,
      type: itemType,
      title: displayDesc,
      className: `hist-item hist-${event.categoryId}`,
      style: itemType === 'point'
        ? `color: ${category.color}; border-color: ${category.color};`
        : `background-color: ${category.color}; border-color: ${category.color};`,
      _event: event,
    };

    items.push(item);
  }

  return items;
}
