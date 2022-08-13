import * as S from './ConnectStripeToast.styled';

// Assets
import StripeLogo from 'assets/icons/stripeLogo.svg';

const ConnectStripeToast = () => {
  return (
    <S.ConnectStripeToast data-testid={'connect-stripe-toast'}>
      <S.StripeLogo src={StripeLogo} />
      <S.Heading>Connect to Stripe</S.Heading>
      <S.Description>
        Ready to publish your first donation page? Publish by creating and connect to Stripe in one easy step.
      </S.Description>
      <S.Button>Connect Now</S.Button>
    </S.ConnectStripeToast>
  );
};

export default ConnectStripeToast;
