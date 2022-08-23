import PropTypes from 'prop-types';

import NavBar from 'components/donationPage/elements/navbar';

function SHeaderBar({ headerLogo, headerLink, headerBgImage }) {
  return <NavBar headerLogo={headerLogo} headerLink={headerLink} headerBgImage={headerBgImage} />;
}

SHeaderBar.type = 'SHeaderBar';
SHeaderBar.displayName = 'Header Bar';
SHeaderBar.description = 'This is a static element that appears at the top of your Contribution Page';

SHeaderBar.propTypes = {
  headerLogo: PropTypes.string,
  headerLink: PropTypes.string,
  headerBgImage: PropTypes.string
};

export default SHeaderBar;
