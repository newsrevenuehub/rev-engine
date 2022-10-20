import React from 'react';

import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';
import AddSlashToRoutes from 'components/routes/AddSlashToRoutes';
import GlobalLoading from 'elements/GlobalLoading';
import { BrowserRouter, Switch } from 'react-router-dom';

const RouterSetup = ({ children }) => (
  <BrowserRouter>
    <AddSlashToRoutes>
      <ChunkErrorBoundary>
        <React.Suspense fallback={<GlobalLoading />}>
          <Switch>{children}</Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </AddSlashToRoutes>
  </BrowserRouter>
);

export default RouterSetup;
