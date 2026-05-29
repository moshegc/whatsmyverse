// src/generateHistoricalTimelineData.ts

import {
  historicalEventCategories,
  historicalEvents,
  parseDateString,
  type HistoricalEvent,
  type HistoricalEventCategory,
} from './historicalEvents';
import { localize, type Locale } from './i18n';
import { getGradientColor } from './colorUtils';

// ─── Timeline-item type for historical events ─────────────────────────────

export interface HistoricalTimelineItem {
  id: string;
  start: Date;
  end?: Date;
  content: string;
  group: string;
  /** Optional sub-group used to keep items (like civilizations) on separate rows when stacked */
  subGroup?: string;
  /** range: bar with defined end | point: diamond marker | ongoing: bar ending at today + gradient */
  type: 'range' | 'point' | 'ongoing';
  title: string;        // tooltip on hover
  className: string;    // for CSS styling
  style?: string;
  /** Original event data for the popup */
  _event: HistoricalEvent;
}

// ─── Generator ─────────────────────────────────────────────────────────────

const regionColors: Record<string, string> = {
  egypt: '#F59E0B',        // Gold/Amber
  mesopotamia: '#D97706',  // Dark Orange
  greece: '#3B82F6',       // Blue
  rome: '#EF4444',         // Red
  religion: '#8B5CF6',     // Purple
  europe: '#10B981',       // Emerald
  asia: '#EC4899',         // Pink
  america: '#14B8A6',      // Teal
  world: '#6B7280',        // Gray
};

/** Build a lookup of categories by id for quick access */
function buildCategoryMap(): Map<string, HistoricalEventCategory> {
  const map = new Map<string, HistoricalEventCategory>();
  for (const cat of historicalEventCategories) {
    map.set(cat.id, cat);
  }
  return map;
}

/**
 * Convert every entry in `historicalEvents` into a CanvasTimeline item.
 * Items with an `endDate` become "range" bars; those without become "point" markers.
 */
export function generateHistoricalTimelineData(locale: Locale = 'en'): HistoricalTimelineItem[] {
  const categoryMap = buildCategoryMap();
  const items: HistoricalTimelineItem[] = [];

  // Pre-compute chronological cycle indexes per category
  const categoryCounters = new Map<string, number>();
  const cycleIndices = new Map<string, number>();

  const validEvents = historicalEvents.map(event => {
    const time = (event.startDate || event.endDate) ? parseDateString((event.startDate || event.endDate)!).getTime() : 0;
    return { event, time };
  }).filter(e => e.time !== 0).sort((a, b) => a.time - b.time);

  for (const { event } of validEvents) {
    const cycleKey = event.regionId ? `${event.categoryId}-${event.regionId}` : event.categoryId;
    const count = categoryCounters.get(cycleKey) ?? 0;
    cycleIndices.set(event.id, count);
    categoryCounters.set(cycleKey, count + 1);
  }

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

    const cycleIdx = cycleIndices.get(event.id) ?? 0;
    const cycleKey = event.regionId ? `${event.categoryId}-${event.regionId}` : event.categoryId;
    const totalInCategory = categoryCounters.get(cycleKey) ?? 1;

    const baseColor = event.regionId && regionColors[event.regionId] ? regionColors[event.regionId] : category.color;
    const itemColor = getGradientColor(baseColor, cycleIdx, totalInCategory);

    const item: HistoricalTimelineItem = {
      id: `hist-${event.id}`,
      start: startDate,
      end: endDate,
      content: displayName,
      group: event.categoryId,
      subGroup: event.regionId,
      type: itemType,
      title: displayDesc,
      className: `hist-item hist-${event.categoryId} ${event.regionId ? 'hist-region-' + event.regionId : ''}`.trim(),
      style: itemType === 'point'
        ? `color: ${itemColor}; border-color: ${itemColor};`
        : `background-color: ${itemColor}; border-color: ${itemColor};`,
      _event: event,
    };

    items.push(item);
  }

  return items;
}
