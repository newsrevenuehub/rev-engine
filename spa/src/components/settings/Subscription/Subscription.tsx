import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import PropTypes, { InferProps } from 'prop-types';
import { Wrapper } from './Subscription.styled';

const SubscriptionPropTypes = {};

export type SubscriptionProps = InferProps<typeof SubscriptionPropTypes>;

export function Subscription(props: SubscriptionProps) {
  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SettingsSection title="Subscription" subtitle="View and manage your plan." />
    </Wrapper>
  );
}

Subscription.propTypes = SubscriptionPropTypes;
export default Subscription;
