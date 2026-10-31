import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './main';
import { applyTenantCodeFromUrl } from './utils/tenant/tenant-host';

// 企业邀请链接等入口可能通过 `?tenantCode=` 传递租户，进入应用前先落盘。
applyTenantCodeFromUrl();

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
