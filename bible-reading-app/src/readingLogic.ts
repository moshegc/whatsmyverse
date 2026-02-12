// src/readingLogic.ts

import { type ReadingSchedule } from './config';
import { type ReadingMapEntry } from './generateReadingMap';
import { findLast } from 'lodash';
import { getCsvData, type BibleVerse } from './csvUtils';

type ReadingMap = Record<string, ReadingMapEntry[]>;

let readingMapCache: ReadingMap | null = null;

/**
 * Fetches and caches the reading map.
 */
async function getReadingMap(): Promise<ReadingMap> {
  if (readingMapCache) {
    return readingMapCache;
  }
  const response = await fetch('/data/reading-map.json');
  const map = await response.json();
  readingMapCache = map;
  return map;
}

/**
 * The main logic engine to get the reading for a given date and schedule.
 * @param schedule The configuration for the reading schedule.
 * @param targetDate The date for which to find the reading.
 * @returns The verses for the calculated reading period, or null if not found.
 */
export async function getReadingForDate(schedule: ReadingSchedule, targetDate: Date): Promise<BibleVerse[] | null> {
  const readingMap = await getReadingMap();
  const scheduleReadings = readingMap[schedule.id];

  if (!scheduleReadings) {
    return null;
  }

  const targetDateString = targetDate.toISOString().split('T')[0];

  const currentReadingEntry = findLast(scheduleReadings, entry => entry.startDate <= targetDateString);

  if (!currentReadingEntry) {
    return null;
  }

  const { pointer } = currentReadingEntry;
  const allVerses = await getCsvData(pointer.filePath);

  if (schedule.displayMode === 'chapter') {
    return allVerses.filter(
      v => v.book === pointer.book && v.chapter === pointer.chapter
    );
  } else { // 'verse' mode, pointer.verse should be defined
    const verse = allVerses.find(v => v.book === pointer.book && v.chapter === pointer.chapter && v.verse === pointer.verse);
    return verse ? [verse] : null;
  }
}
