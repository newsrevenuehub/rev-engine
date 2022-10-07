import { Grid } from '@material-ui/core';

import * as S from './Logobar.styled';

import StripeLogo from 'assets/images/account/client-logos/stripe-logo.png';
import DigestbuilderLogo from 'assets/images/account/client-logos/digestbuilder-logo.png';
import EventbriteLogo from 'assets/images/account/client-logos/eventbrite-logo.png';
import MailchimpLogo from 'assets/images/account/client-logos/mailchimp-logo.png';
import NewsPackLogo from 'assets/images/account/client-logos/newspack-logo.png';
import SalesforceLogo from 'assets/images/account/client-logos/salesforce-logo.png';

const icons = [
  ['Stripe Logo', StripeLogo],
  ['Salesforce Logo', SalesforceLogo],
  ['Digestbuilder Logo', DigestbuilderLogo],
  ['NewsPack Logo', NewsPackLogo],
  ['Mailchimp Logo', MailchimpLogo],
  ['Eventbrite Logo', EventbriteLogo]
];

function Logobar() {
  return (
    <S.LogoBar data-testid="company-icons">
      <S.Heading>We Work With</S.Heading>
      <Grid container>
        {icons.map(([name, icon]) => (
          <Grid key={name} item xs={4} sm={2}>
            <img src={icon} alt={name} style={{ width: '100%' }} />
          </Grid>
        ))}
      </Grid>
    </S.LogoBar>
  );
}

export default Logobar;
