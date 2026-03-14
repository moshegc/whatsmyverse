// src/App.tsx

import TimelineView from './TimelineView';
import { useLocale } from './LocaleContext';
import { t } from './i18n';

function App() {
  const { locale } = useLocale();

  return (
    <div style={{ height: '100%', width: '100%' }} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <h1>{t('appTitle', locale)}</h1>
      <TimelineView />
    </div>
  );
}

export default App;
