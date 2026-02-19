// src/readingLogic.ts

import { type ReadingSchedule } from './config';
import { type BibleVerse } from './csvUtils';
import { HDate } from '@hebcal/core';
import { generateReadingMap, type ReadingMapEntry } from './generateReadingMap';

type ReadingMap = Record<string, ReadingMapEntry[]>;

let readingMapCache: ReadingMap | null = null;

/**
 * Fetches and caches the reading map.
 */
function getReadingMap(): ReadingMap {
  if (readingMapCache) {
    return readingMapCache;
  }  
  readingMapCache = generateReadingMap();
  return readingMapCache;
}

function HDateFromString(dateString: string) {
    const parts = dateString.split(' ');
    return new HDate(parseInt(parts[0]), parts[1], parseInt(parts[2]));
}

function getCurrentReadingEntry(schedule: ReadingSchedule, targetHDate: HDate) {
    const scheduleStartHDate = HDateFromString(schedule.startDate);
    if (targetHDate.deltaDays(scheduleStartHDate) < 0) {
        return null; // No reading before the schedule starts
    }

    let map = getReadingMap();

    if (Math.floor(schedule.periodInYears) === (schedule.periodInYears)) {
        let yearsElapsed = targetHDate.getFullYear() - scheduleStartHDate.getFullYear();
        const targetYearDate = new HDate(scheduleStartHDate.getDate(), scheduleStartHDate.getMonth(), targetHDate.getFullYear());
        if (targetHDate.deltaDays(targetYearDate) < 0) {
            yearsElapsed -= 1; // If we haven't reached the anniversary date yet, subtract one year
        }
        const periodsElapsed = Math.floor(yearsElapsed / schedule.periodInYears);
        return map[schedule.id][periodsElapsed - 1];                
    }
    else {
        const yearsElapsed = targetHDate.getFullYear() - scheduleStartHDate.getFullYear();
        const targetRoshHashanahDate = new HDate(1, 7, targetHDate.getFullYear()); // 1 Tishrei of the target year
        const daysElapsed = targetHDate.deltaDays(targetRoshHashanahDate);
        const targetYearFraction = daysElapsed / HDate.daysInYear(targetHDate.getFullYear());
        const totalYears = yearsElapsed + targetYearFraction;
        const periodsElapsed = totalYears / schedule.periodInYears;
        return map[schedule.id][Math.floor(periodsElapsed) - 1];        
    }
  }


/**
 * The main logic engine to get the reading for a given date and schedule.
 * @param schedule The configuration for the reading schedule.
 * @param targetDate The date for which to find the reading.
 * @returns The verses for the calculated reading period, or null if not found.
 */
export function getReadingForDate(schedule: ReadingSchedule, targetDate: Date): BibleVerse[] | null {  
 
  const targetHDate = new HDate(targetDate);
  const currentReadingEntry = getCurrentReadingEntry(schedule, targetHDate);

  if (!currentReadingEntry) {
    return null;
  }

  return currentReadingEntry.verses;
}
