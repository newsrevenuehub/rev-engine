export const DONATION_PAGE_ID = 'donation-page-wrapper';

function DonationPage({ page, live = false }) {
  return (
    <div data-testid="mock-donation-page" data-live={live} data-page={JSON.stringify(page)} id={DONATION_PAGE_ID}></div>
  );
}

export default DonationPage;
