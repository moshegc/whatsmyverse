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

/**
 * Generate a shade of a base hex color to create a gradient across all items.
 */
export function getGradientColor(hex: string, index: number, total: number): string {
  if (hex.length < 7 || total <= 1) return hex;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  const offset = -0.20 + (0.15 * (index / (total - 1)));
  l = Math.max(0, Math.min(1, l + offset));

  let rOut, gOut, bOut;
  if (s === 0) {
    rOut = gOut = bOut = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rOut = hue2rgb(p, q, h + 1 / 3);
    gOut = hue2rgb(p, q, h);
    bOut = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hexStr = Math.round(c * 255).toString(16);
    return hexStr.length === 1 ? '0' + hexStr : hexStr;
  };

  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`;
}
