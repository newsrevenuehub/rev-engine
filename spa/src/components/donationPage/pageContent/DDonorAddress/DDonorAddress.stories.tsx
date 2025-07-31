import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import { DonationPageContext } from '../../DonationPage';
import DDonorAddress from './DDonorAddress';

export default {
  component: DDonorAddress,
  title: 'Donation Page/DDonorAddress'
} as ComponentMeta<typeof DDonorAddress>;

function ComponentDemo(errors: Record<string, string> = {}) {
  const [mailingCountry, setMailingCountry] = useState('');

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <DonationPageContext.Provider
        value={
          {
            errors,
            mailingCountry,
            setMailingCountry,
            page: { locale: 'en' }
          } as any
        }
      >
        <DDonorAddress element={{ content: {}, requiredFields: [], type: 'DDonorAddress', uuid: 'mock-uuid' }} />
      </DonationPageContext.Provider>
    </ul>
  );
}

const Template: ComponentStory<typeof ComponentDemo> = (args) => <ComponentDemo {...args} />;

export const Default = Template.bind({});
export const WithErrors = Template.bind({});

WithErrors.args = {
  mailing_city: 'Mailing city error message',
  mailing_country: 'Mailing country error message',
  mailing_postal_code: 'Mailing postal code error message',
  mailing_state: 'Mailing state error message',
  mailing_street: 'Mailing street error message'
};
