import { useTranslation } from 'react-i18next';
import { Heading, Message, Root } from './LiveErrorFallback.styled';

function LiveErrorFallback() {
  const { t } = useTranslation();

  return (
    <Root data-testid="live-error-fallback">
      <Heading>{t('common.error.internalError.heading')}</Heading>
      <Message>{t('common.error.internalError.message')}</Message>
    </Root>
  );
}

export default LiveErrorFallback;
