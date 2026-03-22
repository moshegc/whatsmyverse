import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './index.css'
import './App.css'
import App from './App.tsx'
import { LocaleProvider } from './LocaleContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
