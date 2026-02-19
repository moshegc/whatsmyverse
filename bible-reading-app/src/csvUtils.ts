// src/csvUtils.ts

import Papa from 'papaparse';

export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

const bookCache = new Map<string, BibleVerse[]>();

export function getCsvData(filePath: string): BibleVerse[] {
    const bookName = filePath.split('/').pop()?.split('.')[0]; // Extract book name from file path
    if (bookName && bookCache.has(bookName)) {
        return bookCache.get(bookName)!;
    }

    const request = new XMLHttpRequest();
    request.open('GET', filePath, false); // false makes the request synchronous
    request.send(null);

    if (request.status !== 200) {
        throw new Error(`Failed to fetch CSV file: ${filePath} (Status: ${request.status})`);
    }
    const csvText = request.responseText;

    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.trim().startsWith('<html')) {
        throw new Error(`Failed to fetch CSV file: ${filePath}. The server returned HTML instead of CSV. This usually means the file was not found.`);
    }

    const results = Papa.parse<any>(csvText, {
        header: false,
        skipEmptyLines: true,
    });

    const allVerses: BibleVerse[] = [];
    const fileBooks = new Map<string, BibleVerse[]>();

    if (results.data) {
        results.data.forEach((row: string[]) => {
            const [book, place]    = (row[0] || 'NaN 0:0').split(' ');
            const [chapter, verse] = (place || '0:0').split(':');
            const verseObj: BibleVerse = {
                book: book.trim(),
                chapter: parseInt(chapter, 10),
                verse: parseInt(verse, 10),
                text: row[1] || '',
            };
            allVerses.push(verseObj);

            if (!fileBooks.has(verseObj.book)) {
                fileBooks.set(verseObj.book, []);
            }
            fileBooks.get(verseObj.book)!.push(verseObj);
        });
    }

    for (const [book, verses] of fileBooks) {
        bookCache.set(book, verses);
    }

    if (bookName) {
        return bookCache.get(bookName) || [];
    } else {
        return allVerses;
    }
}