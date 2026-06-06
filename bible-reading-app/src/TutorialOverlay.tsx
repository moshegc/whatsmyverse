import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { getTutorialContent } from './infoContent';
import { historicalEventCategories } from './historicalEvents';

interface TutorialOverlayProps {
  onFinish: () => void;
  onStepChange?: (step: number) => void;
}

export default function TutorialOverlay({ onFinish, onStepChange }: TutorialOverlayProps) {
  const { locale } = useLocale();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const content = getTutorialContent(locale);
  const isRtl = locale === 'he';

  const bodyRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkScroll = useCallback(() => {
    if (bodyRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = bodyRef.current;
      const scrollable = scrollHeight > clientHeight + 1; // +1 for sub-pixel rounding tolerance
      setCanScroll(scrollable);
      setIsAtBottom(!scrollable || scrollTop + clientHeight >= scrollHeight - 1);
    }
  }, []);

  useEffect(() => {
    onStepChange?.(step);
    // Reset scroll when step changes
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    // Check scroll after a short delay to allow content to render
    const timer = setTimeout(checkScroll, 50);
    return () => clearTimeout(timer);
  }, [step, onStepChange, checkScroll]);

  useEffect(() => {
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const shellWidth = 212; // 192 (shell) + 20 (section header col)
  const headerHeight = 60; // approximate HeaderBar height
  const axisHeight = 60; // fixed CanvasTimeline axis strip height
  const collapsedHistoryHeight = historicalEventCategories.length * 18; // 18px is COLLAPSED_TRACK_HEIGHT

  const getHighlightStyle = () => {
    // Step 1: highlight event area (the track area)
    // Step 2: highlight track headers (the shell area)
    // Step 3: highlight header bar
    // Step 4: highlight verses area (entire width, but starting below the collapsed history tracks)
    if (step === 1) {
      return {
        top: `${headerHeight + axisHeight}px`,
        bottom: 0,
        left: isRtl ? 0 : `${shellWidth}px`,
        right: isRtl ? `${shellWidth}px` : 0,
      };
    } else if (step === 4) {
      return {
        top: `${headerHeight + axisHeight + collapsedHistoryHeight}px`,
        bottom: 0,
        left: 0,
        right: 0,
      };
    } else if (step === 2) {
      return {
        top: `${headerHeight}px`,
        bottom: 0,
        left: isRtl ? 'auto' : 0,
        right: isRtl ? 0 : 'auto',
        width: `${shellWidth}px`,
      };
    } else {
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

    if (step === 1) {
      // Step 1 (Event Area): Over the shell (bottom start)
      if (isRtl) {
        return { ...baseStyle, right: '24px' };
      } else {
        return { ...baseStyle, left: '24px' };
      }
    } else if (step === 4) {
      // Step 4 (Verses Area): Top start (over the dimmed history area)
      if (isRtl) {
        return { ...baseStyle, top: `${headerHeight + 24}px`, bottom: 'auto', right: '24px' };
      } else {
        return { ...baseStyle, top: `${headerHeight + 24}px`, bottom: 'auto', left: '24px' };
      }
    } else if (step === 2) {
      // Step 2 (Track Headers): Opposite bottom corner
      if (isRtl) {
        return { ...baseStyle, left: '24px' };
      } else {
        return { ...baseStyle, right: '24px' };
      }
    } else {
      // Step 3 (Header): Top center
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

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      onFinish();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
      {/* Dimmed Background with transparent cutout */}
      <div
        style={{
          position: 'absolute',
          ...getHighlightStyle(),
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          borderRadius: step === 1 || step === 4 ? '0' : step === 2 ? '0 8px 8px 0' : '0 0 8px 8px', // just visual polish
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
          {step === 1 ? content.step1Title : step === 2 ? content.step2Title : step === 3 ? content.step3Title : content.step4Title}
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
            {step === 1 ? content.step1Body : step === 2 ? content.step2Body : step === 3 ? content.step3Body : content.step4Body}
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
            {step === 4 && isAtBottom ? content.done : content.next}
          </button>
        </div>
      </div>
    </div>
  );
}
