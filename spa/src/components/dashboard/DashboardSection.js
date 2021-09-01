import { useState } from 'react';
import * as S from './DashboardSection.styled';
import { accordionAnimation } from 'components/content/pages/Pages.styled';
import PropTypes from 'prop-types';

// Deps
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence } from 'framer-motion';

function DashboardSection({ children, heading, collapsible, ...props }) {
  const [collapsed, setCollapsed] = useState(false);

  const handleClickHeading = () => {
    if (!collapsible) return;
    setCollapsed(!collapsed);
  };

  return (
    <S.DashboardSection {...props} layout>
      <S.SectionHeading layout collapsible={collapsible} onClick={handleClickHeading}>
        {heading && <h2>{heading}</h2>}
        {collapsible && <S.Chevron icon={faChevronDown} collapsed={collapsed} />}
      </S.SectionHeading>
      <AnimatePresence>
        {(!collapsible || !collapsed) && (
          <S.SectionContent layout {...accordionAnimation}>
            {children}
          </S.SectionContent>
        )}
      </AnimatePresence>
    </S.DashboardSection>
  );
}

DashboardSection.propTypes = {
  heading: PropTypes.string,
  /** Whether or not clicking the heading section will collapse content */
  collapsible: PropTypes.bool
};

DashboardSection.defaultProps = {
  collapsible: false
};

export default DashboardSection;
