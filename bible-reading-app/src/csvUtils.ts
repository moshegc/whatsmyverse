// src/csvUtils.ts

import Papa from 'papaparse';

export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

const bookCache = new Map<string, BibleVerse[]>();

export async function getCsvData(filePath: string, bookName?: string): Promise<BibleVerse[]> {
    if (bookName && bookCache.has(bookName)) {
        return bookCache.get(bookName)!;
    }

    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch CSV file: ${filePath} (Status: ${response.status})`);
    }
    const csvText = await response.text();

    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.trim().startsWith('<html')) {
        throw new Error(`Failed to fetch CSV file: ${filePath}. The server returned HTML instead of CSV. This usually means the file was not found.`);
    }

    return new Promise(resolve => {
        Papa.parse<any>(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const allVerses: BibleVerse[] = [];
                const fileBooks = new Map<string, BibleVerse[]>();

                results.data.forEach((row: string[]) => {
                    const [chapter, verse] = (row[1] || '0:0').split(':');
                    const verseObj: BibleVerse = {
                        book: row[0],
                        chapter: parseInt(chapter, 10),
                        verse: parseInt(verse, 10),
                        text: row[2],
                    };
                    allVerses.push(verseObj);

                    if (!fileBooks.has(verseObj.book)) {
                        fileBooks.set(verseObj.book, []);
                    }
                    fileBooks.get(verseObj.book)!.push(verseObj);
                });

                for (const [book, verses] of fileBooks) {
                    bookCache.set(book, verses);
                }

                if (bookName) {
                    resolve(bookCache.get(bookName) || []);
                } else {
                    resolve(allVerses);
                }
            },
        });
    });
}