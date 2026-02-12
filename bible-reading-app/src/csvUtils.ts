// src/csvUtils.ts

import Papa from 'papaparse';

export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

const csvDataCache = new Map<string, BibleVerse[]>();

export async function getCsvData(filePath: string): Promise<BibleVerse[]> {
    if (csvDataCache.has(filePath)) {
        return csvDataCache.get(filePath)!;
    }

    const response = await fetch(filePath);
    const csvText = await response.text();

    return new Promise(resolve => {
        Papa.parse<any>(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data.map((row: string[]) => {
                    const [chapter, verse] = (row[1] || '0:0').split(':');
                    return {
                        book: row[0],
                        chapter: parseInt(chapter, 10),
                        verse: parseInt(verse, 10),
                        text: row[2],
                    };
                }) as BibleVerse[];
                csvDataCache.set(filePath, data);
                resolve(data);
            },
        });
    });
}