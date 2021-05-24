import { ICONS } from 'assets/icons/SvgIcon';
import * as S from './BaseProviderInfo.styled';

export const PP_STATES = {
  CONNECTED: 'CONNECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  RESTRICTED: 'RESTRICTED',
  FAILED: 'FAILED'
};

function BaseProviderInfo({ logo, providerStatus, children, ...props }) {
  // A provider is either connected, restricted, failed, or not connected
  const getIcon = () => {
    if (providerStatus === PP_STATES.CONNECTED) return ICONS.CHECK_CIRCLE;
    if (providerStatus === PP_STATES.RESTRICTED || providerStatus === PP_STATES.FAILED) return ICONS.TIMES_CIRCLE;
  };

  return (
    <S.BaseProviderInfo {...props}>
      <S.LeftContent>
        <S.ProviderLogo src={logo} />
        {providerStatus !== PP_STATES.NOT_CONNECTED && <S.SvgIcon icon={getIcon()} />}
      </S.LeftContent>
      <S.RightContent>{children}</S.RightContent>
    </S.BaseProviderInfo>
  );
}

export default BaseProviderInfo;
