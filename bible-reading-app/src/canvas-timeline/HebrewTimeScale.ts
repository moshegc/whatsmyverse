// src/canvas-timeline/HebrewTimeScale.ts
//
// Converts between ms-since-epoch time values and canvas pixel coordinates.
// Ported from Perfetto's TimeScale class, adapted for Hebrew calendar domain.

export class HebrewTimeScale {
  readonly visibleStart: number; // ms since Unix epoch
  readonly visibleEnd: number;   // ms since Unix epoch
  /** Left edge of the track area in CSS pixels (i.e. after the shell column) */
  readonly pxLeft: number;
  /** Right edge of the track area in CSS pixels */
  readonly pxRight: number;
  readonly isRtl: boolean;

  constructor(
    visibleStart: number,
    visibleEnd: number,
    pxLeft: number,
    pxRight: number,
    isRtl = false,
  ) {
    this.visibleStart = visibleStart;
    this.visibleEnd = visibleEnd;
    this.pxLeft = pxLeft;
    this.pxRight = pxRight;
    this.isRtl = isRtl;
  }

  private get _range(): number {
    return this.pxRight - this.pxLeft;
  }

  private get _duration(): number {
    return this.visibleEnd - this.visibleStart;
  }

  /** Convert a time (ms) to a canvas x position (CSS pixels). */
  timeToPx(ms: number): number {
    const ratio = (ms - this.visibleStart) / this._duration;
    if (this.isRtl) {
      // In RTL: earlier times are on the right, later on the left
      return this.pxRight - ratio * this._range;
    }
    return this.pxLeft + ratio * this._range;
  }

  /** Convert a canvas x position (CSS pixels) back to a time (ms). */
  pxToTime(px: number): number {
    let ratio: number;
    if (this.isRtl) {
      ratio = (this.pxRight - px) / this._range;
    } else {
      ratio = (px - this.pxLeft) / this._range;
    }
    return this.visibleStart + ratio * this._duration;
  }

  /**
   * Convert a duration in ms to a width in pixels.
   * Always positive regardless of RTL.
   */
  durationToPx(durationMs: number): number {
    return Math.abs((durationMs / this._duration) * this._range);
  }

  /**
   * Returns [left, right] pixel bounds for a time range.
   * Always returns left < right, regardless of RTL.
   */
  timeRangeToPxSpan(startMs: number, endMs: number): [number, number] {
    const x1 = this.timeToPx(startMs);
    const x2 = this.timeToPx(endMs);
    return [Math.min(x1, x2), Math.max(x1, x2)];
  }

  /** How many ms correspond to one pixel at the current zoom level. */
  get msPerPx(): number {
    return this._duration / this._range;
  }
}
