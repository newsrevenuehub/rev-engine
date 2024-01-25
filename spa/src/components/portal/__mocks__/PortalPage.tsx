import { ReactNode } from 'react';

export const PortalPage = ({ children }: { children: ReactNode }) => (
  <div data-testid="mock-portal-page">{children}</div>
);

export default PortalPage;
