import PropTypes, { InferProps } from 'prop-types';

import { H3, Subtitle, Flex, Left, Right } from './SettingsSection.styled';

export type SettingsSectionProps = InferProps<typeof SettingsSectionPropTypes>;

const SettingsSection = ({
  title,
  subtitle,
  children,
  className = '',
  hideBottomDivider = false
}: SettingsSectionProps) => (
  <Flex className={className!} $hideBottomDivider={hideBottomDivider!}>
    <Left>
      <H3>{title}</H3>
      {subtitle && <Subtitle data-testid="settings-subtitle">{subtitle}</Subtitle>}
    </Left>
    {children && <Right>{children}</Right>}
  </Flex>
);

const SettingsSectionPropTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  className: PropTypes.string,
  hideBottomDivider: PropTypes.bool,
  children: PropTypes.node
};

SettingsSection.propTypes = SettingsSectionPropTypes;

export default SettingsSection;
