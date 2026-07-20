// src/config.ts

/**
 * The GitHub repository (owner/name) used for feedback links (issues & discussions).
 */
export const GITHUB_REPO = 'moshegc/whatsmyverse';

/**
 * Google Form URLs used as an account-free alternative to GitHub for feedback.
 * Leave a URL as an empty string until the corresponding form has been created;
 * the feedback menu hides the "Form" link for any entry that isn't filled in.
 */
export const GOOGLE_FORMS = {
  bugReport: {
    en: 'https://forms.gle/Dh1qcj2H13Rh25Sp9',
    he: 'https://forms.gle/vGhLmQk4hX8fhwcJA',
  },
  dataFix: {
    en: 'https://forms.gle/g5PvJxYaV7oQVup39',
    he: 'https://forms.gle/gNQHpoBjKsxAj3wV9',
  },
  suggestion: {
    en: 'https://forms.gle/Zg12RCDcGarkhxD58',
    he: 'https://forms.gle/CECqnCiJCqrTFKSr5',
  },
};

/**
 * Defines the structure for a single reading schedule.
 */
export interface ReadingSchedule {
  // A unique identifier for the schedule
  id: string;
  // A user-friendly name, e.g., "Annual Torah Portion"
  name: string;
  // Hebrew name for the schedule (used when locale is 'he')
  nameHe?: string;
  // A brief description of the schedule
  description: string;
  // Hebrew description (used when locale is 'he')
  descriptionHe?: string;
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
    nameHe: 'תהלים שנתיים מאז תש"ח',
    description: 'Yearly Psalms since the establishment of the State of Israel in 5708',
    descriptionHe: 'תהלים שנתיים מאז הקמת מדינת ישראל בשנת תש"ח',
    csvFiles: ['/data/verses/Psalms.csv'],
    displayMode: 'chapter',
    startDate: '5 Iyar 5708', // Corresponds to Rosh Hashanah 5785
    periodInYears: 1
  },
  {
    id: 'Yearly-Torah-Verse',
    name: 'Torah verse since creation',
    nameHe: 'פסוק תורה מבריאת העולם',
    description: 'Single verse of Torah per year since creation',
    descriptionHe: 'פסוק אחד מהתורה לכל שנה מבריאת העולם',
    csvFiles: ['/data/verses/Genesis.csv', '/data/verses/Exodus.csv', '/data/verses/Leviticus.csv', '/data/verses/Numbers.csv', '/data/verses/Deuteronomy.csv', '/data/verses/Joshua.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 1', // Corresponds to the first Shabbat after Simchat Torah 5785
    periodInYears: 1
  },
  {
    id: 'Hours-of-Adam',
    name: 'Hours of Adams creation',
    nameHe: 'שעות בריאת אדם הראשון',
    description: 'Hours of Adams creation based on the Midrash Pirkei deRabbi Eliezer, starting from the second half of the fifth millennium since creation',
    descriptionHe: 'שעות בריאת אדם הראשון על פי מדרש פרקי דרבי אליעזר, החל מהמחצית השניה של האלף החמישי לבריאת העולם',
    csvFiles: ['/data/verses/Adam.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 5500',
    periodInYears: 500/12
  },
  {
    id: 'Eons',
    name: 'Eons since creation',
    nameHe: 'עתים (עידנים) מבריאת העולם',
    description: '28 Eons since creation. Each Eon is 6000/28 years',
    descriptionHe: '28 עתים (עידנים) על פי ספר קהלת מסודרים מבריאת העולם. כל עת הוא 6000/28 שנים',
    csvFiles: ['/data/verses/Eons.csv'],
    displayMode: 'verse',
    startDate: '1 Tishrei 1',
    periodInYears: 6000/28
  }
  // Add other configurations here
];
