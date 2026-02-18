// src/config.ts

/**
 * Defines the structure for a single reading schedule.
 */
export interface ReadingSchedule {
  // A unique identifier for the schedule
  id: string;
  // A user-friendly name, e.g., "Annual Torah Portion"
  name: string;
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
    id: 'daily-psalm',
    name: 'Daily Psalm Reading',
    csvFiles: ['/data/Psalms.csv'],
    displayMode: 'chapter',
    startDate: '5 Iyar 5708', // Corresponds to Rosh Hashanah 5785
    periodInYears: 1
  },
  {
    id: 'weekly-torah',
    name: 'Weekly Torah Portion',
    csvFiles: ['/data/Genesis.csv', '/data/Exodus.csv', '/data/Leviticus.csv', '/data/Numbers.csv', '/data/Deuteronomy.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 1', // Corresponds to the first Shabbat after Simchat Torah 5785
    periodInYears: 1
  },
  // Add other configurations here
];
