import { MouseEvent, useMemo, useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ContactSupportOutlinedIcon from '@material-ui/icons/ContactSupportOutlined';
import SyncIcon from '@material-ui/icons/Sync';
import { useHistory } from 'react-router-dom';

import LogoutIcon from 'assets/icons/logout.svg';
import onLogout from 'components/authentication/logout';
import { FAQ_URL } from 'constants/helperUrls';
import { USER_ROLE_HUB_ADMIN_TYPE } from 'constants/authConstants';
import { SETTINGS } from 'routes';

import {
  Container,
  ModalHeader,
  Popover,
  Avatar,
  ListWrapper,
  MenuItem,
  ListItemIcon,
  Typography,
  LogoutIconWrapper,
  Divider
} from './AvatarMenu.styled';

export type AvatarMenuProps = InferProps<typeof AvatarMenuPropTypes>;

export const capitalizeInitial = (text?: string) => (text ? text[0].toUpperCase() : '');

const AvatarMenu = ({ user, className }: AvatarMenuProps) => {
  const history = useHistory();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'avatar-menu-popover' : undefined;

  const isHubAdmin = user?.role_type?.includes(USER_ROLE_HUB_ADMIN_TYPE);
  const userHasSingleOrg = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

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

  const handleIntegrations = () => {
    history.push(SETTINGS.INTEGRATIONS);
  };

  return (
    <>
      <Container open={open ? 'open' : ''} className={className!} onClick={handleClick} aria-label="Settings">
        <Avatar data-testid="avatar">{avatarInitials}</Avatar>
        <MoreVertIcon />
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
              <MenuItem onClick={handleIntegrations} aria-label="Integrations">
                <ListItemIcon>
                  <SyncIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="inherit">Integrations</Typography>
              </MenuItem>
              <Divider />
            </>
          )}
          <MenuItem onClick={handleFAQ} aria-label="FAQ">
            <ListItemIcon>
              <ContactSupportOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="inherit">FAQ</Typography>
          </MenuItem>
          <MenuItem onClick={onLogout} aria-label="Sign out">
            <ListItemIcon>
              <LogoutIconWrapper src={LogoutIcon} alt="Sign out" />
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
