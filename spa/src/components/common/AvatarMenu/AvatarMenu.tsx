import PropTypes, { InferProps } from 'prop-types';
import { MouseEvent, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { ReactComponent as LogoutIcon } from '@material-design-icons/svg/filled/logout.svg';
import { ReactComponent as MoreVertIcon } from '@material-design-icons/svg/filled/more_vert.svg';
import { ReactComponent as SyncIcon } from '@material-design-icons/svg/filled/sync.svg';
import { ReactComponent as ContactSupportOutlinedIcon } from '@material-design-icons/svg/outlined/contact_support.svg';
import { ReactComponent as Lan } from '@material-design-icons/svg/outlined/lan.svg';
import { ReactComponent as PersonIcon } from '@material-design-icons/svg/filled/person.svg';

import onLogout from 'components/authentication/logout';
import { USER_ROLE_HUB_ADMIN_TYPE } from 'constants/authConstants';
import { FAQ_URL } from 'constants/helperUrls';
import { SETTINGS } from 'routes';

import {
  Avatar,
  Container,
  Divider,
  ListItemIcon,
  ListWrapper,
  MenuItem,
  ModalHeader,
  Popover,
  Typography
} from './AvatarMenu.styled';

export type AvatarMenuProps = InferProps<typeof AvatarMenuPropTypes>;

export const capitalizeInitial = (text?: string) => (text ? text[0].toUpperCase() : '');

const AvatarMenu = ({ user, className }: AvatarMenuProps) => {
  const history = useHistory();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'avatar-menu-popover' : undefined;

  const isHubAdmin = user?.role_type?.includes(USER_ROLE_HUB_ADMIN_TYPE);
  const userHasSingleOrg = user?.organizations?.length === 1;

  const avatarInitials = useMemo(
    () =>
      user?.firstName
        ? `${capitalizeInitial(user?.firstName || '')}${capitalizeInitial(user?.lastName || '')}`
        : `${capitalizeInitial(user?.email || '')}`,
    [user?.email, user?.firstName, user?.lastName]
  );

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFAQ = () => {
    window.open(FAQ_URL, '_blank', 'noopener, noreferrer');
  };

  const goTo = (url: string) => {
    history.push(url);
  };

  return (
    <>
      <Container open={open ? 'open' : ''} className={className!} onClick={handleClick} aria-label="Settings">
        <Avatar data-testid="avatar">{avatarInitials}</Avatar>
        <MoreVertIcon aria-hidden />
      </Container>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <ModalHeader>Settings</ModalHeader>
        <ListWrapper role="menu">
          {userHasSingleOrg && !isHubAdmin && (
            <>
              <MenuItem onClick={() => goTo(SETTINGS.SUBSCRIPTION)} aria-labelledby="account-label">
                <ListItemIcon>
                  <PersonIcon fontSize="small" aria-hidden />
                </ListItemIcon>
                <Typography id="account-label" variant="inherit">
                  Account
                </Typography>
              </MenuItem>
              <MenuItem onClick={() => goTo(SETTINGS.ORGANIZATION)} aria-labelledby="account-organization">
                <ListItemIcon>
                  <Lan aria-hidden />
                </ListItemIcon>
                <Typography id="account-organization" variant="inherit">
                  Organization
                </Typography>
              </MenuItem>
              <MenuItem onClick={() => goTo(SETTINGS.INTEGRATIONS)} aria-labelledby="account-integrations">
                <ListItemIcon>
                  <SyncIcon fontSize="small" aria-hidden />
                </ListItemIcon>
                <Typography id="account-integrations" variant="inherit">
                  Integrations
                </Typography>
              </MenuItem>
              <Divider />
            </>
          )}
          <MenuItem onClick={handleFAQ} aria-labelledby="faq">
            <ListItemIcon>
              <ContactSupportOutlinedIcon fontSize="small" aria-hidden />
            </ListItemIcon>
            <Typography id="faq" variant="inherit">
              FAQ
            </Typography>
          </MenuItem>
          <MenuItem onClick={onLogout} aria-label="Sign out">
            <ListItemIcon>
              <LogoutIcon aria-hidden />
            </ListItemIcon>
            <Typography variant="inherit">Sign out</Typography>
          </MenuItem>
        </ListWrapper>
      </Popover>
    </>
  );
};

const AvatarMenuPropTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string.isRequired,
    organizations: PropTypes.arrayOf(PropTypes.object),
    role_type: PropTypes.arrayOf(PropTypes.string)
  }),
  className: PropTypes.string
};

AvatarMenu.propTypes = AvatarMenuPropTypes;

AvatarMenu.defaultProps = {
  className: ''
};

export default AvatarMenu;
