import PropTypes, { InferProps } from 'prop-types';
import { H3, Subtitle, Root, Header } from './SettingsSection.styled';

export interface SettingsSectionProps extends InferProps<typeof SettingsSectionPropTypes> {
  orientation?: 'horizontal' | 'vertical';
}

const SettingsSection = ({
  title,
  subtitle,
  children,
  className = '',
  hideBottomDivider = false,
  orientation = 'horizontal'
}: SettingsSectionProps) => (
  <Root className={className!} $hideBottomDivider={hideBottomDivider!} $orientation={orientation}>
    <Header>
      <H3>{title}</H3>
      {subtitle && <Subtitle data-testid="settings-subtitle">{subtitle}</Subtitle>}
    </Header>
    {children}
  </Root>
);

const SettingsSectionPropTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  className: PropTypes.string,
  hideBottomDivider: PropTypes.bool,
  children: PropTypes.node,
  orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};

SettingsSection.propTypes = SettingsSectionPropTypes;

export default SettingsSection;
