import { FormEvent, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { ContributionInterval } from 'constants/contributionIntervals';
import { usePayment } from 'hooks/usePayment';
// import useSentry from 'hooks/useSentry';
import { useContributionPageData } from './useContributionPageData';
import { Address, Amount, ContributorInfo, Interval } from './elements';
import { StripeModal } from './StripeModal';
import { Button, Content, Root } from './ContributionPage.styled';
import DonationPageHeader from 'components/donationPage/DonationPageHeader';

export function ContributionPage() {
  const pageData = useContributionPageData();
  const [amount, setAmount] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [interval, setInterval] = useState<ContributionInterval>('one_time');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const { createPayment, deletePaymentMutation, payment } = usePayment();
  const { executeRecaptcha } = useGoogleReCaptcha();
  // TODO: why doesn't this work? Missing react-router?
  // useSentry();

  function handleAutofill() {
    setAmount('123.45');
    setCity('City');
    setCountry('US');
    setEmail('chris.klimas@fundjournalism.org');
    setFirstName('First');
    setLastName('Last');
    setPhone('555-1234');
    setStreet('Street');
    setState('State');
    setZip('12345');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!createPayment) {
      // Should never happen.
      throw new Error('createPayment is undefined');
    }

    let reCAPTCHAToken = '';

    if (executeRecaptcha) {
      try {
        reCAPTCHAToken = await executeRecaptcha();
      } catch (error) {
        console.error(`executeRecaptcha failed, falling back to empty string: ${error}`);
      }
    } else {
      console.error('executeRecaptcha was undefined at time of contribution form submission, skipping verification');
    }

    await createPayment(
      {
        agreed_to_pay_fees: false, // TODO
        amount,
        captcha_token: reCAPTCHAToken,
        currency: pageData.currency as any, // typing on this function call is incorrect?
        donation_page_slug: pageData.slug,
        donor_selected_amount: amount,
        email,
        first_name: firstName,
        last_name: lastName,
        interval,
        mailing_city: city,
        mailing_complement: '', // TODO
        mailing_country: country,
        mailing_postal_code: zip,
        mailing_state: state,
        mailing_street: street,
        page: pageData.id.toString(),
        phone,
        revenue_program_country: pageData.revenue_program.country,
        revenue_program_slug: pageData.revenue_program.slug,
        sf_campaign_id: '',
        mc_campaign_id: ''
      },
      {
        slug: pageData.slug,
        payment_provider: {
          stripe_account_id: pageData.payment_provider.stripe_account_id
        },
        revenue_program: {
          slug: pageData.revenue_program.slug
        },
        thank_you_redirect: pageData.thank_you_redirect
      } as any
    );
  }

  return (
    <Root>
      <DonationPageHeader page={pageData as any} />
      <Content>
        <form onSubmit={handleSubmit}>
          <button onClick={handleAutofill} type="button">
            Autofill
          </button>
          {pageData.elements &&
            pageData.elements.map((element) => {
              switch (element.type) {
                case 'DAmount':
                  return <Amount key={element.uuid} onChange={setAmount} value={amount} />;
                case 'DDonorAddress':
                  return (
                    <Address
                      key={element.uuid}
                      city={city}
                      country={country}
                      onChangeCity={setCity}
                      onChangeCountry={setCountry}
                      onChangeState={setState}
                      onChangeStreet={setStreet}
                      onChangeZip={setZip}
                      state={state}
                      street={street}
                      zip={zip}
                    />
                  );
                case 'DDonorInfo':
                  return (
                    <ContributorInfo
                      key={element.uuid}
                      email={email}
                      firstName={firstName}
                      lastName={lastName}
                      phone={phone}
                      onChangeEmail={setEmail}
                      onChangeFirstName={setFirstName}
                      onChangeLastName={setLastName}
                      onChangePhone={setPhone}
                    />
                  );
                case 'DFrequency':
                  return <Interval key={element.uuid} onChange={setInterval} value={interval} />;
                default:
                  console.log('Skipping element', element);
                  return null;
              }
            })}
          <Button disabled={!createPayment || payment} type="submit">
            Continue to Payment
          </Button>
        </form>
      </Content>
      {payment && <StripeModal locale={pageData.locale} payment={payment} />}
    </Root>
  );
}

export default ContributionPage;
