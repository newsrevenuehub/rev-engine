import * as S from './Logobar.styled';

import StripeLogo from 'assets/images/account/client-logos/stripe-logo.png';
import DigestbuilderLogo from 'assets/images/account/client-logos/digestbuilder-logo.png';
import EvenbriteLogo from 'assets/images/account/client-logos/eventbrite-logo.png';
import MailchimpLogo from 'assets/images/account/client-logos/mailchimp-logo.png';
import NewsPackLogo from 'assets/images/account/client-logos/newspack-logo.png';
import SalesforceLogo from 'assets/images/account/client-logos/salesforce-logo.png';

function Logobar() {
  return (
    <S.LogoBar data-testid="company-icons">
      <S.Heading>We work with</S.Heading>
      <S.LogoImg src={StripeLogo} />
      <S.LogoImg src={SalesforceLogo} />
      <S.LogoImg src={DigestbuilderLogo} />
      <S.LogoImg src={NewsPackLogo} />
      <S.LogoImg src={MailchimpLogo} />
      <S.LogoImg src={EvenbriteLogo} />
    </S.LogoBar>
  );
}

export default Logobar;
