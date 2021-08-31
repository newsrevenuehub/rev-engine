// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';

function SHeaderBar() {
  const { page } = usePage();

  return <DonationPageNavbar page={page} />;
}

SHeaderBar.type = 'SHeaderBar';
SHeaderBar.displayName = 'Header Bar';
SHeaderBar.description = 'This is a static element that appears at the top of your Donation Page';

export default SHeaderBar;
