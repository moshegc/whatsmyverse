// src/colorUtils.ts
//
// Preset palette colours for reading-schedule bands, derived from the app's
// design-token accent palette defined in index.css.

/** bg + accent pair per schedule id. */
const SCHEDULE_PALETTE: Record<string, { bg: string; accent: string }> = {
    'Psalms-Since-5708':  { bg: '#baaaff', accent: '#7C3AED' }, // prophets purple
    'Yearly-Torah-Verse': { bg: '#9cecc3', accent: '#059669' }, // books green
    'Hours-of-Adam':      { bg: '#f8e289', accent: '#D97706' }, // exile amber
    'Eons':               { bg: '#84b6f8', accent: '#2563EB' }, // figures blue
};

/** Fallback palette for any future schedule ids not yet mapped above. */
const FALLBACK_BG     = ['#FEE2E2', '#EDE9FE', '#D1FAE5', '#FEF3C7', '#DBEAFE'];
const FALLBACK_ACCENT = ['#DC2626', '#7C3AED', '#059669', '#D97706', '#2563EB'];

function fallbackIndex(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % FALLBACK_ACCENT.length;
}

/** Light background colour for band fills. */
export function getScheduleBgColor(id: string): string {
    return SCHEDULE_PALETTE[id]?.bg ?? FALLBACK_BG[fallbackIndex(id)];
}

/** Rich accent colour for icons, dots, and group labels. */
export function getScheduleAccentColor(id: string): string {
    return SCHEDULE_PALETTE[id]?.accent ?? FALLBACK_ACCENT[fallbackIndex(id)];
}

/**
 * @deprecated Use getScheduleAccentColor / getScheduleBgColor instead.
 * Kept for call-sites that just need a single representative colour.
 */
export function generateColorFromString(str: string): string {
    return getScheduleAccentColor(str);
}
