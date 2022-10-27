import { MouseEvent, useMemo, useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ContactSupportOutlinedIcon from '@material-ui/icons/ContactSupportOutlined';

import LogoutIcon from 'assets/icons/logout.svg';
import onLogout from 'components/authentication/logout';

import {
  Container, ModalHeader, Popover, Avatar, ListWrapper,
  MenuItem, ListItemIcon, Typography, LogoutIconWrapper
} from './AvatarMenu.styled';

export type AvatarMenuProps = InferProps<typeof AvatarMenuPropTypes>

export const urlFAQ = 'https://news-revenue-hub.atlassian.net/servicedesk/customer/portal/11/article/2195423496'
export const capitalizeInitial = (text?: string) => text ? text[0].toUpperCase() : ''

const AvatarMenu = ({ user, className }: AvatarMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'grab link popover' : undefined;

  const avatarInitials = useMemo(() =>
    user?.firstName ? `${capitalizeInitial(user?.firstName || '')}${capitalizeInitial(user?.lastName || '')}` : `${capitalizeInitial(user?.email || '')}`,
    [user?.email, user?.firstName, user?.lastName])

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFAQ = () => {
    window.open(urlFAQ, '_blank', 'noopener, noreferrer');
  };

  return (
    <>
      <Container open={open ? 'open' : ''} className={className!} onClick={handleClick} aria-label='setting menu'>
        <Avatar data-testid='avatar'>{avatarInitials}</Avatar>
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
        <ListWrapper role='menu'>
          <MenuItem onClick={handleFAQ} aria-label='FAQ'>
            <ListItemIcon>
              <ContactSupportOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="inherit">FAQ</Typography>
          </MenuItem>
          <MenuItem onClick={onLogout} aria-label='Sign out'>
            <ListItemIcon>
              <LogoutIconWrapper src={LogoutIcon} alt="Sign out" />
            </ListItemIcon>
            <Typography variant="inherit">Sign out</Typography>
          </MenuItem>
        </ListWrapper>
      </Popover>
    </>
  )
};

const AvatarMenuPropTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string.isRequired
  }),
  className: PropTypes.string
};

AvatarMenu.propTypes = AvatarMenuPropTypes;

AvatarMenu.defaultProps = {
  className: '',
  user: undefined,
};

export default AvatarMenu;
