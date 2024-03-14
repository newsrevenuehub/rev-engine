import PropTypes, { InferProps } from 'prop-types';
import Newspaper from '@material-design-icons/svg/filled/newspaper.svg?react';
import { Title, Flex, OrgWrapper, Divider, IconWrapper } from './OrganizationMenu.styled';

export type OrganizationMenuProps = InferProps<typeof OrganizationMenuPropTypes>;

const OrganizationMenu = ({ title, className, hideBottomDivider }: OrganizationMenuProps) => (
  <Flex className={className!}>
    <OrgWrapper>
      <IconWrapper>
        <Newspaper />
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
