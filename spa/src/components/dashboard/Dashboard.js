import { useState, useRef, createContext, useContext } from 'react';
import * as S from './Dashboard.styled';

// Routing
import { Route } from 'react-router-dom';
import { DONATIONS_SLUG, CONTENT_SLUG, CONNECT_SLUG } from 'routes';

// State

// Children
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import ProviderConnect from 'components/connect/ProviderConnect';
import MainContentBlocker from 'elements/MainContentBlocker';
import ReauthModal from 'components/authentication/ReauthModal';
import StatefulRoute from 'components/hoc/StatefulRoute';

export const DASHBOARD_ROUTES = [
  {
    path: CONTENT_SLUG,
    component: Content
  },
  {
    path: DONATIONS_SLUG,
    component: Donations
  },
  {
    path: CONNECT_SLUG,
    component: ProviderConnect
  }
];

const DashboardContext = createContext(null);

function Dashboard() {
  const [blockMainContentReason, setBlockMainContentReason] = useState(false);
  const [reauthModalOpen, setReauthModalOpen] = useState(false);
  // Store reauth callbacks in ref to persist between renders
  const reauthCallbacks = useRef([]);

  const getReauth = (cb) => {
    /*
      getReauth can be called multiple times per-load. Because of this,
      store references to the callbacks provided each time and call them
      later.
    */
    reauthCallbacks.current.push(cb);
    setReauthModalOpen(true);
  };

  const closeReauthModal = () => {
    // Don't forget to clear out the refs when the modal closes.
    reauthCallbacks.current = [];
    setReauthModalOpen(false);
  };

  return (
    <DashboardContext.Provider
      value={{
        getReauth,
        closeReauthModal,
        blockMainContentReason,
        setBlockMainContentReason
      }}
    >
      <>
        <S.Dashboard data-testid="dashboard">
          <DashboardSidebar />
          <S.DashboardMain>
            <S.DashboardContent>
              {DASHBOARD_ROUTES.map(({ path, component: RoutedComponent }) => (
                <Route path={path} key={path}>
                  <StatefulRoute>
                    <RoutedComponent />
                  </StatefulRoute>
                </Route>
              ))}
            </S.DashboardContent>
            {blockMainContentReason && <MainContentBlocker message={blockMainContentReason} />}
          </S.DashboardMain>
        </S.Dashboard>

        <ReauthModal isOpen={reauthModalOpen} callbacks={reauthCallbacks.current} closeModal={closeReauthModal} />
      </>
    </DashboardContext.Provider>
  );
}

export const useDashboardContext = () => useContext(DashboardContext);

export default Dashboard;
