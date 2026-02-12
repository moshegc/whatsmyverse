// src/generateReadingMap.ts

import { HDate } from '@hebcal/core';
import { schedules } from './config';
import { getCsvData, type BibleVerse } from './csvUtils';

function HDateFromString(dateString: string) {
    const parts = dateString.split(' ');
    return new HDate(parseInt(parts[0]), parts[1], parseInt(parts[2]));
}

export interface ReadingPointer {
    filePath: string;
    book: string;
    chapter: number;
    verse?: number;
}

export interface ReadingMapEntry {
    startDate: string; // ISO date string
    pointer: ReadingPointer;
}

export async function generateReadingMap() {
    const readingMap: Record<string, ReadingMapEntry[]> = {};

    for (const schedule of schedules) {
        readingMap[schedule.id] = [];
        const allVerses: BibleVerse[] = [];
        for (const filePath of schedule.csvFiles) {
            const verses = await getCsvData(filePath);
            allVerses.push(...verses);
        }

        let currentDate = HDateFromString(schedule.startDate);
        const readings = schedule.displayMode === 'chapter'
            ? [...new Map(allVerses.map(v => [`${v.book}-${v.chapter}`, v])).values()]
            : allVerses;

        const totalReadings = readings.length;                
        

        for (let i = 0; i < totalReadings; i++) {
            const reading = readings[i % totalReadings];
            const pointer: ReadingPointer = {
                filePath: schedule.csvFiles.find(f => allVerses.find(v => v.book === reading.book && v.chapter === reading.chapter && v.verse === reading.verse)!.text === reading.text)!,
                book: reading.book,
                chapter: reading.chapter,
            };
            if (schedule.displayMode === 'verse') {
                pointer.verse = reading.verse;
            }

            readingMap[schedule.id].push({
                startDate: currentDate.greg().toISOString().split('T')[0],
                pointer,
            });

            currentDate = currentDate.add(Math.round(daysPerReading));
        }
    }

    const json = JSON.stringify(readingMap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reading-map.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Generated reading-map.json', readingMap);
}