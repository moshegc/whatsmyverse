// src/generateReadingMap.ts
import { schedules } from './config';
import { getCsvData, type BibleVerse } from './csvUtils';


export interface ReadingMapEntry {
    verses: BibleVerse[];
}

export async function generateReadingMap() : Promise<Record<string, ReadingMapEntry[]>> {
    const readingMap: Record<string, ReadingMapEntry[]> = {};

    for (const schedule of schedules) {
        readingMap[schedule.id] = [];
        const allVerses: BibleVerse[] = [];
        for (const filePath of schedule.csvFiles) {
            const verses = await getCsvData(filePath);
            allVerses.push(...verses);
        }
        
        const readings = schedule.displayMode === 'chapter'
            ? [...new Map(allVerses.map(v => [`${v.book}-${v.chapter}`, v])).values()]
            : allVerses;

        readingMap[schedule.id] = readings.map(verse => ({
            verses: [verse],
        }));        
        
    }  

    return readingMap;
}