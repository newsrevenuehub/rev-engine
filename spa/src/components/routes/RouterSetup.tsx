import { ReactNode, Suspense } from 'react';

import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';
import AddSlashToRoutes from 'components/routes/AddSlashToRoutes';
import GlobalLoading from 'elements/GlobalLoading';
import { Switch } from 'react-router-dom';

const RouterSetup = ({ children }: { children: ReactNode }) => (
  <AddSlashToRoutes>
    <ChunkErrorBoundary>
      <Suspense fallback={<GlobalLoading />}>
        <Switch>{children}</Switch>
      </Suspense>
    </ChunkErrorBoundary>
  </AddSlashToRoutes>
);

export default RouterSetup;
