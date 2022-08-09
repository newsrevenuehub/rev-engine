import { render, screen } from 'test-utils';

import DonationPageNavbar from './DonationPageNavbar';

const HEADER_LOGO_IMAGE_TEST_ID = 's-header-bar-logo';
const HEADER_LOGO_IMAGE_URL_TEST_ID = 's-header-bar-logo-link';

it('should show header logo if logo is provided', () => {
  const pageJson = { header_logo: 'https://fundjournalism.org/wp-content/uploads/2021/11/nrh-logo.png' };
  render(<DonationPageNavbar page={pageJson} />);
  const headerLogoImage = screen.queryByTestId(HEADER_LOGO_IMAGE_TEST_ID);
  expect(headerLogoImage).toBeInTheDocument();
});

it('should show clickable header logo if logo and url are provided', () => {
  const pageJson = {
    header_logo: 'https://fundjournalism.org/wp-content/uploads/2021/11/nrh-logo.png',
    header_link: 'https://fundjournalism.org/'
  };
  render(<DonationPageNavbar page={pageJson} />);
  const headerLogoImageURL = screen.queryByTestId(HEADER_LOGO_IMAGE_URL_TEST_ID);
  expect(headerLogoImageURL).toBeInTheDocument();
});

it('should not make header logo section clickable if logo is not provided', () => {
  const pageJson = { header_link: 'https://fundjournalism.org/' };
  render(<DonationPageNavbar page={pageJson} />);
  const headerLogoImageURL = screen.queryByTestId(HEADER_LOGO_IMAGE_URL_TEST_ID);
  expect(headerLogoImageURL).not.toBeInTheDocument();
});

it('should not show header logo section if logo is not provided', () => {
  const pageJson = { header_link: 'https://fundjournalism.org/' };
  render(<DonationPageNavbar page={pageJson} />);
  const headerLogoImage = screen.queryByTestId(HEADER_LOGO_IMAGE_TEST_ID);
  expect(headerLogoImage).not.toBeInTheDocument();
});

it('should not show logo/ clickable link if nothing is provided', () => {
  const pageJson = {};
  render(<DonationPageNavbar page={pageJson} />);
  const headerLogoImage = screen.queryByTestId(HEADER_LOGO_IMAGE_TEST_ID);
  expect(headerLogoImage).not.toBeInTheDocument();
});
