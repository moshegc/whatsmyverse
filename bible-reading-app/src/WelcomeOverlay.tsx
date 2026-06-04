// src/WelcomeOverlay.tsx
//
// Full-screen welcome overlay shown once per browser session.
// Dismissed by clicking the CTA button or the backdrop.

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { getWelcomeContent, getHelpContent, getAboutContent } from './infoContent';
import InfoCard from './InfoCard';

const SESSION_KEY = 'welcomeSeen';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  onStartTutorial: () => void;
}

function WelcomeOverlay({ onDismiss, onStartTutorial }: WelcomeOverlayProps) {
  const { locale } = useLocale();
  const { title, body, cta, skip } = getWelcomeContent(locale);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeModal, setActiveModal] = useState<'help' | 'about' | null>(null);

  const handleSkip = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    onDismiss();
  };

  const handleStartTutorial = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    onStartTutorial();
  };

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="welcome-overlay"
      onClick={handleSkip}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={cardRef}
        className="welcome-card"
        dir={locale === 'he' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* App icon area */}
        <div className="welcome-icon">
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--color-primary)' }}>
            history_edu
          </span>
        </div>

        <h2 className="welcome-title">{title}</h2>

        <div className="welcome-body">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button className="welcome-cta" onClick={handleStartTutorial}>
            {cta}
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginInlineStart: 6 }}>
              {locale === 'he' ? 'arrow_back' : 'arrow_forward'}
            </span>
          </button>

          <button className="welcome-skip" onClick={handleSkip} style={{ margin: 0 }}>
            {skip}
          </button>
        </div>

        <div className="welcome-footer-actions">
          <button
            className="welcome-footer-btn"
            onClick={() => setActiveModal('help')}
            aria-label="How to use"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
          </button>
          <button
            className="welcome-footer-btn"
            onClick={() => setActiveModal('about')}
            aria-label="About"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
          </button>
        </div>
      </div>

      {activeModal && (
        // Stop propagation so backdrop clicks don't also dismiss the welcome overlay
        <div onClick={(e) => e.stopPropagation()}>
          {(() => {
            const isMobile = window.innerWidth <= 767 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
            const { title: modalTitle, body: modalBody } =
              activeModal === 'help'
                ? getHelpContent(locale, isMobile)
                : getAboutContent(locale);
            return (
              <InfoCard
                title={modalTitle}
                body={modalBody}
                onClose={() => setActiveModal(null)}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

/** Returns true if the welcome overlay should be shown this session */
export function shouldShowWelcome(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

export default WelcomeOverlay;
