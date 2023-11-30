import React from 'react';

function DonationPage({ page, live = false }, ref) {
  return <div data-testid="mock-donation-page" data-live={live} data-page={JSON.stringify(page)} ref={ref}></div>;
}

export default React.forwardRef(DonationPage);
