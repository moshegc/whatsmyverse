// src/infoContent.ts
//
// Single source of truth for all bilingual (EN / HE) informational text
// shown in the welcome overlay, section info cards, and series info cards.
// To update or translate content, edit only this file.

import type { Locale } from './i18n';

// ── Types ────────────────────────────────────────────────────────────────────

interface BilingualText {
  en: string;
  he: string;
}

interface SeriesInfoEntry {
  title: BilingualText;
  description: BilingualText;
}

interface SectionInfoEntry {
  title: BilingualText;
  description: BilingualText;
}

interface WelcomeContent {
  title: BilingualText;
  body: BilingualText;
  cta: BilingualText;
}

interface HelpContent {
  title: BilingualText;
  body_desktop: BilingualText;
  body_mobile: BilingualText;
}

interface AboutContent {
  title: BilingualText;
  body: BilingualText;
}

// ── Welcome overlay ──────────────────────────────────────────────────────────

export const welcomeContent: WelcomeContent = {
  title: {
    en: 'Hebrew History',
    he: 'היסטוריה עברית',
  },
  body: {
    en: 'Explore **6,000 years of Hebrew history** on a single interactive timeline.\n\nScroll and zoom to navigate time. Historical figures, major events, and scripture periods are shown as visual tracks. Singular events are shown as diamond markers.\n\n On the bottom, Bible verses are mapped to the years they correspond to based on several traditions.',
    he: 'גלה **6,000 שנות היסטוריה עברית** על ציר זמן אינטראקטיבי אחד.\n\nגלול וזום כדי לנווט בזמן. דמויות מקראיות, אירועים מרכזיים ותקופות ספרים מוצגים כפסי זמן. אירועים נקודתיים מוצגים כמעויינים. \n\n\nפסוקי תורה ולוחות קריאה ממופים לשנים המתאימות להם לפי מסורות שונות.',
  },
  cta: {
    en: 'Get started',
    he: 'בואו נתחיל',
  },
};

// ── Section info ─────────────────────────────────────────────────────────────

export const sectionInfo: Record<'history' | 'verses', SectionInfoEntry> = {
  history: {
    title: {
      en: 'History',
      he: 'היסטוריה',
    },
    description: {
      en: 'The **History** section shows events and people from Hebrew history spanning from Creation to the present day.\n\nEach track represents a different category:\n- **Biblical Figures** — lifespans of people in the Torah and Tanakh\n- **Major Events** — pivotal moments marked as point events\n- **Bible Book Periods** — the historical period covered by each book\n- **Exiles & Expulsions** — displacement of the Jewish people\n- **Pogroms & Persecutions** — documented episodes of violence\n\nClick any item on the timeline for details. Use the series panel to show or hide individual categories.',
      he: 'פרק **ההיסטוריה** מציג אירועים ואנשים מן ההיסטוריה העברית מבריאת העולם ועד ימינו.\n\nכל פס מייצג קטגוריה שונה:\n- **דמויות מקראיות** — שנות חיי אנשים בתורה ובתנ"ך\n- **אירועים מרכזיים** — רגעי מפתח כסימני נקודה\n- **תקופות ספרי התנ"ך** — התקופה ההיסטורית שמכסה כל ספר\n- **גלויות וגירושים** — עקירת העם היהודי\n- **פוגרומים ורדיפות** — אפיזודות מתועדות של אלימות\n\nלחץ על פריט כלשהו בציר הזמן לפרטים. השתמש בלוח הסדרות כדי להציג או להסתיר קטגוריות.',
    },
  },
  verses: {
    title: {
      en: 'Verses',
      he: 'פסוקים',
    },
    description: {
      en: 'The **Verses** section maps Torah readings and psalms to specific years in history.\n\nEach track represents a different reading schedule:\n- **Torah verse since creation** — one verse per year across all of Torah\n- **Yearly Psalms since 5708** — annual Psalm cycles since Israel\'s founding\n- **Hours of Adam** — the 12 hours of Adam\'s first day mapped to history\n- **Eons** — 28 equal periods based on [Kohelet 3](https://www.sefaria.org/Kohelet.3)\n\nClick any item to see the verse text. Use the series panel to show or hide individual schedules.',
      he: 'פרק **הפסוקים** ממפה קריאות תורה ותהלים לשנים ספציפיות בהיסטוריה.\n\nכל פס מייצג לוח קריאה שונה:\n- **פסוק תורה מבריאת העולם** — פסוק אחד לשנה על פני כל התורה\n- **תהלים שנתיים מאז תש"ח** — מחזורי תהלים שנתיים מהקמת המדינה\n- **שעות בריאת אדם** — 12 שעות יומו הראשון של אדם ממופות להיסטוריה\n- **עתים** — 28 תקופות שוות על פי [קהלת ג](https://www.sefaria.org/Kohelet.3)\n\nלחץ על פריט כלשהו לראות את טקסט הפסוק. השתמש בלוח הסדרות כדי להציג או להסתיר לוחות קריאה.',
    },
  },
};

// ── Series info ───────────────────────────────────────────────────────────────

export const seriesInfo: Record<string, SeriesInfoEntry> = {
  // ── Historical categories ──────────────────────────────────────────────────
  'biblical-figures': {
    title: {
      en: 'Biblical Figures',
      he: 'דמויות מקראיות',
    },
    description: {
      en: 'Shows the **lifespans** of major biblical figures from Adam to the last of the prophets, based on the ages recorded in the [Torah and Tanakh](https://www.sefaria.org).\n\nEach bar spans from birth to death. Overlapping lifetimes are stacked into multiple rows so all figures remain visible. Click any bar for more details.',
      he: 'מציג את **שנות חיי** הדמויות המקראיות המרכזיות מאדם הראשון ועד אחרוני הנביאים, על פי הגילאים הרשומים ב[תורה ובתנ"ך](https://www.sefaria.org).\n\nכל פס מתפרש מלידה עד מוות. חיי אדם חופפים נערמים בשורות מרובות כדי שכל הדמויות יישארו גלויות. לחץ על כל פס לפרטים נוספים.',
    },
  },
  'major-events': {
    title: {
      en: 'Major Events',
      he: 'אירועים מרכזיים',
    },
    description: {
      en: 'Marks pivotal moments in Hebrew history — the Exodus, the giving of the Torah at Sinai, the building and destruction of the Temples, and other milestones.\n\nEach **diamond marker** represents a point event. Click any marker for the date and description.',
      he: 'מסמן רגעי מפתח בהיסטוריה העברית — יציאת מצרים, מתן תורה בסיני, בניית המקדשות וחורבנם, ואבני דרך נוספות.\n\nכל **סימן יהלום** מייצג אירוע נקודתי. לחץ על כל סימן לתאריך ותיאור.',
    },
  },
  'bible-books': {
    title: {
      en: 'Bible Book Periods',
      he: 'תקופות ספרי התנ״ך',
    },
    description: {
      en: 'Shows the **historical period covered** by each book of the [Tanakh](https://www.sefaria.org) — from Genesis (Creation) through the books of the Prophets and Writings.\n\nEach bar spans the time period *narrated* by that book, not the date it was written. Click any bar for details.',
      he: 'מציג את **התקופה ההיסטורית שמכסה** כל ספר מספרי ה[תנ"ך](https://www.sefaria.org) — מבראשית (בריאת העולם) ועד ספרי הנביאים והכתובים.\n\nכל פס מתפרש על פני התקופה *המסופרת* בספר, ולא על תאריך כתיבתו. לחץ על כל פס לפרטים.',
    },
  },
  'jewish-exiles': {
    title: {
      en: 'Exiles & Expulsions',
      he: 'גלויות וגירושים',
    },
    description: {
      en: 'Traces the major **exiles and expulsions** of the Jewish people throughout history — from the Babylonian exile through the Roman exile, medieval expulsions such as the [1492 expulsion from Spain](https://en.wikipedia.org/wiki/Alhambra_Decree), and into the modern era.\n\nBars show the duration of each exile or displacement. Click any bar for details.',
      he: 'עוקב אחר **הגלויות והגירושים** המרכזיים של העם היהודי לאורך ההיסטוריה — מן הגלות הבבלית, דרך הגלות הרומית, גירושי ימי הביניים כגון [גירוש ספרד ב-1492](https://he.wikipedia.org/wiki/גירוש_ספרד), ועד לעידן המודרני.\n\nהפסים מציגים את משך כל גלות או עקירה. לחץ על כל פס לפרטים.',
    },
  },
  'jewish-pogroms': {
    title: {
      en: 'Pogroms & Persecutions',
      he: 'פוגרומים ורדיפות',
    },
    description: {
      en: 'Documents major **pogroms and organized persecutions** of the Jewish people across the centuries, from medieval violence through the [Holocaust](https://en.wikipedia.org/wiki/The_Holocaust) and beyond.\n\nEach entry represents a documented episode. Click any item for details.',
      he: 'מתעד **פוגרומים ורדיפות מאורגנות** של העם היהודי לאורך הדורות, מאלימות ימי הביניים דרך ה[שואה](https://he.wikipedia.org/wiki/שואה) ומעבר לה.\n\nכל רשומה מייצגת אפיזודה מתועדת. לחץ על כל פריט לפרטים.',
    },
  },
  'global-events': {
    title: {
      en: 'Global Events',
      he: 'אירועים עולמיים',
    },
    description: {
      en: 'Highlights major historical events from world history to provide context alongside Hebrew history. Includes the rise and fall of empires, major wars, and global milestones.\n\nClick any entry for details on the global context.',
      he: 'מדגיש אירועים היסטוריים מרכזיים מהיסטוריית העולם כדי לספק הקשר לצד ההיסטוריה העברית. כולל את עלייתן ונפילתן של אימפריות, מלחמות גדולות ואבני דרך עולמיות.\n\nלחץ על כל רשומה לפרטים על ההקשר העולמי.',
    },
  },
  'land-of-israel': {
    title: {
      en: 'Land of Israel',
      he: 'ארץ ישראל',
    },
    description: {
      en: 'Traces the historical periods and ruling powers over the **Land of Israel** through the centuries, from the biblical era and various conquests to the modern State of Israel.\n\nBars show the duration of each era. Click any bar for details.',
      he: 'עוקב אחר התקופות ההיסטוריות והמעצמות השולטות ב**ארץ ישראל** לאורך מאות השנים, מהתקופה המקראית וכיבושים שונים ועד למדינת ישראל המודרנית.\n\nהפסים מציגים את משך כל תקופה. לחץ על כל פס לפרטים.',
    },
  },

  // ── Reading schedules ──────────────────────────────────────────────────────
  'Psalms-Since-5708': {
    title: {
      en: 'Yearly Psalms since 5708',
      he: 'תהלים שנתיים מאז תש"ח',
    },
    description: {
      en: 'Maps a **yearly cycle of [Psalms](https://www.sefaria.org/Psalms)** to each year since the establishment of the State of Israel in **5708 (1948)**.\n\nEach year corresponds to one complete reading of the 150 chapters of Psalms. Click any item to see which psalm chapter aligns with that year in history.',
      he: 'ממפה **מחזור שנתי של [תהלים](https://www.sefaria.org/Psalms)** לכל שנה מאז הקמת מדינת ישראל בשנת **תש"ח (1948)**.\n\nכל שנה מתאימה לקריאה מלאה אחת של 150 פרקי התהלים. לחץ על כל פריט כדי לראות איזה פרק תהלים מתאים לאותה שנה בהיסטוריה.',
    },
  },
  'Yearly-Torah-Verse': {
    title: {
      en: 'Torah verse since creation',
      he: 'פסוק תורה מבריאת העולם',
    },
    description: {
      en: 'Assigns **one verse of the Torah** to every year since Creation (year 1).\n\nStarting from [Genesis 1:1](https://www.sefaria.org/Genesis.1.1) and proceeding through all five books of Moses into Joshua, each year in history is paired with a single verse. Click any item to read that verse.',
      he: 'מייחס **פסוק אחד מן התורה** לכל שנה מבריאת העולם (שנה א\').\n\nהחל מ[בראשית א:א](https://www.sefaria.org/Genesis.1.1) ועד סוף חמשת חומשי תורה ויהושע, כל שנה בהיסטוריה משויכת לפסוק אחד. לחץ על כל פריט לקרוא את הפסוק.',
    },
  },
  'Hours-of-Adam': {
    title: {
      en: 'Hours of Adam\'s creation',
      he: 'שעות בריאת אדם הראשון',
    },
    description: {
      en: 'Based on [Pirkei deRabbi Eliezer](https://en.wikipedia.org/wiki/Pirkei_De-Rabbi_Eliezer), Adam\'s first day was divided into **12 hours** of significant events. This schedule maps those hours to the second half of the fifth millennium (years **5500–6000**).\n\nEach "hour" spans roughly 41.7 years. Click any item to see the corresponding verse.',
      he: 'על פי [פרקי דרבי אליעזר](https://he.wikipedia.org/wiki/פרקי_דרבי_אליעזר), יומו הראשון של אדם חולק ל-**12 שעות** של אירועים משמעותיים. לוח זמנים זה ממפה את אותן שעות למחצית השניה של האלף החמישי (שנים **5500–6000**).\n\nכל "שעה" מתפרשת על כ-41.7 שנים. לחץ על כל פריט לראות את הפסוק המתאים.',
    },
  },
  'Eons': {
    title: {
      en: 'Eons since creation',
      he: 'עתים (עידנים) מבריאת העולם',
    },
    description: {
      en: 'Divides the 6,000 years of history into **28 equal Eons**, based on the 28 "times" described in [Ecclesiastes 3](https://www.sefaria.org/Kohelet.3) — *"A time to be born, a time to die…"*\n\nEach Eon spans approximately **214 years** (6000 ÷ 28). Click any item to see the corresponding verse.',
      he: 'מחלק את 6,000 שנות ההיסטוריה ל-**28 עתים שווים**, על פי ה-28 "עתים" המוזכרים ב[קהלת ג](https://www.sefaria.org/Kohelet.3) — *"עת ללדת ועת למות…"*\n\nכל עת מתפרשת על כ-**214 שנים** (6000 ÷ 28). לחץ על כל פריט לראות את הפסוק המתאים.',
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSeriesInfo(
  id: string,
  locale: Locale,
): { title: string; description: string } {
  const entry = seriesInfo[id];
  if (!entry) return { title: id, description: '' };
  return {
    title: entry.title[locale],
    description: entry.description[locale],
  };
}

export function getSectionInfo(
  section: 'history' | 'verses',
  locale: Locale,
): { title: string; description: string } {
  const entry = sectionInfo[section];
  return {
    title: entry.title[locale],
    description: entry.description[locale],
  };
}

export function getWelcomeContent(locale: Locale): {
  title: string;
  body: string;
  cta: string;
} {
  return {
    title: welcomeContent.title[locale],
    body: welcomeContent.body[locale],
    cta: welcomeContent.cta[locale],
  };
}

// ── Help content ──────────────────────────────────────────────────────────────

export const helpContent: HelpContent = {
  title: {
    en: 'How to use',
    he: 'כיצד להשתמש',
  },
  body_desktop: {
    en: '**Click and drag** left or right to move through time. Use the **mouse wheel** (or two-finger trackpad scroll) to zoom in and out.\n\n**Click** any bar or diamond marker to open a detail card for that event or figure.\n\nUse the **sidebar** on the left to show or hide category names. **Click** on any category name for a description.',
    he: '**גרור** שמאלה או ימינה כדי לנוע בזמן. השתמש ב**גלגלת העכבר** (או בגלילה דו-אצבעית) כדי להתקרב ולהתרחק.\n\n**לחץ** על כל פס או מעוין כדי לפתוח כרטיס פרטים על אותו אירוע או דמות.\n\nהשתמש ב**סרגל הצד** כדי להציג או להסתיר שמות קטגוריות. **לחץ** על שם קטגוריה לתיאור.',
  },
  body_mobile: {
    en: '**Swipe** left or right to move through time. Use a **pinch gesture** to zoom in and out.\n\n**Tap** any bar or diamond marker to open a detail card for that event or figure.\n\nTap the **☰ menu** button to open the sidebar, where you can show or hide category names. **Tap** on any category name for a description.',
    he: '**החלק** שמאלה או ימינה כדי לנוע בזמן. השתמש ב**תנועת צביטה** כדי להתקרב ולהתרחק.\n\n**הקש** על כל פס או מעוין כדי לפתוח כרטיס פרטים על אותו אירוע או דמות.\n\nהקש על כפתור **תפריט ☰** כדי לפתוח את סרגל הצד, שם תוכל להציג או להסתיר שמות קטגוריות. **הקש** על שם קטגוריה לתיאור.',
  },
};

// ── About / copyright content ─────────────────────────────────────────────────

export const aboutContent: AboutContent = {
  title: {
    en: 'About',
    he: 'אודות',
  },
  body: {
    en: '**Hebrew History Timeline**\n\nAn interactive timeline spanning 6,000 years of Hebrew history.\n\n[View source on GitHub](https://github.com/moshegc/whatsmyverse) · © 2026 Moshe Goren\n\n---\n\n**Attributions**\n\nHebrew date calculations powered by [HebCal](https://www.hebcal.com/). [@hebcal/core](https://github.com/hebcal/hebcal-es6) is licensed under the [GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html).\n\nBible text from [Sefaria](https://www.sefaria.org/).',
    he: '**ציר הזמן העברי**\n\nציר זמן אינטראקטיבי המשתרע על 6,000 שנות היסטוריה עברית.\n\n© 2026 משה גורן · [קוד מקור ב-GitHub](https://github.com/moshegc/whatsmyverse)\n\n---\n\n**קרדיטים**\n\nחישובי תאריך עברי מופעלים על ידי [HebCal](https://www.hebcal.com/). [@hebcal/core](https://github.com/hebcal/hebcal-es6) מורשה תחת [GNU GPL v2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html).\n\nטקסט מקרא מ-[ספריא](https://www.sefaria.org/).',
  },
};

export function getHelpContent(
  locale: Locale,
  isMobile: boolean,
): { title: string; body: string } {
  return {
    title: helpContent.title[locale],
    body: isMobile ? helpContent.body_mobile[locale] : helpContent.body_desktop[locale],
  };
}

export function getAboutContent(locale: Locale): { title: string; body: string } {
  return {
    title: aboutContent.title[locale],
    body: aboutContent.body[locale],
  };
}
