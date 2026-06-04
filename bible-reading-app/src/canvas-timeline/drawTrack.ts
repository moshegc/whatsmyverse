// src/canvas-timeline/drawTrack.ts
//
// Draws a single track group onto the tracks canvas:
//   - Left shell column: group label
//   - Right area:        range bars and point markers for each item

import type { HebrewTimeScale } from './HebrewTimeScale';
import type { TrackLayout, AnyItem } from './types';

// ── Colour utilities ─────────────────────────────────────────────────────────

/**
 * Extract the first colour from an item's inline CSS `style` string.
 * Tries `background-color` first, then `color`, then returns `fallback`.
 */
function extractItemColor(style: string | undefined, fallback: string): string {
  if (!style) return fallback;
  const bgMatch = style.match(/background-color:\s*(#[0-9a-fA-F]{3,8})/);
  if (bgMatch) return bgMatch[1];
  // For point items the style uses plain `color:`
  const colorMatch = style.match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{3,8})/);
  if (colorMatch) return colorMatch[1];
  return fallback;
}

/** Return true if the hex colour is perceptually light (good for dark text). */
function isLightColor(hex: string): boolean {
  if (hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * Lighten a hex colour by adding `amount` (0–255) to each channel.
 * Used to highlight selected items.
 */
function lightenHex(hex: string, amount = 40): string {
  if (hex.length < 7) return hex;
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Rounded rect helper ──────────────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// ── Item rendering ───────────────────────────────────────────────────────────

const ITEM_V_MARGIN = 2; // px top + bottom inside the row
/** Width of the pixel-space gradient tail drawn past the present date on ongoing items. */
const ONGOING_EXTENSION_PX = 60;
function drawRangeItem(
  ctx: CanvasRenderingContext2D,
  scale: HebrewTimeScale,
  item: AnyItem,
  rowTop: number,
  rowHeight: number,
  isSelected: boolean,
  groupColor: string,
  hasOverlapOutline: boolean = false,
): void {
  const trackLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackRight = Math.max(scale.pxLeft, scale.pxRight);

  const startMs = item.start.getTime();
  const endMs = item.end ? item.end.getTime() : item.start.getTime();
  let [x1, x2] = scale.timeRangeToPxSpan(startMs, endMs);

  // Clamp to track area
  x1 = Math.max(trackLeft, x1);
  x2 = Math.min(trackRight, x2);

  const rawW = x2 - x1;
  if (rawW < 0) return; // fully outside viewport
  // Always render at least 1 px so items remain visible when zoomed far out
  const w = Math.max(1, rawW);

  // Overlapping shorter items get extra vertical inset so the longer item
  // behind them remains partially visible above and below.
  const vMargin = hasOverlapOutline ? ITEM_V_MARGIN + 3 : ITEM_V_MARGIN;
  const y = rowTop + vMargin;
  const h = rowHeight - vMargin * 2;
  const r = Math.min(3, h / 2);

  const baseColor = extractItemColor(item.style, groupColor);
  const fillColor = isSelected ? lightenHex(baseColor, 50) : baseColor;

  ctx.save();
  ctx.globalAlpha = isSelected ? 1.0 : 0.85;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  roundedRect(ctx, x1, y, w, h, r);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (hasOverlapOutline) {
    // Thin white outline so shorter overlapping items are visually separated
    // from the longer item drawn behind them.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Text label (only when there is enough room)
  if (w >= 20) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x1 + 2, y, w - 4, h);
    ctx.clip();

    const textColor = isLightColor(fillColor) ? '#222' : '#fff';
    ctx.fillStyle = textColor;
    const fontSize = Math.min(13, h - 2);
    ctx.font = `${fontSize}px -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = scale.isRtl ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.content, scale.isRtl ? x2 - 4 : x1 + 4, y + h / 2);
    ctx.restore();
  }

  ctx.restore();
}

function drawPointItem(
  ctx: CanvasRenderingContext2D,
  scale: HebrewTimeScale,
  item: AnyItem,
  rowTop: number,
  rowHeight: number,
  isSelected: boolean,
  groupColor: string,
): void {
  const trackLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackRight = Math.max(scale.pxLeft, scale.pxRight);

  const cx = scale.timeToPx(item.start.getTime());
  if (cx < trackLeft - 12 || cx > trackRight + 12) return;

  const cy = rowTop + rowHeight / 2;
  const size = Math.min(rowHeight / 2 - 2, 7);
  const color = extractItemColor(item.style, groupColor);
  const fillColor = isSelected ? lightenHex(color, 50) : color;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = fillColor;
  // Non-selected: grey-white halo so diamonds show clearly on top of range bars
  ctx.strokeStyle = isSelected ? '#1a365d' : 'rgba(245, 245, 245, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(-size, -size, size * 2, size * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawOngoingItem(
  ctx: CanvasRenderingContext2D,
  scale: HebrewTimeScale,
  item: AnyItem,
  rowTop: number,
  rowHeight: number,
  isSelected: boolean,
  groupColor: string,
): void {
  const trackLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackRight = Math.max(scale.pxLeft, scale.pxRight);

  const startMs = item.start.getTime();
  const nowMs = Date.now();

  // Solid bar: start → now (same span logic as drawRangeItem)
  let [x1, x2] = scale.timeRangeToPxSpan(startMs, nowMs);
  x1 = Math.max(trackLeft, x1);
  x2 = Math.min(trackRight, x2);
  const solidW = Math.max(1, x2 - x1);

  const y = rowTop + ITEM_V_MARGIN;
  const h = rowHeight - ITEM_V_MARGIN * 2;
  const r = Math.min(3, h / 2);

  const baseColor = extractItemColor(item.style, groupColor);
  const fillColor = isSelected ? lightenHex(baseColor, 50) : baseColor;

  if (x2 > trackLeft && x1 < trackRight) {
    ctx.save();
    ctx.globalAlpha = isSelected ? 1.0 : 0.85;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    roundedRect(ctx, x1, y, solidW, h, r);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = '#1a365d';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (solidW >= 20) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x1 + 2, y, solidW - 4, h);
      ctx.clip();
      const textColor = isLightColor(fillColor) ? '#222' : '#fff';
      ctx.fillStyle = textColor;
      const fontSize = Math.min(13, h - 2);
      ctx.font = `${fontSize}px -apple-system, Segoe UI, sans-serif`;
      ctx.textAlign = scale.isRtl ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.content, scale.isRtl ? x2 - 4 : x1 + 4, y + h / 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // LTR: future is rightward (+), RTL: future is leftward (-)
  const extend = scale.isRtl ? -ONGOING_EXTENSION_PX : ONGOING_EXTENSION_PX;
  
  // Gradient extension from nowX in the future direction (pixel-space, zoom-independent)
  const nowX = scale.timeToPx(nowMs);
  const clampedNowX = Math.min(trackRight, Math.max(trackLeft, nowX));
  
  const gradEnd = clampedNowX + extend;
  const clampedGradEnd = scale.isRtl
    ? Math.max(trackLeft, gradEnd)
    : Math.min(trackRight, gradEnd);

  const gradX = Math.min(clampedNowX, clampedGradEnd);
  const gradW = Math.abs(clampedGradEnd - clampedNowX);

  if (gradW > 0) {
    // Gradient runs from fillColor (at nowX side) → transparent (at far end)
    // createLinearGradient coords must go from the opaque end to the transparent end
    const [gradFrom, gradTo] = scale.isRtl
      ? [clampedNowX, clampedGradEnd]   // RTL: nowX is the right/opaque end
      : [clampedNowX, clampedGradEnd];  // LTR: nowX is the left/opaque end
    const grad = ctx.createLinearGradient(gradFrom, 0, gradTo, 0);
    grad.addColorStop(0, fillColor + 'DD'); // ~85% opacity at transition point
    grad.addColorStop(1, fillColor + '00'); // transparent at tail end

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.rect(gradX, y, gradW, h);
    ctx.fill();
    ctx.restore();
  }
}

// ── Shell (group label) column ───────────────────────────────────────────────

export function drawShellLabel(
  ctx: CanvasRenderingContext2D,
  track: TrackLayout,
  shellWidth: number,
  isRtl: boolean,
  canvasWidth: number,
  sectionColWidth: number,
): void {
  const isShellExpanded = shellWidth >= 60;
  const shellX = isRtl ? canvasWidth - sectionColWidth - shellWidth : sectionColWidth;
  const midY = track.y + track.height / 2;

  // Background
  ctx.fillStyle = track.isCollapsed ? '#efefef' : '#f5f5f5';
  ctx.fillRect(shellX, track.y, shellWidth, track.height);

  // Shell edge border (right in LTR, left in RTL)
  const borderX = isRtl ? shellX + 0.5 : shellX + shellWidth - 0.5;
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(borderX, track.y);
  ctx.lineTo(borderX, track.y + track.height);
  ctx.stroke();

  if (!isShellExpanded) {
    // Narrow strip: show a centred colour dot
    const dotR = Math.min((shellWidth - 4) / 2, 5);
    ctx.fillStyle = track.color;
    ctx.globalAlpha = track.isCollapsed ? 0.35 : 1;
    ctx.beginPath();
    ctx.arc(shellX + shellWidth / 2, midY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Colour dot
    const dotR = 5;
    const dotX = isRtl
      ? shellX + shellWidth - 10 - dotR   // near right edge in RTL
      : shellX + 10 + dotR;               // near left edge in LTR
    ctx.fillStyle = track.color;
    ctx.globalAlpha = track.isCollapsed ? 0.4 : 1;
    ctx.beginPath();
    ctx.arc(dotX, midY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label text
    ctx.save();
    if (isRtl) {
      // Clip: from shellX to dotX - dotR - 4
      ctx.beginPath();
      ctx.rect(shellX, track.y, dotX - dotR - 4 - shellX, track.height);
      ctx.clip();
      ctx.fillStyle = track.isCollapsed ? '#aaa' : '#333';
      ctx.font = '13px -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(track.label, dotX - dotR - 6, midY);
    } else {
      // Clip: from dotX + dotR + 4 to shellX + shellWidth - 4
      ctx.beginPath();
      ctx.rect(dotX + dotR + 4, track.y, shellX + shellWidth - dotX - dotR - 8, track.height);
      ctx.clip();
      ctx.fillStyle = track.isCollapsed ? '#aaa' : '#333';
      ctx.font = '13px -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(track.label, dotX + dotR + 6, midY);
    }
    ctx.restore();
  }

  // Bottom separator
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shellX, track.y + track.height - 0.5);
  ctx.lineTo(shellX + shellWidth, track.y + track.height - 0.5);
  ctx.stroke();
}

// ── Track row background ──────────────────────────────────────────────────────

function drawTrackBackground(
  ctx: CanvasRenderingContext2D,
  track: TrackLayout,
  scale: HebrewTimeScale,
): void {
  const trackLeft = Math.min(scale.pxLeft, scale.pxRight);
  const trackRight = Math.max(scale.pxLeft, scale.pxRight);

  // No fill needed — the canvas is already cleared to white before the track loop.
  // Leaving it transparent allows grid lines drawn beforehand to show through.

  // Bottom separator line
  ctx.strokeStyle = '#ececec';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(trackLeft, track.y + track.height - 0.5);
  ctx.lineTo(trackRight, track.y + track.height - 0.5);
  ctx.stroke();
}

// ── Section separator ─────────────────────────────────────────────────────────

/**
 * Draw a bold horizontal separator line between the historical-events section
 * and the reading-schedules section, with a small label in the shell column.
 *
 * @param y           Top y-coordinate of the separator (first reading track's y).
 * @param shellWidth     Width of the shell (label) column in CSS pixels.
 * @param canvasWidth    Full canvas width in CSS pixels.
 * @param isRtl          Whether the layout is right-to-left (Hebrew).
 * @param sectionColWidth Width of the section-header column that precedes the shell.
 */
export function drawSeparator(
  ctx: CanvasRenderingContext2D,
  y: number,
  shellWidth: number,
  canvasWidth: number,
  isRtl: boolean,    
): void {
  const LINE_Y = y - 1.5; // sit just above the first reading track
  const LINE_H = 3;
  const SHELL_X = isRtl ? canvasWidth - shellWidth : 0;

  // Full-width filled strip
  ctx.save();
  ctx.fillStyle = '#333';
  ctx.fillRect(0, LINE_Y, canvasWidth, LINE_H);
  ctx.restore();

  // Small label in the shell column, vertically centred on the strip
  const FONT_SIZE = 11; 

  ctx.save();
  ctx.beginPath();
  ctx.rect(SHELL_X, LINE_Y - FONT_SIZE - 2, shellWidth, FONT_SIZE + 4);
  ctx.clip();

  ctx.fillStyle = '#555';
  ctx.font = `italic ${FONT_SIZE}px -apple-system, Segoe UI, sans-serif`;
  ctx.textBaseline = 'middle';

  ctx.restore();
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Draw a single track group (label + all its items) onto `ctx`.
 *
 * `track.renderedItems` is already sorted for correct z-order (longest range bars
 * first, point events last) and has `hasOverlapOutline` pre-computed — both are
 * done once in `computeTrackLayouts`, not per frame.
 *
 * @param selectedId  The `id` of the currently selected item (or null).
 */
export function drawTrack(
  ctx: CanvasRenderingContext2D,
  track: TrackLayout,
  scale: HebrewTimeScale,
  selectedId: string | null,
  shellWidth: number,
  canvasWidth: number,
  sectionColWidth: number,
): void {
  drawTrackBackground(ctx, track, scale);
  drawShellLabel(ctx, track, shellWidth, scale.isRtl, canvasWidth, sectionColWidth);

  for (const { item, row, rowHeight, hasOverlapOutline } of track.renderedItems) {
    const rowTop = track.y + row * rowHeight;
    const isSelected = (item as { id: string }).id === selectedId;
    const itemType = (item as { type?: string }).type;

    if (itemType === 'ongoing') {
      drawOngoingItem(ctx, scale, item, rowTop, rowHeight, isSelected, track.color);
    } else if (!item.end) {
      drawPointItem(ctx, scale, item, rowTop, rowHeight, isSelected, track.color);
    } else {
      drawRangeItem(ctx, scale, item, rowTop, rowHeight, isSelected, track.color, hasOverlapOutline ?? false);
    }
  }
}
