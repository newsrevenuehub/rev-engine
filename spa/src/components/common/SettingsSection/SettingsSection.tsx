import PropTypes, { InferProps } from 'prop-types';

import { Title, Subtitle, Flex, Left, Right } from './SettingsSection.styled';

export type SettingsSectionProps = InferProps<typeof SettingsSectionPropTypes>;

const SettingsSection = ({ title, subtitle, className, hideBottomDivider, children }: SettingsSectionProps) => (
  <Flex className={className!} $hideBottomDivider={hideBottomDivider!}>
    <Left>
      <Title>{title}</Title>
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

SettingsSection.defaultProps = {
  hideBottomDivider: false,
  className: ''
};

export default SettingsSection;
