import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { getTutorialContent, tutorialStepOrder } from './infoContent';
import { historicalEventCategories } from './historicalEvents';

interface TutorialOverlayProps {
  onFinish: () => void;
  onStepChange?: (step: number) => void;
}

export default function TutorialOverlay({ onFinish, onStepChange }: TutorialOverlayProps) {
  const { locale } = useLocale();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepName = tutorialStepOrder[stepIndex];
  const isRtl = locale === 'he';

  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && 
    (window.innerWidth < 768 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches)
  );

  const content = getTutorialContent(locale, isMobile);

  const checkScroll = useCallback(() => {
    if (bodyRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = bodyRef.current;
      const scrollable = scrollHeight > clientHeight + 1; // +1 for sub-pixel rounding tolerance
      setCanScroll(scrollable);
      setIsAtBottom(!scrollable || scrollTop + clientHeight >= scrollHeight - 1);
    }
  }, []);

  useEffect(() => {
    onStepChange?.(stepIndex + 1);
    // Reset scroll when step changes
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    // Check scroll after a short delay to allow content to render
    const timer = setTimeout(checkScroll, 50);
    return () => clearTimeout(timer);
  }, [stepIndex, onStepChange, checkScroll]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        typeof window !== 'undefined' && 
        (window.innerWidth < 768 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches)
      );
      checkScroll();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll]);

  const sidebarMargin = isMobile ? 0 : 48; // 48px is var(--sidebar-collapsed)
  const shellWidth = 212; // 192 (shell) + 20 (section header col)
  const headerHeight = 60; // approximate HeaderBar height
  const axisHeight = 60; // fixed CanvasTimeline axis strip height
  const collapsedHistoryHeight = historicalEventCategories.length * 18; // 18px is COLLAPSED_TRACK_HEIGHT

  const getHighlightStyle = () => {
    if (currentStepName === 'eventArea') {
      return {
        top: `${headerHeight + axisHeight}px`,
        bottom: 0,
        left: isRtl ? 0 : `${sidebarMargin + shellWidth}px`,
        right: isRtl ? `${sidebarMargin + shellWidth}px` : 0,
      };
    } else if (currentStepName === 'versesArea') {
      return {
        top: `${headerHeight + axisHeight + collapsedHistoryHeight}px`,
        bottom: 0,
        left: isRtl ? 0 : `${sidebarMargin}px`,
        right: isRtl ? `${sidebarMargin}px` : 0,
      };
    } else if (currentStepName === 'dateBar') {
      return {
        top: `${headerHeight}px`,
        bottom: 'auto',
        left: isRtl ? 0 : `${sidebarMargin + shellWidth}px`,
        right: isRtl ? `${sidebarMargin + shellWidth}px` : 0,
        height: `${axisHeight}px`,
      };
    } else if (currentStepName === 'trackHeaders') {
      return {
        top: `${headerHeight}px`,
        bottom: 0,
        left: isRtl ? 'auto' : `${sidebarMargin}px`,
        right: isRtl ? `${sidebarMargin}px` : 'auto',
        width: `${shellWidth}px`,
      };
    } else { // headerBar
      return {
        top: 0,
        bottom: 'auto',
        left: 0,
        right: 0,
        height: `${headerHeight}px`,
      };
    }
  };

  const getDialogStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '320px',
      maxWidth: '90vw',
      maxHeight: 'calc(100vh - 48px)',
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 10000,
      bottom: '24px',
    };

    if (currentStepName === 'eventArea') {
      if (isRtl) {
        return { ...baseStyle, right: `${sidebarMargin + 24}px` };
      } else {
        return { ...baseStyle, left: `${sidebarMargin + 24}px` };
      }
    } else if (currentStepName === 'versesArea') {
      if (isRtl) {
        return { ...baseStyle, top: `${headerHeight + 24}px`, bottom: 'auto', right: `${sidebarMargin + 24}px` };
      } else {
        return { ...baseStyle, top: `${headerHeight + 24}px`, bottom: 'auto', left: `${sidebarMargin + 24}px` };
      }
    } else if (currentStepName === 'trackHeaders') {
      if (isRtl) {
        return { ...baseStyle, left: '24px' };
      } else {
        return { ...baseStyle, right: '24px' };
      }
    } else if (currentStepName === 'dateBar') {
      if (isRtl) {
        return {
          ...baseStyle,
          bottom: 'auto',
          top: `${headerHeight + 24}px`,
          right: `${sidebarMargin + 24}px`,
        };
      } else {
        return {
          ...baseStyle,
          bottom: 'auto',
          top: `${headerHeight + 24}px`,
          left: `${sidebarMargin + 24}px`,
        };
      }
    } else { // headerBar
      return {
        ...baseStyle,
        bottom: 'auto',
        top: `${headerHeight + 24}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        maxHeight: `calc(100vh - ${headerHeight + 48}px)`,
      };
    }
  };

  const handleNext = () => {
    // If text is cut off and we haven't scrolled to the bottom, paginate down instead of advancing
    if (canScroll && !isAtBottom && bodyRef.current) {
      bodyRef.current.scrollBy({ top: bodyRef.current.clientHeight * 0.8, behavior: 'smooth' });
      // Update state after smooth scroll completes
      setTimeout(checkScroll, 350);
      return;
    }

    if (stepIndex < tutorialStepOrder.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onFinish();
    }
  };

  const isLastStep = stepIndex === tutorialStepOrder.length - 1;
  const currentStepContent = content.steps[currentStepName];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
      {/* Dimmed Background with transparent cutout */}
      <div
        style={{
          position: 'absolute',
          ...getHighlightStyle(),
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          borderRadius: currentStepName === 'eventArea' || currentStepName === 'versesArea' || currentStepName === 'dateBar' ? '0' : currentStepName === 'trackHeaders' ? '0 8px 8px 0' : '0 0 8px 8px', // just visual polish
          pointerEvents: 'none',
          transition: 'all 0.3s ease-in-out',
        }}
      />

      {/* Pop-up dialog */}
      <div
        className="tutorial-dialog"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={getDialogStyle()}
      >
        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-primary)', flexShrink: 0 }}>
          {currentStepContent.title}
        </h3>
        <div 
          className="tutorial-body" 
          ref={bodyRef}
          onScroll={checkScroll}
          style={{ fontSize: '15px', lineHeight: 1.6, color: '#333', overflowY: 'hidden', flexGrow: 1 }}
        >
          <ReactMarkdown
            components={{
              code(props) {
                const {children, className, node, ...rest} = props;
                return (
                  <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', fontSize: '1.2em' }} {...rest}>
                    {children}
                  </span>
                );
              }
            }}
          >
            {currentStepContent.body}
          </ReactMarkdown>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', flexShrink: 0 }}>
          <button
            onClick={handleNext}
            style={{
              padding: '10px 24px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '15px',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2a4a7f')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            {isLastStep && isAtBottom ? content.done : content.next}
          </button>
        </div>
      </div>
    </div>
  );
}
