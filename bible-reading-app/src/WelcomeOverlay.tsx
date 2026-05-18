// src/WelcomeOverlay.tsx
//
// Full-screen welcome overlay shown once per browser session.
// Dismissed by clicking the CTA button or the backdrop.

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { getWelcomeContent } from './infoContent';

const SESSION_KEY = 'welcomeSeen';

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { locale } = useLocale();
  const { title, body, cta } = getWelcomeContent(locale);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    onDismiss();
  };

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="welcome-overlay"
      onClick={handleDismiss}
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

        <button className="welcome-cta" onClick={handleDismiss}>
          {cta}
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginInlineStart: 6 }}>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

/** Returns true if the welcome overlay should be shown this session */
export function shouldShowWelcome(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

export default WelcomeOverlay;
