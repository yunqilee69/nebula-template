import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './main';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Nebula Web requires a #root element to render.');
}

export const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
