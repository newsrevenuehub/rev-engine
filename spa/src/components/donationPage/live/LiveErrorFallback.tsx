import { useTranslation } from 'react-i18next';
import { Wrapper, FiveHundred, Description, Content } from './LiveErrorFallback.styled';

function LiveErrorFallback() {
  const { t } = useTranslation();

  return (
    <Wrapper data-testid="500-something-wrong">
      <Content>
        <FiveHundred>500</FiveHundred>
        <Description>{t('common.error.internalServerError')}</Description>
      </Content>
    </Wrapper>
  );
}

export default LiveErrorFallback;
