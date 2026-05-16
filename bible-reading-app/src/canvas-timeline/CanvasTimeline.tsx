// src/canvas-timeline/CanvasTimeline.tsx
//
// Canvas-based timeline component that replaces vis-timeline.
// Uses a single <canvas> for the track area and a sticky axis canvas,
// borrowing Perfetto's coordinate-transform and zoom/pan patterns.

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { HebrewTimeScale } from './HebrewTimeScale';
import {
  TIMELINE_MIN_MS,
  TIMELINE_MAX_MS,
  INITIAL_WINDOW,
  zoomWindow,
  panWindow,
  type VisibleWindow,
} from './timelineState';
import { stackItems } from './stackItems';
import { hitTest } from './hitTest';
import { drawTimeAxis, drawGridLines } from './drawTimeAxis';
import { drawTrack, drawSeparator, drawSectionHeaderColumn } from './drawTrack';
import type { TrackLayout, RenderedItemEntry, AnyItem } from './types';
import { generateTimelineData } from '../generateTimelineData';
import { generateHistoricalTimelineData, type HistoricalTimelineItem } from '../generateHistoricalTimelineData';
import { historicalEventCategories } from '../historicalEvents';
import { schedules } from '../config';
import { generateColorFromString } from '../colorUtils';
import { useLocale } from '../LocaleContext';
import { localize, type Locale } from '../i18n';
import DetailCard, { type SelectedItem } from '../DetailCard';
import type { TimelineItem } from '../generateTimelineData';

// ── Layout constants ──────────────────────────────────────────────────────────
const AXIS_HEIGHT = 60;              // px — fixed axis strip height
const SHELL_WIDTH = 170;             // px — group-label column width (expanded)
const COLLAPSED_SHELL_WIDTH = 22;    // px — group-label column width (collapsed)
const SECTION_COL_WIDTH = 20;        // px — rotated section-header column width
const COLLAPSED_TRACK_HEIGHT = 18;   // px — height of a collapsed (hidden) track row
const TRACK_ROW_HEIGHT = 26;         // px — default single-row track height
const STACKED_ROW_HEIGHT = 20;       // px — row height when stacking overlapping items
const MIN_TRACK_HEIGHT = 26;         // px — floor so tracks are always clickable

// ── Track layout computation ──────────────────────────────────────────────────

function computeTrackLayouts(
  readingItems: TimelineItem[],
  historicalItems: HistoricalTimelineItem[],
  collapsedGroups: Set<string>,
  locale: Locale,
): TrackLayout[] {
  const allGroups = [
    ...historicalEventCategories.map((cat) => ({
      id: cat.id,
      label: localize(cat.name, cat.nameHe, locale),
      color: cat.color,
      order: cat.order,
      stacked: cat.stacked ?? false,
    })),
    ...schedules.map((s, idx) => ({
      id: s.id,
      label: localize(s.name, s.nameHe, locale),
      color: generateColorFromString(s.id),
      order: 100 + idx,
      stacked: false,
    })),
  ].sort((a, b) => a.order - b.order);

  const allItems: AnyItem[] = [...historicalItems, ...readingItems];

  // Pre-group items for O(1) per-group lookup instead of O(items) filter each time
  const itemsByGroup = new Map<string, AnyItem[]>();
  for (const item of allItems) {
    const arr = itemsByGroup.get(item.group);
    if (arr) arr.push(item);
    else itemsByGroup.set(item.group, [item]);
  }

  let y = 0;
  const layouts: TrackLayout[] = [];

  for (const group of allGroups) {
    const isCollapsed = collapsedGroups.has(group.id);

    let renderedItems: RenderedItemEntry[];
    let rowHeight: number;
    let height: number;

    if (isCollapsed) {
      // Keep the group visible in the shell as a compact stub so it can be re-enabled
      renderedItems = [];
      rowHeight = COLLAPSED_TRACK_HEIGHT;
      height = COLLAPSED_TRACK_HEIGHT;
    } else {
      const groupItems = itemsByGroup.get(group.id) ?? [];
      if (group.stacked) {
        rowHeight = STACKED_ROW_HEIGHT;
        const { stacked, maxRows } = stackItems(groupItems, rowHeight);
        renderedItems = stacked;
        height = Math.max(MIN_TRACK_HEIGHT, maxRows * rowHeight);
      } else {
        rowHeight = TRACK_ROW_HEIGHT;
        renderedItems = groupItems.map((item) => ({ item, row: 0, rowHeight }));
        height = Math.max(MIN_TRACK_HEIGHT, rowHeight);
      }
    }

    layouts.push({
      groupId: group.id,
      label: group.label,
      color: group.color,
      y,
      height,
      rowHeight,
      renderedItems,
      isCollapsed,
    });

    y += height;
  }

  return layouts;
}

// ── Canvas setup helper ───────────────────────────────────────────────────────

function setupCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before scaling
  ctx.scale(dpr, dpr);
  return ctx;
}

// ── Component props & handle ─────────────────────────────────────────────────

interface CanvasTimelineProps {
  collapsedGroups: Set<string>;
  onToggleGroup?: (groupId: string) => void;
  onHeaderVisibilityChange?: (visible: boolean) => void;
}

export interface CanvasTimelineHandle {
  toggleShell: () => void;
  zoomOut: () => void;
  jumpToToday: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

const CanvasTimeline = forwardRef<CanvasTimelineHandle, CanvasTimelineProps>(
({ collapsedGroups, onToggleGroup, onHeaderVisibilityChange }, ref) => {
  const { locale } = useLocale();

  // ── Refs ────────────────────────────────────────────────────────────────────
  const outerRef = useRef<HTMLDivElement>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement>(null);
  const tracksCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep a ref copy of visibleWindow to use inside non-reactive event handlers
  const windowRef = useRef<VisibleWindow>(INITIAL_WINDOW);

  // Shell animation
  const animatedShellWidthRef = useRef(SHELL_WIDTH);
  const shellAnimFrameRef = useRef<number | null>(null);

  // Touch state
  const touchStartsRef = useRef<{ identifier: number; clientX: number; clientY: number }[]>([]);
  const touchWindowRef = useRef<VisibleWindow>(INITIAL_WINDOW);
  const touchDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
  const pinchPrevDistRef = useRef(0);
  // True when the gesture started over the detail card — skip timeline pan/zoom
  const touchOverCardRef = useRef(false);

  // Mouse drag state (desktop pan)
  const mouseDragRef = useRef<{ startX: number; startWindow: VisibleWindow } | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [visibleWindow, setVisibleWindowState] = useState<VisibleWindow>(INITIAL_WINDOW);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [isShellExpanded, setIsShellExpanded] = useState(true);
  const [animatedShellWidth, setAnimatedShellWidth] = useState(SHELL_WIDTH);

  // Expose toggleShell, zoomOut, jumpToToday to parent via ref
  useImperativeHandle(ref, () => ({
    toggleShell: () => setIsShellExpanded((prev) => !prev),
    zoomOut: () => setVisibleWindow({ start: TIMELINE_MIN_MS, end: TIMELINE_MAX_MS }),
    jumpToToday: () => {
      const now = Date.now();
      const win = windowRef.current;
      const half = (win.end - win.start) / 2;
      const newStart = Math.max(TIMELINE_MIN_MS, Math.min(now - half, TIMELINE_MAX_MS - (win.end - win.start)));
      setVisibleWindow({ start: newStart, end: newStart + (win.end - win.start) });
    },
  }));

  // Helper: update both state and ref
  const setVisibleWindow = useCallback((win: VisibleWindow) => {
    windowRef.current = win;
    setVisibleWindowState(win);
  }, []);

  // ── Shell expand/collapse animation ────────────────────────────────────────
  useEffect(() => {
    const target = isShellExpanded ? SHELL_WIDTH : COLLAPSED_SHELL_WIDTH;
    const DURATION = 250; // ms
    const startVal = animatedShellWidthRef.current;
    const startTime = performance.now();

    if (shellAnimFrameRef.current !== null) {
      cancelAnimationFrame(shellAnimFrameRef.current);
    }

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION);
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const val = startVal + (target - startVal) * eased;
      animatedShellWidthRef.current = val;
      setAnimatedShellWidth(val);
      if (t < 1) {
        shellAnimFrameRef.current = requestAnimationFrame(step);
      } else {
        shellAnimFrameRef.current = null;
      }
    };
    shellAnimFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (shellAnimFrameRef.current !== null) {
        cancelAnimationFrame(shellAnimFrameRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShellExpanded]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { readingItems, historicalItems } = useMemo(() => ({
    readingItems: generateTimelineData(locale),
    historicalItems: generateHistoricalTimelineData(locale),
  }), [locale]);

  const trackLayouts = useMemo(
    () => computeTrackLayouts(readingItems, historicalItems, collapsedGroups, locale),
    [readingItems, historicalItems, collapsedGroups, locale],
  );

  const totalTrackHeight = useMemo(() => {
    if (trackLayouts.length === 0) return MIN_TRACK_HEIGHT;
    const last = trackLayouts[trackLayouts.length - 1];
    return last.y + last.height;
  }, [trackLayouts]);

  // ── ResizeObserver: track canvas width ──────────────────────────────────────
  // Observe the *scroll container* (not the outer div) so that canvasWidth
  // reflects the actual content area after the vertical scrollbar is subtracted.
  // Both the axis canvas and the tracks canvas are then sized to the same width,
  // keeping tick labels and grid lines in sync even when a scrollbar is present.
  useEffect(() => {
    // scrollContainerRef is set on first render; wait one frame if needed
    const attach = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        setCanvasWidth(w);
      });
      observer.observe(el);
      setCanvasWidth(el.clientWidth);
      return () => observer.disconnect();
    };
    const cleanup = attach();
    return cleanup;
  }, []);

  // ── Vertical scroll → auto-hide header in landscape ─────────────────────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !onHeaderVisibilityChange) return;

    const landscapeQuery = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    let lastScrollY = 0;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (!landscapeQuery.matches) return;
      const currentY = el.scrollTop;
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;

      // Hide immediately on any downward movement
      if (delta > 3) {
        onHeaderVisibilityChange(false);
      }

      // Only restore after scroll fully settles at the very top
      if (restoreTimer !== null) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        if (el.scrollTop <= 1) {
          onHeaderVisibilityChange(true);
        }
      }, 200);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (restoreTimer !== null) clearTimeout(restoreTimer);
    };
  }, [onHeaderVisibilityChange]);

  // ── Drawing effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (canvasWidth <= animatedShellWidth + SECTION_COL_WIDTH + 10) return;
    const axisCanvas = axisCanvasRef.current;
    const tracksCanvas = tracksCanvasRef.current;
    if (!axisCanvas || !tracksCanvas) return;

    const isRtl = locale === 'he';
    const scale = new HebrewTimeScale(
      visibleWindow.start,
      visibleWindow.end,
      isRtl ? 0 : animatedShellWidth + SECTION_COL_WIDTH,
      isRtl ? canvasWidth - animatedShellWidth - SECTION_COL_WIDTH : canvasWidth,
      isRtl,
    );

    // Axis canvas
    const axisCtx = setupCanvas(axisCanvas, canvasWidth, AXIS_HEIGHT);
    if (axisCtx) {
      drawTimeAxis(axisCtx, scale, canvasWidth, AXIS_HEIGHT, animatedShellWidth + SECTION_COL_WIDTH, locale);
    }

    // Tracks canvas
    const tracksCtx = setupCanvas(tracksCanvas, canvasWidth, totalTrackHeight);
    if (tracksCtx) {
      tracksCtx.fillStyle = '#fff';
      tracksCtx.fillRect(0, 0, canvasWidth, totalTrackHeight);

      // Grid lines drawn right after the white canvas clear, before tracks.
      // drawTrackBackground no longer re-fills white, so lines remain visible.
      drawGridLines(tracksCtx, scale, totalTrackHeight, animatedShellWidth + SECTION_COL_WIDTH, canvasWidth, locale);

      const selId =
        selectedItem?.kind === 'reading'
          ? (selectedItem.data as TimelineItem).id
          : selectedItem?.kind === 'historical'
          ? (selectedItem.data as HistoricalTimelineItem).id
          : null;

      for (const track of trackLayouts) {
        drawTrack(tracksCtx, track, scale, selId, animatedShellWidth, canvasWidth, SECTION_COL_WIDTH);
      }

      // Draw separator between historical tracks and reading schedule tracks
      const firstScheduleTrack = trackLayouts.find((t) =>
        schedules.some((s) => s.id === t.groupId),
      );     

      // Draw section-header column (rotated labels)
      const histLabel  = locale === 'he' ? 'היסטוריה' : 'History';
      const verseLabel = locale === 'he' ? 'פסוקים'   : 'Verses';
      drawSectionHeaderColumn(
        tracksCtx,
        firstScheduleTrack?.y ?? null,
        totalTrackHeight,
        canvasWidth,
        isRtl,
        SECTION_COL_WIDTH,
        histLabel,
        verseLabel,
      );

      if (firstScheduleTrack) {       
        drawSeparator(
          tracksCtx,
          firstScheduleTrack.y,
          animatedShellWidth,
          canvasWidth,
          isRtl,                    
        );
      }
    }
  }, [visibleWindow, selectedItem, trackLayouts, totalTrackHeight, locale, canvasWidth, animatedShellWidth]);

  // ── Wheel handler (non-passive, must use addEventListener) ───────────────────
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Let the detail card scroll itself without zooming the timeline
      if ((e.target as Element).closest?.('.detail-card')) return;

      const rect = el.getBoundingClientRect();
      const sw = animatedShellWidthRef.current + SECTION_COL_WIDTH;
      const trackAreaWidth = rect.width - sw;
      if (trackAreaWidth <= 0) return;

      const isRtl = locale === 'he';
      const isZoom = e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2;

      if (isZoom) {
        e.preventDefault();
        // In RTL the track area starts at the left edge; in LTR it starts after the shell
        const xInTrack = isRtl
          ? e.clientX - rect.left
          : e.clientX - rect.left - sw;
        const rawRatio = Math.max(0, Math.min(1, xInTrack / trackAreaWidth));
        // In RTL, left pixel = latest time, so invert the ratio for zoomWindow
        const centerRatio = isRtl ? 1 - rawRatio : rawRatio;
        const sign = e.deltaY > 0 ? 1 : -1;
        const factor = Math.pow(1.003, sign * Math.abs(e.deltaY));
        setVisibleWindow(zoomWindow(windowRef.current, factor, centerRatio));
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal pan
        e.preventDefault();
        const msPerPx = (windowRef.current.end - windowRef.current.start) / trackAreaWidth;
        const deltaMs = e.deltaX * msPerPx * (isRtl ? -1 : 1);
        setVisibleWindow(panWindow(windowRef.current, deltaMs));
      }
      // Pure vertical scroll: let the scroll container handle it naturally
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [locale, setVisibleWindow]);

  // ── Touch event handlers (mobile pan & pinch-zoom) ──────────────────────────
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Detect whether the gesture started over the detail card
      const firstTouch = e.touches[0];
      const target = firstTouch
        ? document.elementFromPoint(firstTouch.clientX, firstTouch.clientY)
        : null;
      touchOverCardRef.current = !!(target?.closest('.detail-card'));

      touchStartsRef.current = Array.from(e.touches).map((t) => ({
        identifier: t.identifier,
        clientX: t.clientX,
        clientY: t.clientY,
      }));
      touchWindowRef.current = { ...windowRef.current };
      touchDirectionRef.current = null;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchPrevDistRef.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // Let the detail card handle its own scrolling / zooming
      if (touchOverCardRef.current) return;

      const outer = outerRef.current;
      if (!outer) return;
      const isRtl = locale === 'he';
      const sw = animatedShellWidthRef.current + SECTION_COL_WIDTH;
      const trackAreaWidth = outer.clientWidth - sw;
      if (trackAreaWidth <= 0) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const start = touchStartsRef.current.find(
          (t) => t.identifier === touch.identifier,
        );
        if (!start) return;

        const dx = touch.clientX - start.clientX;
        const dy = touch.clientY - start.clientY;

        // Determine direction after enough initial movement
        if (!touchDirectionRef.current) {
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            touchDirectionRef.current =
              Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
          }
        }

        if (touchDirectionRef.current === 'horizontal') {
          e.preventDefault();
          const msPerPx =
            (touchWindowRef.current.end - touchWindowRef.current.start) /
            trackAreaWidth;
          const sign = isRtl ? 1 : -1;
          const deltaMs = sign * dx * msPerPx;
          setVisibleWindow(panWindow(touchWindowRef.current, deltaMs));
        }
        // vertical: let the scroll container handle natively
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

        if (pinchPrevDistRef.current > 0) {
          const factor = pinchPrevDistRef.current / dist;
          const rect = outer.getBoundingClientRect();
          const midX = (t0.clientX + t1.clientX) / 2;
          const xInTrack = isRtl
            ? midX - rect.left
            : midX - rect.left - sw;
          const rawRatio = Math.max(0, Math.min(1, xInTrack / trackAreaWidth));
          const centerRatio = isRtl ? 1 - rawRatio : rawRatio;
          setVisibleWindow(zoomWindow(windowRef.current, factor, centerRatio));
        }
        pinchPrevDistRef.current = dist;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const remainingIds = new Set(
        Array.from(e.touches).map((t) => t.identifier),
      );
      touchStartsRef.current = touchStartsRef.current.filter((t) =>
        remainingIds.has(t.identifier),
      );
      if (e.touches.length < 2) pinchPrevDistRef.current = 0;
      if (e.touches.length === 0) {
        touchDirectionRef.current = null;
        touchOverCardRef.current = false;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [locale, setVisibleWindow]);

  // ── Mouse drag handlers (desktop pan) ───────────────────────────────────────
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      // Only primary button; ignore if over the detail card
      if (e.button !== 0) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (target?.closest('.detail-card')) return;
      mouseDragRef.current = { startX: e.clientX, startWindow: { ...windowRef.current } };
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = mouseDragRef.current;
      if (!drag) return;
      const isRtl = locale === 'he';
      const sw = animatedShellWidthRef.current;
      const totalSw = sw + SECTION_COL_WIDTH;
      const trackAreaWidth = el.clientWidth - totalSw;
      if (trackAreaWidth <= 0) return;
      const dx = e.clientX - drag.startX;
      const msPerPx = (drag.startWindow.end - drag.startWindow.start) / trackAreaWidth;
      const sign = isRtl ? 1 : -1;
      const deltaMs = sign * dx * msPerPx;
      setVisibleWindow(panWindow(drag.startWindow, deltaMs));
    };

    const onMouseUp = () => {
      if (!mouseDragRef.current) return;
      mouseDragRef.current = null;
      el.style.cursor = '';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [locale, setVisibleWindow]);

  // ── Click → hit test + shell toggle ─────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent) => {

    const outer = outerRef.current;
    const container = scrollContainerRef.current;
    if (!outer || !container) return;

    const outerRect = outer.getBoundingClientRect();
    const xInOuter = e.clientX - outerRect.left;
    const yInOuter = e.clientY - outerRect.top;

    const isRtl = locale === 'he';
    const sw = animatedShellWidthRef.current;
    const totalSw = sw + SECTION_COL_WIDTH;
    const inShell = isRtl
      ? xInOuter > canvasWidth - totalSw
      : xInOuter < totalSw;

    if (inShell) {
      if (yInOuter < AXIS_HEIGHT) {
        // Click on the axis shell header → toggle shell expand/collapse
        setIsShellExpanded((prev) => !prev);
      } else if (sw >= 60) {
        // Click on a track row's shell label → toggle that group
        const yInTracks = yInOuter - AXIS_HEIGHT + container.scrollTop;
        const track = trackLayouts.find(
          (t) => yInTracks >= t.y && yInTracks < t.y + t.height,
        );
        if (track) onToggleGroup?.(track.groupId);
      }
      return;
    }

    // Track area click: hit-test for timeline items
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top + container.scrollTop;

    const scale = new HebrewTimeScale(
      windowRef.current.start,
      windowRef.current.end,
      isRtl ? 0 : totalSw,
      isRtl ? canvasWidth - totalSw : canvasWidth,
      isRtl,
    );

    const hit = hitTest(x, y, trackLayouts, scale, totalSw, canvasWidth);

    if (!hit) {
      setSelectedItem(null);
      return;
    }

    if ('_event' in hit) {
      setSelectedItem({ kind: 'historical', data: hit as HistoricalTimelineItem });
    } else {
      setSelectedItem({ kind: 'reading', data: hit as TimelineItem });
    }
  }, [trackLayouts, canvasWidth, locale, onToggleGroup]);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={outerRef}
      className="timeline-canvas"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'grab',
        userSelect: 'none',
      }}
      onClick={handleClick}
    >
      {/* ── Axis strip (non-scrolling) ── */}
      {/* Width is set to canvasWidth (= scroll-container content width) so the
          axis pixel coordinates exactly match those used by the tracks canvas.
          The scrollbar gutter (if any) sits to the right and is covered by the
          outer div's background. */}
      <canvas
        ref={axisCanvasRef}
        style={{
          display: 'block',
          width: canvasWidth || '100%',
          height: AXIS_HEIGHT,
          flexShrink: 0,
        }}
      />

      {/* ── Scrollable tracks area ── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <canvas
          ref={tracksCanvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: totalTrackHeight,
          }}
        />
      </div>

      {/* ── Detail card popup ── */}
      {selectedItem && (
        <DetailCard item={selectedItem} onClose={handleCloseDetail} />
      )}
    </div>
  );
});

export default CanvasTimeline;
