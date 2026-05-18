// src/i18n.ts

import { HDate } from '@hebcal/core';
import { gematriya } from '@hebcal/hdate';

export type Locale = 'en' | 'he';

// ─── Gematriya helpers ──────────────────────────────────────────────────────

/**
 * Like `gematriya(year)` but re-adds the "ה׳" thousands prefix for years
 * 5000–5999. The underlying library omits it by convention; we want it back.
 */
export function gematriyaYear(year: number): string {
  const base = gematriya(year);
  if (year >= 5000 && year < 6000) {
    return '\u05D4\u05F3' + base; // ה׳ + result
  }
  return base;
}

// ─── Book name mapping ──────────────────────────────────────────────────────

const bookNamesHe: Record<string, string> = {
  Genesis: 'בראשית',
  Exodus: 'שמות',
  Leviticus: 'ויקרא',
  Numbers: 'במדבר',
  Deuteronomy: 'דברים',
  Joshua: 'יהושע',
  Psalms: 'תהלים',
  Judges: 'שופטים',
  Samuel: 'שמואל',
  Kings: 'מלכים',
  Adam: 'אדם',
  Eons: 'עתים',
};

/**
 * Returns the book name in the requested locale.
 * Falls back to the English name if no Hebrew mapping exists.
 */
export function getBookName(englishName: string, locale: Locale): string {
  if (locale === 'he') {
    return bookNamesHe[englishName] || englishName;
  }
  return englishName;
}

// ─── Localized name helper ──────────────────────────────────────────────────

/**
 * Pick the Hebrew variant when locale is 'he' and the field is available,
 * otherwise fall back to the English variant.
 */
export function localize(
  name: string,
  nameHe: string | undefined,
  locale: Locale,
): string {
  if (locale === 'he' && nameHe) {
    return nameHe;
  }
  return name;
}

// ─── Date rendering ─────────────────────────────────────────────────────────

/**
 * Render an HDate in the appropriate locale.
 * Hebrew uses gematriya numerals; English uses the default render.
 */
export function renderHDate(date: Date, locale: Locale): string {
  const hdate = new HDate(date);
  if (locale === 'he') {
    return `${hdate.renderGematriya()} (${hdate.getFullYear()})`;
  }
  return hdate.render();
}

// ─── UI strings ─────────────────────────────────────────────────────────────

const uiStrings: Record<string, Record<Locale, string>> = {
  appTitle: { en: 'Hebrew History', he: 'היסטוריה עברית' },
  localeToggle: { en: 'עב', he: 'EN' },
  eras: { en: 'Eras', he: 'תקופות' },
  noErasSelected: { en: 'No eras selected', he: 'לא נבחרו תקופות' },
  close: { en: 'Close', he: 'סגור' },
};

/**
 * Translate a UI string key to the current locale.
 */
export function t(key: string, locale: Locale): string {
  return uiStrings[key]?.[locale] || key;
}
