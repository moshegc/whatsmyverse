// src/generateTimelineData.ts

import { schedules, type ReadingSchedule } from './config';
import { generateReadingMap } from './generateReadingMap';
import { HDate } from '@hebcal/core';
import { generateColorFromString } from './colorUtils';
import type { BibleVerse } from './csvUtils';

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

        const targetYear = scheduleStartHDate.getFullYear() + yearsElapsed;
        const daysInTargetYear = HDate.daysInYear(targetYear);
        const daysToAdd = Math.floor(yearFraction * daysInTargetYear);

        const roshHashanahOfTargetYear = new HDate(1, 7, targetYear);
        return roshHashanahOfTargetYear.add(daysToAdd);
    }
}


export function generateTimelineData(): TimelineItem[] {
    const readingMap = generateReadingMap();
    const timelineItems: TimelineItem[] = [];

    for (const schedule of schedules) {
        const readingEntries = readingMap[schedule.id];

        for (let i = 0; i < readingEntries.length; i++) {
            const entry = readingEntries[i];
            
            const startDate = calculateStartDateForPeriod(schedule, i);
            const nextStartDate = calculateStartDateForPeriod(schedule, i + 1);
            const endDate = nextStartDate.prev();

            const verses = entry.verses;
            const book = verses[0]?.book || 'Unknown';
            const chapter = verses[0]?.chapter || 'N/A';
            const verse = verses[0]?.verse || 'N/A';

            timelineItems.push({
                id: `${schedule.id}-${i}`,
                start: startDate.greg(),
                end: endDate.greg(),
                content: `${book} ${chapter}:${verse}`,
                group: schedule.id,
                verses: entry.verses,
                scheduleId: schedule.id,
                style: `background-color: ${generateColorFromString(schedule.id)};`
            });
        }
    }

    return timelineItems;
}
