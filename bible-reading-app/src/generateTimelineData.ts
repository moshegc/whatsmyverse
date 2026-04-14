// src/generateTimelineData.ts

import { schedules, type ReadingSchedule } from './config';
import { generateReadingMap } from './generateReadingMap';
import { HDate, gematriya } from '@hebcal/core';
import { generateColorFromString } from './colorUtils';
import type { BibleVerse } from './csvUtils';
import { getBookName, type Locale } from './i18n';

export interface TimelineItem {
    id: string;
    start: Date;
    end: Date;
    content: string; // For now, just the name of the reading
    group: string;
    verses: BibleVerse[];
    scheduleId: string;
    style?: string;
}

function HDateFromString(dateString: string) {
    const parts = dateString.split(' ');
    return new HDate(parseInt(parts[0]), parts[1], parseInt(parts[2]));
}

function calculateStartDateForPeriod(schedule: ReadingSchedule, periodIndex: number): HDate {
    const scheduleStartHDate = HDateFromString(schedule.startDate);

    if (Math.floor(schedule.periodInYears) === schedule.periodInYears) {
        const yearsToAdd = periodIndex * schedule.periodInYears;
        return new HDate(scheduleStartHDate.getDate(), scheduleStartHDate.getMonth(), scheduleStartHDate.getFullYear() + yearsToAdd);
    } else {
        const totalYears = periodIndex * schedule.periodInYears;
        const yearsElapsed = Math.floor(totalYears);
        const yearFraction = totalYears - yearsElapsed;

        let targetYear = scheduleStartHDate.getFullYear() + yearsElapsed;
        const daysInTargetYear = HDate.daysInYear(targetYear);
        const daysToAdd = Math.floor(yearFraction * daysInTargetYear);

        if (periodIndex >= 1 && scheduleStartHDate.getFullYear() === 1) {
            targetYear -= 1; // Handle missing year 0 in the Hebrew calendar
        }
       
        const roshHashanahOfTargetYear = new HDate(1, 7, targetYear);
        return roshHashanahOfTargetYear.add(daysToAdd);
    }
}

function getNumber(num: number, locale: Locale): string {
    if (locale === 'he') {
        return gematriya(num);
    }
    return num.toString();
}

export function generateTimelineData(locale: Locale = 'en'): TimelineItem[] {
    const readingMap = generateReadingMap();
    const timelineItems: TimelineItem[] = [];

    for (const schedule of schedules) {
        const readingEntries = readingMap[schedule.id];
        const maxEntries = Math.min(6000, readingEntries.length);
        for (let i = 0; i < maxEntries; i++) {
            const entry = readingEntries[i];
            
            const startDate = calculateStartDateForPeriod(schedule, i);
            const nextStartDate = calculateStartDateForPeriod(schedule, i + 1);
            const endDate = nextStartDate;

            const verses = entry.verses;
            const book = getBookName(verses[0]?.book || 'Unknown', locale);
            const chapter = getNumber(verses[0]?.chapter || 0, locale);
            const verse_num = getNumber(verses[0]?.verse || 0, locale);
            const verse = verses[0]?.text || '';

            let content = `${book} ${chapter},${verse_num} - ${verse}`;
            if (schedule.displayMode === 'chapter') {
                content = `${book} ${chapter} - ${verse}`;
            }

            timelineItems.push({
                id: `${schedule.id}-${i}`,
                start: startDate.greg(),
                end: endDate.greg(),
                content: content,
                group: schedule.id,
                verses: entry.verses,
                scheduleId: schedule.id,
                style: `background-color: ${generateColorFromString(schedule.id)};`
            });

           
        }
    }

    return timelineItems;
}
