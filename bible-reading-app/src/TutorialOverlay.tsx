import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { getTutorialContent } from './infoContent';

interface TutorialOverlayProps {
  onFinish: () => void;
}

export default function TutorialOverlay({ onFinish }: TutorialOverlayProps) {
  const { locale } = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const content = getTutorialContent(locale);
  const isRtl = locale === 'he';

  const shellWidth = 212; // 192 (shell) + 20 (section header col)
  const headerHeight = 60; // approximate HeaderBar height
  const axisHeight = 60; // fixed CanvasTimeline axis strip height

  const getHighlightStyle = () => {
    // Step 1: highlight event area (the track area)
    // Step 2: highlight track headers (the shell area)
    if (step === 1) {
      return {
        top: `${headerHeight + axisHeight}px`,
        bottom: 0,
        left: isRtl ? 0 : `${shellWidth}px`,
        right: isRtl ? `${shellWidth}px` : 0,
      };
    } else {
      return {
        top: `${headerHeight}px`,
        bottom: 0,
        left: isRtl ? 'auto' : 0,
        right: isRtl ? 0 : 'auto',
        width: `${shellWidth}px`,
      };
    }
  };

  const getDialogStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '320px',
      maxWidth: '90vw',
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
      // Step 1 (Event Area): Over the shell
      // Shell is on the left in LTR (so bottom left), right in RTL (so bottom right)
      if (isRtl) {
        return { ...baseStyle, right: '24px' };
      } else {
        return { ...baseStyle, left: '24px' };
      }
    } else {
      // Step 2 (Track Headers): Opposite bottom corner
      // Opposite is right in LTR, left in RTL
      if (isRtl) {
        return { ...baseStyle, left: '24px' };
      } else {
        return { ...baseStyle, right: '24px' };
      }
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
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
          borderRadius: step === 1 ? '0' : '0 8px 8px 0', // just visual polish
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
        <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--color-primary)' }}>
          {step === 1 ? content.step1Title : content.step2Title}
        </h3>
        <div className="tutorial-body" style={{ fontSize: '15px', lineHeight: 1.6, color: '#333' }}>
          <ReactMarkdown>
            {step === 1 ? content.step1Body : content.step2Body}
          </ReactMarkdown>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
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
            {step === 1 ? content.next : content.done}
          </button>
        </div>
      </div>
    </div>
  );
}
