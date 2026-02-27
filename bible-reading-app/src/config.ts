// src/config.ts

/**
 * Defines the structure for a single reading schedule.
 */
export interface ReadingSchedule {
  // A unique identifier for the schedule
  id: string;
  // A user-friendly name, e.g., "Annual Torah Portion"
  name: string;
  // A brief description of the schedule
  description: string;
  // An array of paths to the CSV files, in the desired reading order
    csvFiles: string[];
  // Determines whether to display a single verse or a whole chapter
  displayMode: 'verse' | 'chapter';
  // The Hebrew date string when this schedule begins (e.g., "1 Tishrei 5785")
  startDate: string;
  // The duration of each reading period in years (as a fraction)
  periodInYears: number;
}

/**
 * An array containing all available reading schedules for the app.
 */
export const schedules: ReadingSchedule[] = [
  {
    id: 'Psalms-Since-5708',    
    name: 'Yearly Psalms since 5708',
    description: 'Yearly Psalms since the establishment of the State of Israel in 5708',
    csvFiles: ['/data/Psalms.csv'],
    displayMode: 'chapter',
    startDate: '5 Iyar 5708', // Corresponds to Rosh Hashanah 5785
    periodInYears: 1
  },
  {
    id: 'Yearly-Torah-Verse',
    name: 'Torah verse since creation',
    description: 'Single verse of Torah per year since creation',
    csvFiles: ['/data/Genesis.csv', '/data/Exodus.csv', '/data/Leviticus.csv', '/data/Numbers.csv', '/data/Deuteronomy.csv', '/data/Joshua.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 1', // Corresponds to the first Shabbat after Simchat Torah 5785
    periodInYears: 1
  },
  {
    id: 'Hours-of-Adam',
    name: 'Hours of Adams creation',
    description: 'Hours of Adams creation based on the Midrash Pirkei deRabbi Eliezer, starting from the second half of the fifth millennium since creation',
    csvFiles: ['/data/Adam.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 5500',
    periodInYears: 500/12
  },
  {
    id: 'Eons',
    name: 'Eons since creation',
    description: '28 Eons since creation. Each Eon is 6000/28 years',
    csvFiles: ['/data/Eons.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 1',
    periodInYears: 6000/28
  }
  // Add other configurations here
];
