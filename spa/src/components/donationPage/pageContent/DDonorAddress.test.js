import { render, screen } from 'test-utils';
import selectEvent from 'react-select-event';

import countryCodes from 'country-code-lookup';

import { DonationPageContext } from '../DonationPage';
import DDonorAddress from './DDonorAddress';

jest.mock('react-google-autocomplete', () => ({
  usePlacesWidget: () => ({})
}));

function tree(context) {
  return render(
    <DonationPageContext.Provider value={{ ...context }}>
      <DDonorAddress />
    </DonationPageContext.Provider>
  );
}

describe('DDonorAddress', () => {
  it('has an alphabetically sorted list of select options for country', async () => {
    tree({ errors: {}, setMailingCountry: () => {}, mailingCountry: '' });
    const expected = countryCodes.countries.map(({ country }) => country).sort((a, b) => a.localeCompare(b));
    selectEvent.openMenu(screen.getByLabelText('Country', { exact: false }));
    const options = screen.getAllByRole('option');
    options.forEach(({ label }, index) => {
      expect(expected[index]).toBe(label);
    });
  });
});
