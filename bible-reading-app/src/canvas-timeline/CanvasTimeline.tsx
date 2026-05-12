// src/canvas-timeline/CanvasTimeline.tsx
//
// Canvas-based timeline component that replaces vis-timeline.
// Uses a single <canvas> for tracks (virtual scroll) and a sticky axis canvas,
// borrowing Perfetto's coordinate-transform and zoom/pan patterns.

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { HebrewTimeScale } from './HebrewTimeScale';
import {
  INITIAL_WINDOW,
  zoomWindow,
  panWindow,
  type VisibleWindow,
} from './timelineState';
import { stackItems } from './stackItems';
import { hitTest } from './hitTest';
import { drawTimeAxis } from './drawTimeAxis';
import { drawTrack } from './drawTrack';
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
const AXIS_HEIGHT = 52;         // px — fixed axis strip height
const SHELL_WIDTH = 150;        // px — group-label column width
const TRACK_ROW_HEIGHT = 26;    // px — default single-row track height
const STACKED_ROW_HEIGHT = 20;  // px — row height when stacking overlapping items
const MIN_TRACK_HEIGHT = 26;    // px — floor so tracks are always clickable

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
  let y = 0;
  const layouts: TrackLayout[] = [];

  for (const group of allGroups) {
    if (collapsedGroups.has(group.id)) continue;

    const groupItems = allItems.filter((item) => item.group === group.id);
    let renderedItems: RenderedItemEntry[];
    let rowHeight: number;
    let maxRows: number;

    if (group.stacked) {
      rowHeight = STACKED_ROW_HEIGHT;
      const { stacked, maxRows: mr } = stackItems(groupItems, rowHeight);
      maxRows = mr;
      renderedItems = stacked;
    } else {
      rowHeight = TRACK_ROW_HEIGHT;
      maxRows = 1;
      renderedItems = groupItems.map((item) => ({ item, row: 0, rowHeight }));
    }

    const height = Math.max(MIN_TRACK_HEIGHT, maxRows * rowHeight);

    layouts.push({
      groupId: group.id,
      label: group.label,
      color: group.color,
      y,
      height,
      rowHeight,
      renderedItems,
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

// ── Component props ───────────────────────────────────────────────────────────

interface CanvasTimelineProps {
  collapsedGroups: Set<string>;
}

// ── Main component ────────────────────────────────────────────────────────────

const CanvasTimeline = ({ collapsedGroups }: CanvasTimelineProps) => {
  const { locale } = useLocale();

  // ── Refs ────────────────────────────────────────────────────────────────────
  const outerRef = useRef<HTMLDivElement>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement>(null);
  const tracksCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep a ref copy of visibleWindow to use inside non-reactive event handlers
  const windowRef = useRef<VisibleWindow>(INITIAL_WINDOW);

  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWindowRef = useRef<VisibleWindow>(INITIAL_WINDOW);

  // ── State ───────────────────────────────────────────────────────────────────
  const [visibleWindow, setVisibleWindowState] = useState<VisibleWindow>(INITIAL_WINDOW);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  // Helper: update both state and ref
  const setVisibleWindow = useCallback((win: VisibleWindow) => {
    windowRef.current = win;
    setVisibleWindowState(win);
  }, []);

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
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCanvasWidth(w);
    });
    observer.observe(el);
    setCanvasWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // ── Drawing effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (canvasWidth <= SHELL_WIDTH + 10) return;
    const axisCanvas = axisCanvasRef.current;
    const tracksCanvas = tracksCanvasRef.current;
    if (!axisCanvas || !tracksCanvas) return;

    const scale = new HebrewTimeScale(
      visibleWindow.start,
      visibleWindow.end,
      SHELL_WIDTH,
      canvasWidth,
      locale === 'he',
    );

    // Axis canvas
    const axisCtx = setupCanvas(axisCanvas, canvasWidth, AXIS_HEIGHT);
    if (axisCtx) {
      drawTimeAxis(axisCtx, scale, canvasWidth, AXIS_HEIGHT, SHELL_WIDTH, locale);
    }

    // Tracks canvas
    const tracksCtx = setupCanvas(tracksCanvas, canvasWidth, totalTrackHeight);
    if (tracksCtx) {
      // Background
      tracksCtx.fillStyle = '#fff';
      tracksCtx.fillRect(0, 0, canvasWidth, totalTrackHeight);

      const selId =
        selectedItem?.kind === 'reading'
          ? (selectedItem.data as TimelineItem).id
          : selectedItem?.kind === 'historical'
          ? (selectedItem.data as HistoricalTimelineItem).id
          : null;

      for (const track of trackLayouts) {
        drawTrack(tracksCtx, track, scale, selId, SHELL_WIDTH, canvasWidth);
      }
    }
  }, [visibleWindow, selectedItem, trackLayouts, totalTrackHeight, locale, canvasWidth]);

  // ── Wheel handler (non-passive, must use addEventListener) ───────────────────
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const trackAreaWidth = rect.width - SHELL_WIDTH;
      if (trackAreaWidth <= 0) return;

      const isZoom = e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2;

      if (isZoom) {
        e.preventDefault();
        const xInTrack = e.clientX - rect.left - SHELL_WIDTH;
        const centerRatio = Math.max(0, Math.min(1, xInTrack / trackAreaWidth));
        // Log-scale zoom: smoother feel across different pointer devices
        const sign = e.deltaY > 0 ? 1 : -1;
        const factor = Math.pow(1.003, sign * Math.abs(e.deltaY));
        setVisibleWindow(zoomWindow(windowRef.current, factor, centerRatio));
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal pan
        e.preventDefault();
        const msPerPx = (windowRef.current.end - windowRef.current.start) / trackAreaWidth;
        const deltaMs = e.deltaX * msPerPx * (locale === 'he' ? -1 : 1);
        setVisibleWindow(panWindow(windowRef.current, deltaMs));
      }
      // Pure vertical scroll: let the scroll container handle it naturally
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [locale, setVisibleWindow]);

  // ── Mouse drag-to-pan ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWindowRef.current = { ...windowRef.current };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const outer = outerRef.current;
    if (!outer) return;
    const trackAreaWidth = outer.clientWidth - SHELL_WIDTH;
    if (trackAreaWidth <= 0) return;

    const dx = e.clientX - dragStartXRef.current;
    const duration =
      dragStartWindowRef.current.end - dragStartWindowRef.current.start;
    const msPerPx = duration / trackAreaWidth;
    const sign = locale === 'he' ? 1 : -1;
    const deltaMs = sign * dx * msPerPx;
    setVisibleWindow(panWindow(dragStartWindowRef.current, deltaMs));
  }, [locale, setVisibleWindow]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // ── Click → hit test ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ignore if this was a drag
    if (Math.abs(e.clientX - dragStartXRef.current) > 5) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + container.scrollTop;

    const outer = outerRef.current;
    const trackAreaWidth = (outer?.clientWidth ?? canvasWidth) - SHELL_WIDTH;

    const scale = new HebrewTimeScale(
      windowRef.current.start,
      windowRef.current.end,
      SHELL_WIDTH,
      SHELL_WIDTH + trackAreaWidth,
      locale === 'he',
    );

    const hit = hitTest(x, y, trackLayouts, scale, SHELL_WIDTH);

    if (!hit) {
      setSelectedItem(null);
      return;
    }

    if ('_event' in hit) {
      setSelectedItem({ kind: 'historical', data: hit as HistoricalTimelineItem });
    } else {
      setSelectedItem({ kind: 'reading', data: hit as TimelineItem });
    }
  }, [trackLayouts, canvasWidth, locale]);

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
        cursor: isDraggingRef.current ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* ── Axis strip (non-scrolling) ── */}
      <canvas
        ref={axisCanvasRef}
        style={{
          display: 'block',
          width: '100%',
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
};

export default CanvasTimeline;
