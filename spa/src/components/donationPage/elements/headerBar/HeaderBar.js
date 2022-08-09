// Children
import NavBar from 'components/donationPage/elements/navbar';

function SHeaderBar({ page }) {
  return <NavBar page={page} />;
}

SHeaderBar.type = 'SHeaderBar';
SHeaderBar.displayName = 'Header Bar';
SHeaderBar.description = 'This is a static element that appears at the top of your Contribution Page';

export default SHeaderBar;
