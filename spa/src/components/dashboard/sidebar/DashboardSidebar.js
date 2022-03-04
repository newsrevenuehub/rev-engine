import { useState, useEffect, useRef } from 'react';
import * as S from './DashboardSidebar.styled';
import { ICONS } from 'assets/icons/SvgIcon';

// Hooks
import { useHistory, useRouteMatch, generatePath, matchPath } from 'react-router-dom';
import useScopedRoute from 'hooks/useScopedRoute';

// Util
import logout from 'components/authentication/logout';
import { DASHBOARD_ROUTES, useDashboardContext } from 'components/dashboard/Dashboard';

// Constants
import * as routes from 'routes';
import * as LSUtils from 'components/authentication/util';

// Components
import Select from 'elements/inputs/Select';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

function DashboardSidebar() {
  const availableOrganizations = useRef(LSUtils.getLSAvailableOrgs());
  const availableRevenuePrograms = useRef(LSUtils.getLSAvailableRPs());
  const [filteredRevenuePrograms, setFilteredRevenuePrograms] = useState([]);

  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedRevenueProgram, setSelectedRevenueProgram] = useState(null);

  const scopedContentRoute = useScopedRoute(routes.CONTENT_SLUG, DASHBOARD_ROUTES);
  const scopedDonationsRoute = useScopedRoute(routes.DONATIONS_SLUG, DASHBOARD_ROUTES);
  const scopedConnectRoute = useScopedRoute(routes.CONNECT_SLUG, DASHBOARD_ROUTES);

  return (
    <S.DashboardSidebar>
      <div>
        <S.Pickers>
          <OrganizationPicker
            availableOrganizations={availableOrganizations?.current}
            selectedOrganization={selectedOrganization}
            setSelectedOrganization={setSelectedOrganization}
          />
          <RevenueProgramPicker
            availableRevenuePrograms={availableRevenuePrograms?.current}
            filteredRevenuePrograms={filteredRevenuePrograms}
            setFilteredRevenuePrograms={setFilteredRevenuePrograms}
            selectedRevenueProgram={selectedRevenueProgram}
            setSelectedRevenueProgram={setSelectedRevenueProgram}
            selectedOrganization={selectedOrganization}
          />
        </S.Pickers>
        <S.NavList>
          <S.NavItem to={scopedContentRoute}>Content</S.NavItem>
          <S.NavItem to={scopedDonationsRoute}>Donations</S.NavItem>
          <S.NavItem to={scopedConnectRoute}>
            <span>Payment Provider</span>
            {selectedOrganization?.needs_payment_provider && <S.FlaggedIcon icon={faExclamationTriangle} />}
          </S.NavItem>
        </S.NavList>
      </div>
      <S.OtherContent>
        <S.Logout onClick={logout} whileHover={{ scale: 1.05, x: -3 }} whileTap={{ scale: 1, x: 0 }}>
          <S.LogoutIcon icon={ICONS.LOGOUT} />
          Sign out
        </S.Logout>
      </S.OtherContent>
    </S.DashboardSidebar>
  );
}

export default DashboardSidebar;

// exported for tests
export function OrganizationPicker({ availableOrganizations, selectedOrganization, setSelectedOrganization }) {
  const history = useHistory();
  const { params } = matchPath(history.location.pathname, { path: DASHBOARD_ROUTES.map((r) => r.path) }) || {};
  /**
   * 1. On first render, inspect localStorage for previously selected Organization and set it here if present
   */
  useEffect(() => {
    setSelectedOrganization((selectedOrg) => {
      if (!selectedOrg) {
        try {
          return LSUtils.getLSSelectedOrg();
        } catch {}
      }
      return selectedOrg;
    });
  }, [setSelectedOrganization]);

  /**
   * 2. Respond to changes to selectedOrganization by updating localStorage to the updated value
   */
  useEffect(() => {
    try {
      LSUtils.setLSSelectedOrg(JSON.stringify(selectedOrganization));
    } catch {
      LSUtils.setLSSelectedOrg(null);
    }
  }, [selectedOrganization]);

  /**
   * 3.
   */
  useEffect(() => {
    if (availableOrganizations.length === 1) {
      setSelectedOrganization(availableOrganizations[0]);
    }
  }, [availableOrganizations, setSelectedOrganization]);

  /**
   * 4. Finally, if the URL params include an orgSlug, set the selected value accordingly
   */
  useEffect(() => {
    if (params?.orgSlug) {
      const rp = availableOrganizations.find((rp) => rp.slug === params.orgSlug);
      if (rp) setSelectedOrganization(rp);
    }
  }, [params?.orgSlug, setSelectedOrganization, availableOrganizations]);

  return (
    <S.SelectWrapper>
      <Select
        label="Organization"
        placeholder="Select an organization"
        selectedItem={selectedOrganization}
        onSelectedItemChange={({ selectedItem }) => setSelectedOrganization(selectedItem)}
        displayAccessor="name"
        flaggedAccessor="needs_payment_provider"
        items={availableOrganizations}
        readOnly={availableOrganizations.length <= 1}
        highlighted={!selectedOrganization}
      />
    </S.SelectWrapper>
  );
}

// exported for tests
export function RevenueProgramPicker({
  availableRevenuePrograms,
  filteredRevenuePrograms,
  setFilteredRevenuePrograms,
  selectedRevenueProgram,
  setSelectedRevenueProgram,
  selectedOrganization
}) {
  const { setBlockMainContentReason } = useDashboardContext();
  const history = useHistory();
  const route = useRouteMatch();
  const { params } = matchPath(history.location.pathname, { path: DASHBOARD_ROUTES.map((r) => r.path) }) || {};

  /**
   * 1. Respond to changes to selectedOrganization by filtering the RevenueProgram options available based on the selected Organization
   */
  useEffect(() => {
    let rps = availableRevenuePrograms;
    if (selectedOrganization) {
      rps = availableRevenuePrograms.filter(
        (rp) => selectedOrganization && rp.organization === selectedOrganization.id
      );
    }
    setFilteredRevenuePrograms(rps);
  }, [selectedOrganization, availableRevenuePrograms, setFilteredRevenuePrograms]);

  /**
   * 2. Respond to changes to filteredRevenuePrograms by updating the selectedRevenueProgram if it doesn't belong to the selectedOrganization
   */
  useEffect(() => {
    setSelectedRevenueProgram((currentlySelectedRP) => {
      if (
        filteredRevenuePrograms.length > 0 &&
        currentlySelectedRP &&
        !filteredRevenuePrograms.find((rp) => rp.id === currentlySelectedRP.id)
      ) {
        return filteredRevenuePrograms[0];
      }
      return currentlySelectedRP;
    });
  }, [filteredRevenuePrograms, setSelectedRevenueProgram]);

  /**
   * 3. On first render, inspect localStorage for previously selected RevenueProgram and set it here if present
   * NOTE: This needs to run AFTER we filter by org and BEFORE we set the selectedRevenueProgram based on LS,
   * otherwise it get's "filtered out" by the intitial null selectedOrganization
   */
  useEffect(() => {
    setSelectedRevenueProgram((selectedRP) => {
      if (!selectedRP) {
        try {
          return LSUtils.getLSSelectedRP();
        } catch {}
      }
      return selectedRP;
    });
  }, [setSelectedRevenueProgram]);

  /**
   * 4. Respond to changes to selectedRevenueProgram by updating localStorage to the updated value
   */
  useEffect(() => {
    try {
      LSUtils.setLSSelectedRP(JSON.stringify(selectedRevenueProgram));
    } catch {
      LSUtils.setLSSelectedRP(null);
    }
  }, [selectedRevenueProgram]);

  /**
   * 5. Respond to changes to selectedOrganization and selectedRevenueProgram by navigating to a new url.
   */
  useEffect(() => {
    // Only update url when both Organization and RevenueProgram are set.
    if (selectedOrganization && selectedRevenueProgram) {
      const slug = negotiateTargetSlug(history.location.pathname);
      history.push(
        generatePath(slug, {
          orgSlug: selectedOrganization.slug,
          revProgramSlug: selectedRevenueProgram.slug
        }),
        { state: { refetch: true } }
      );
    }
  }, [selectedOrganization, selectedRevenueProgram, history, route.path]);

  /**
   * 6. Finally, if the URL params include a revProgramSlug the selected value accordingly
   */
  useEffect(() => {
    if (params?.revProgramSlug) {
      const rp = filteredRevenuePrograms.find((rp) => rp.slug === params.revProgramSlug);
      if (rp) setSelectedRevenueProgram(rp);
    }
  }, [params?.revProgramSlug, setSelectedRevenueProgram, filteredRevenuePrograms]);

  /**
   * Respond to changes to selectedRevenueProgram and freeze the UI if it's blank.
   */
  useEffect(() => {
    if (!selectedRevenueProgram) setBlockMainContentReason('Select an Organization and Revenue Program');
    else setBlockMainContentReason(false);
  }, [selectedRevenueProgram, setBlockMainContentReason]);

  return (
    <S.SelectWrapper>
      <Select
        label="Revenue Program"
        placeholder={selectedOrganization ? 'Select a revenue program' : 'Select an organization first'}
        selectedItem={selectedRevenueProgram}
        displayAccessor="name"
        onSelectedItemChange={({ selectedItem }) => setSelectedRevenueProgram(selectedItem)}
        items={filteredRevenuePrograms}
        readOnly={filteredRevenuePrograms.length <= 1}
        highlighted={!selectedRevenueProgram}
      />
    </S.SelectWrapper>
  );
}

function slugPart(slugPart) {
  return `/${slugPart}`;
}

// TODO: This could probably be refactored to work without manually adding routes in an if statement.
// As it exists now, any time you add a route the sidebar you'll have to add it here as well.
function negotiateTargetSlug(path) {
  const splitPath = path.split('/');
  const pathEnd = splitPath[splitPath.length - 1];

  if (path === '/' || slugPart(pathEnd) === routes.CONTENT_SLUG_PART) {
    return routes.CONTENT_SLUG;
  }

  if (slugPart(pathEnd) === routes.DONATIONS_SLUG_PART) {
    return routes.DONATIONS_SLUG;
  }

  if (slugPart(pathEnd) === routes.CONNECT_SLUG_PART) {
    return routes.CONNECT_SLUG;
  }

  // Fallback to content
  return routes.CONTENT_SLUG;
}
