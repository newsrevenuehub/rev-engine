import { useMemo } from 'react';
import { RouterLinkButton } from 'components/base';
import FeatureBadge from 'components/common/Badge/FeatureBadge/FeatureBadge';
import ActiveCampaignModal from './ActiveCampaignModal/ActiveCampaignModal';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';
import useModal from 'hooks/useModal';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import IntegrationCard from '../IntegrationCard';
import { cardProps } from './shared-props';

export function ActiveCampaignIntegrationCard() {
  const { handleClose, handleOpen, open } = useModal();
  const { data } = useConnectActiveCampaign();
  const { user } = useUser();
  const orgPlan = useMemo(() => user?.organizations[0].plan.name, [user?.organizations]);

  return (
    <>
      <IntegrationCard
        {...cardProps}
        isActive={data?.activecampaign_integration_connected}
        cornerMessage={orgPlan === 'FREE' && <FeatureBadge type="CORE" />}
        disabled
        onViewDetails={handleOpen}
        rightAction={
          orgPlan === 'FREE' && (
            <RouterLinkButton color="primaryDark" to={SETTINGS.SUBSCRIPTION}>
              Upgrade
            </RouterLinkButton>
          )
        }
      />
      {orgPlan && <ActiveCampaignModal onClose={handleClose} open={open} orgPlan={orgPlan} />}
    </>
  );
}

export default ActiveCampaignIntegrationCard;
