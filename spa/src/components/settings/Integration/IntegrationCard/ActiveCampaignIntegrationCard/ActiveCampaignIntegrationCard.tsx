import { ChangeEvent, useMemo } from 'react';
import { RouterLinkButton } from 'components/base';
import FeatureBadge from 'components/common/Badge/FeatureBadge/FeatureBadge';
import ActiveCampaignModal from './ActiveCampaignModal/ActiveCampaignModal';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';
import useModal from 'hooks/useModal';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import IntegrationCard from '../IntegrationCard';
import { cardProps } from './shared-props';
import CoreConnectionModal from './CoreConnectionModal/CoreConnectionModal';

export function ActiveCampaignIntegrationCard() {
  const { handleClose: handleMainModalClose, handleOpen: handleMainModalOpen, open: mainModalOpen } = useModal();
  const {
    handleClose: handleCoreConnectionModalClose,
    handleOpen: handleCoreConnectionModalOpen,
    open: coreConnectionModalOpen
  } = useModal();
  const { activecampaign_integration_connected } = useConnectActiveCampaign();
  const { user } = useUser();
  const orgPlan = useMemo(() => user?.organizations[0].plan.name, [user?.organizations]);

  function handleCardChange(_: ChangeEvent, checked: boolean) {
    if (!checked) {
      return;
    }

    if (orgPlan === 'CORE') {
      handleCoreConnectionModalOpen();
    } else {
      // TODO implementation
    }
  }

  function handleMainModalStartsCoreConnection() {
    handleMainModalClose();
    handleCoreConnectionModalOpen();
  }

  return (
    <>
      <IntegrationCard
        {...cardProps}
        cornerMessage={orgPlan === 'FREE' && <FeatureBadge type="CORE" />}
        disabled={false}
        isActive={activecampaign_integration_connected}
        onChange={handleCardChange}
        onViewDetails={handleMainModalOpen}
        rightAction={
          orgPlan === 'FREE' && (
            <RouterLinkButton color="primaryDark" to={SETTINGS.SUBSCRIPTION}>
              Upgrade
            </RouterLinkButton>
          )
        }
      />
      {orgPlan && (
        <ActiveCampaignModal
          onClose={handleMainModalClose}
          onStartCoreConnection={handleMainModalStartsCoreConnection}
          open={mainModalOpen}
          orgPlan={orgPlan}
        />
      )}
      <CoreConnectionModal onClose={handleCoreConnectionModalClose} open={coreConnectionModalOpen} />
    </>
  );
}

export default ActiveCampaignIntegrationCard;
