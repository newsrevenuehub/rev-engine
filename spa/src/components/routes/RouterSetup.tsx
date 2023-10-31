import { ReactNode } from 'react';

import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';
import AddSlashToRoutes from 'components/routes/AddSlashToRoutes';
import { Switch } from 'react-router-dom';

const RouterSetup = ({ children }: { children: ReactNode }) => (
  <AddSlashToRoutes>
    <ChunkErrorBoundary>
      <Switch>{children}</Switch>
    </ChunkErrorBoundary>
  </AddSlashToRoutes>
);

export default RouterSetup;
