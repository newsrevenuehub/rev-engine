import { useState } from 'react';
import * as S from './OrganizationDropdown.styled';
import { useAnimation } from 'framer-motion';
import { ICONS } from 'assets/icons/SvgIcon';

import logout from 'components/authentication/logout';
import useUser from 'hooks/useUser';

// Router
import { useHistory } from 'react-router';
import { ORG_SLUG } from 'routes';

const chevronVariants = {
  open: { rotate: 180 },
  closed: { rotate: 0 }
};

const dropdownVariants = {
  open: { opacity: 1, scale: 1 },
  closed: { opacity: 0, scale: 0.5 }
};

function OrganizationDropdown() {
  const user = useUser();
  const history = useHistory();
  const controls = useAnimation();
  const [open, setOpen] = useState(false);

  const toggleMenuOpen = () => {
    if (open) {
      controls.start('closed');
    } else {
      controls.start('open');
    }
    setOpen(!open);
  };

  const closeMenu = () => {
    controls.start('closed');
    setOpen(false);
  };

  const handleOrganizationClick = () => {
    toggleMenuOpen();
    history.push(`/${ORG_SLUG}`);
  };

  const handleLogoutClick = () => {
    toggleMenuOpen();
    logout();
  };

  return (
    <>
      <S.Wrapper>
        <S.Button onClick={toggleMenuOpen}>
          <span>{user?.organization?.name || 'Organization'}</span>
          <S.IconWrap initial="closed" animate={controls} variants={chevronVariants}>
            <S.Chevron icon={ICONS.CHEVRON} />
          </S.IconWrap>
        </S.Button>
        <S.Dropdown initial="closed" animate={controls} variants={dropdownVariants}>
          <S.DropdownList>
            <S.Item onClick={handleOrganizationClick}>Organization</S.Item>
            <S.Item onClick={handleLogoutClick}>
              <S.LogoutItem>
                Sign out
                <S.LogoutIcon icon={ICONS.LOGOUT} />
              </S.LogoutItem>
            </S.Item>
          </S.DropdownList>
        </S.Dropdown>
      </S.Wrapper>
      {open && <S.CloseOverlay onClick={closeMenu} />}
    </>
  );
}

export default OrganizationDropdown;
