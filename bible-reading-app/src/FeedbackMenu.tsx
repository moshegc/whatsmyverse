// src/FeedbackMenu.tsx
//
// Megaphone header icon that opens a small dropdown menu with feedback
// options. Each option offers two destinations: a GitHub issue/discussion
// (requires a GitHub account) and an optional Google Form (no account needed).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from './LocaleContext';
import { t, type Locale } from './i18n';
import { GITHUB_REPO, GOOGLE_FORMS } from './config';
import { GitHubIcon, GoogleIcon } from './BrandIcons';

interface FeedbackEntry {
  icon: string;
  labelKey: 'feedbackBugReport' | 'feedbackDataFix' | 'feedbackSuggestion';
  githubUrl: string;
  formUrl: string;
}

// GitHub issue forms have no built-in localization, so we author separate
// Hebrew template files and pick between them based on the app's locale.
function getFeedbackEntries(locale: Locale): FeedbackEntry[] {
  const bugReportTemplate = locale === 'he' ? 'bug_report_he.yml' : 'bug_report.yml';
  const dataFixTemplate = locale === 'he' ? 'data_fix_he.yml' : 'data_fix.yml';
  return [
    {
      icon: 'bug_report',
      labelKey: 'feedbackBugReport',
      githubUrl: `https://github.com/${GITHUB_REPO}/issues/new?template=${bugReportTemplate}&labels=bug`,
      formUrl: GOOGLE_FORMS.bugReport[locale],
    },
    {
      icon: 'edit_note',
      labelKey: 'feedbackDataFix',
      githubUrl: `https://github.com/${GITHUB_REPO}/issues/new?template=${dataFixTemplate}&labels=data`,
      formUrl: GOOGLE_FORMS.dataFix[locale],
    },
    {
      icon: 'lightbulb',
      labelKey: 'feedbackSuggestion',
      githubUrl: `https://github.com/${GITHUB_REPO}/discussions/new?category=ideas`,
      formUrl: GOOGLE_FORMS.suggestion[locale],
    },
  ];
}

function FeedbackMenu() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const feedbackEntries = useMemo(() => getFeedbackEntries(locale), [locale]);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="feedback-menu" ref={containerRef}>
      <button
        className="header-icon-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('feedback', locale)}
        title={t('feedback', locale)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">campaign</span>
      </button>
      {open && (
        <div
          className="feedback-menu-dropdown"
          role="menu"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {feedbackEntries.map((entry) => (
            <div className="feedback-menu-row" key={entry.labelKey}>
              <span className="feedback-menu-label">
                <span className="material-symbols-outlined">{entry.icon}</span>
                {t(entry.labelKey, locale)}
              </span>
              <span className="feedback-menu-links">
                <a
                  className="feedback-menu-chip"
                  role="menuitem"
                  href={entry.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  title="GitHub"
                  onClick={() => setOpen(false)}
                >
                  <GitHubIcon />
                </a>
                {entry.formUrl && (
                  <a
                    className="feedback-menu-chip"
                    role="menuitem"
                    href={entry.formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('feedbackForm', locale)}
                    title={t('feedbackForm', locale)}
                    onClick={() => setOpen(false)}
                  >
                    <GoogleIcon />
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedbackMenu;
