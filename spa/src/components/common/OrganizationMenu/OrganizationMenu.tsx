import PropTypes, { InferProps } from 'prop-types';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';

import { Title, Flex, OrgWrapper, Divider, OrgIcon, IconWrapper } from './OrganizationMenu.styled';

export type OrganizationMenuProps = InferProps<typeof OrganizationMenuPropTypes>;

const OrganizationMenu = ({ title, className, hideBottomDivider }: OrganizationMenuProps) => (
  <Flex className={className!}>
    <OrgWrapper>
      <IconWrapper>
        <OrgIcon icon={faNewspaper} />
      </IconWrapper>
      <Title>{title}</Title>
    </OrgWrapper>
    {!hideBottomDivider && <Divider />}
  </Flex>
);

const OrganizationMenuPropTypes = {
  title: PropTypes.string.isRequired,
  className: PropTypes.string,
  hideBottomDivider: PropTypes.bool
};

OrganizationMenu.propTypes = OrganizationMenuPropTypes;

OrganizationMenu.defaultProps = {
  hideBottomDivider: false,
  className: ''
};

export default OrganizationMenu;
