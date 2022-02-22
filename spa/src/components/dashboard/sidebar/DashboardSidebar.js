import { useState, useEffect } from 'react';
import * as S from './DashboardSidebar.styled';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';
import { ICONS } from 'assets/icons/SvgIcon';

// Hooks
import { useHistory, useParams, useRouteMatch, generatePath, matchPath } from 'react-router-dom';
import usePreviousState from 'hooks/usePreviousState';

// Util
import logout from 'components/authentication/logout';
import { DASHBOARD_ROUTES } from 'components/dashboard/Dashboard';

// AJAX
import useRequest from 'hooks/useRequest';
import { ORGANIZATIONS, REVENUE_PROGRAMS } from 'ajax/endpoints';

// Components
import Select from 'elements/inputs/Select';
import { LS_USER } from 'settings';
import { getLSOrg, getLSRP } from 'components/authentication/util';
import { useGlobalContext } from 'components/MainLayout';

function DashboardSidebar({ shouldAllowDashboard }) {
  const [organization, setOrganization] = useState({});

  const handleClick = (e) => {
    if (!shouldAllowDashboard) e.preventDefault();
  };

  return (
    <S.DashboardSidebar>
      <div>
        <S.Pickers>
          <OrganizationPicker selectedOrganization={organization} setSelectedOrganization={setOrganization} />
          <RevenueProgramPicker selectedOrganization={organization} />
        </S.Pickers>
        <S.NavList>
          <S.NavItem to={CONTENT_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
            Content
          </S.NavItem>
          <S.NavItem to={DONATIONS_SLUG} onClick={handleClick} disabled={!shouldAllowDashboard}>
            Donations
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

function OrganizationPicker({ selectedOrganization, setSelectedOrganization }) {
  const history = useHistory();
  const { params } = matchPath(history.location.pathname, { path: DASHBOARD_ROUTES.map((r) => r.path) }) || {};

  const requestFetchOrganizations = useRequest();
  const [error, setError] = useState();
  const [organizations, setOrganizations] = useState([]);

  const lsUser = JSON.parse(localStorage.getItem(LS_USER) || '');
  const userRole = lsUser?.role_assignment?.role_type;

  useEffect(() => {
    if (organizations) {
      const orgByUrl = organizations.find((org) => org.slug === params?.orgSlug);
      setSelectedOrganization(orgByUrl);
    }
  }, [organizations, params?.orgSlug, setSelectedOrganization]);

  useEffect(() => {
    if (userRole === 'hub_admin') {
      requestFetchOrganizations(
        { method: 'GET', url: ORGANIZATIONS },
        {
          onSuccess: ({ data }) => setOrganizations(data),
          onFailure: (err) => setError(err?.response?.detail)
        }
      );
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'hub_admin' && params?.orgSlug) {
      const orgBySlug = organizations.find((org) => org.slug === params?.orgSlug);
      setSelectedOrganization(orgBySlug);
    }
  }, [userRole, organizations, params?.orgSlug, setSelectedOrganization]);

  return (
    <S.SelectWrapper>
      <Select
        label="Organization"
        placeholder="Select an organization"
        selectedItem={selectedOrganization}
        onSelectedItemChange={({ selectedItem }) => setSelectedOrganization(selectedItem)}
        displayAccessor="name"
        items={organizations}
        errors={error}
        readOnly={organizations.length <= 1}
        highlighted={!selectedOrganization}
      />
    </S.SelectWrapper>
  );
}

function RevenueProgramPicker({ selectedOrganization }) {
  const { setBlockMainContentReason } = useGlobalContext();
  const history = useHistory();
  const route = useRouteMatch();
  const { params } = matchPath(history.location.pathname, { path: DASHBOARD_ROUTES.map((r) => r.path) }) || {};

  const { revProgramSlug } = useParams();
  const prevRevProgramSlug = usePreviousState(revProgramSlug);
  const prevOrganization = usePreviousState(selectedOrganization);
  const requestFetchRevenuePrograms = useRequest();
  const [error, setError] = useState();
  const [revenuePrograms, setRevenuePrograms] = useState([]);
  const [selectedRevenueProgram, setSelectedRevenueProgram] = useState({});

  const lsUser = JSON.parse(localStorage.getItem(LS_USER) || '');
  const userRole = lsUser?.role_assignment?.role_type;

  useEffect(() => {
    if (revenuePrograms) {
      const rpByURL = revenuePrograms.find((rp) => rp.slug === params?.revProgramSlug);
      setSelectedRevenueProgram(rpByURL);
    }
  }, [revenuePrograms, params?.revProgramSlug, setSelectedRevenueProgram]);

  useEffect(() => {
    const userCanSeeAnyRP = userRole !== 'rp_admin';
    if (userCanSeeAnyRP && selectedOrganization?.id && prevOrganization?.id !== selectedOrganization?.id) {
      requestFetchRevenuePrograms(
        { method: 'GET', url: REVENUE_PROGRAMS, params: { orgSlug: selectedOrganization.slug } },
        {
          onSuccess: ({ data }) => setRevenuePrograms(data),
          onFailure: (err) => setError(err?.response?.detail)
        }
      );
    }
  }, [prevOrganization?.id, userRole, selectedOrganization]);

  useEffect(() => {
    console.log('org', selectedOrganization);
    console.log('rp', selectedRevenueProgram);
    if (selectedOrganization && selectedRevenueProgram) setBlockMainContentReason(false);
    else setBlockMainContentReason('Select an Organization and Revenue Program');
  }, [selectedRevenueProgram, selectedOrganization, setBlockMainContentReason]);

  // useEffect(() => {
  //   if (!prevRevProgramSlug || revProgramSlug !== prevRevProgramSlug) {
  //     const rpBySlug = revenuePrograms.find(rp => rp.slug === revProgramSlug);
  //     setSelectedRevenueProgram(rpBySlug)
  //   }
  // }, [prevRevProgramSlug, lsUser?.is_superuser, revProgramSlug, revenuePrograms])

  /**
   * Update route based on org and rp
   */
  useEffect(() => {
    if (selectedOrganization?.slug && selectedRevenueProgram?.slug) {
      if (route.path === '/') {
        history.push(
          generatePath(CONTENT_SLUG, {
            orgSlug: selectedOrganization.slug,
            revProgramSlug: selectedRevenueProgram.slug
          })
        );
      } else {
        console.log('OY, REAL PATH HERE THO!');
      }
    }
  }, [selectedRevenueProgram, selectedOrganization, history, route.path]);

  return (
    <S.SelectWrapper>
      <Select
        label="Revenue Program"
        placeholder={selectedOrganization ? 'Select a revenue program' : 'Select and organization first'}
        selectedItem={selectedRevenueProgram}
        displayAccessor="name"
        onSelectedItemChange={({ selectedItem }) => setSelectedRevenueProgram(selectedItem)}
        items={revenuePrograms}
        readOnly={revenuePrograms.length <= 1}
        errors={error}
        highlighted={!selectedRevenueProgram}
      />
    </S.SelectWrapper>
  );
}

// function getInitialOrganization(organizationSlug) {
//   // Use LS_ORG first, then LS_USER.role_assignment.organization
//   const lsOrg = getLSOrg()
//   const lsUser = JSON.parse(localStorage.getItem(LS_USER) || "")

//   return lsOrg || lsUser?.role_assignment?.organization
// }

// function getInitialRevenueProgram() {
//   return getLSRP() || {}
// }

// function getInitialRevenuePrograms() {
//   const lsUser = JSON.parse(localStorage.getItem(LS_USER) || "");
//   return lsUser?.role_assignment?.revenue_programs || []
// }
