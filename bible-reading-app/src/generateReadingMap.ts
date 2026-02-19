// src/generateReadingMap.ts
//import { resolve } from 'path';
import { schedules } from './config';
import { getCsvData, type BibleVerse } from './csvUtils';


export interface ReadingMapEntry {
    verses: BibleVerse[];
}

export function generateReadingMap() : Record<string, ReadingMapEntry[]> {
    const readingMap: Record<string, ReadingMapEntry[]> = {};

    for (const schedule of schedules) {
        readingMap[schedule.id] = [];
        const allVerses: BibleVerse[] = [];
        for (const filePath of schedule.csvFiles) {
            const verses = getCsvData(filePath);            
            allVerses.push(...verses);
        }
        
        if (schedule.displayMode === 'chapter') {
            const chaptersMap = new Map<string, BibleVerse[]>();
            for (const v of allVerses) {
                const key = `${v.book}-${v.chapter}`;
                if (!chaptersMap.has(key)) {
                    chaptersMap.set(key, []);
                }
                chaptersMap.get(key)!.push(v);
            }
            readingMap[schedule.id] = Array.from(chaptersMap.values()).map(verses => ({
                verses,
            }));
        } else {
            readingMap[schedule.id] = allVerses.map(verse => ({
                verses: [verse],
            }));
        }
        
    }  

    return readingMap;
}