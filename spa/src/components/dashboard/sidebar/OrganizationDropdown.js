import { useState } from 'react';
import * as S from './OrganizationDropdown.styled';
import { useAnimation } from 'framer-motion';
import { ICONS } from 'assets/icons/SvgIcon';

import useUser from 'hooks/useUser';

const chevronVariants = {
  open: { rotate: 90 },
  closed: { rotate: 270 }
};

const dropdownVariants = {
  open: { x: 0, opacity: 1, scale: 1, y: '50%' },
  closed: { x: -10, opacity: 0, scale: 0.7, y: '50%' }
};

function OrganizationDropdown() {
  const user = useUser();
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
            <S.Item></S.Item>
          </S.DropdownList>
        </S.Dropdown>
      </S.Wrapper>
      {open && <S.CloseOverlay onClick={closeMenu} />}
    </>
  );
}

export default OrganizationDropdown;
