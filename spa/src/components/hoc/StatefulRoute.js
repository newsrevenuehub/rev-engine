import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Components Wrapper with me will rerender every time the URL changes.
 * This is useful in places where we expect the same component to render, but with different content
 * based on the URL.
 */
function StatefulRoute({ children }) {
  const { pathname } = useLocation();
  return <React.Fragment key={pathname}>{children}</React.Fragment>;
}
export default StatefulRoute;
