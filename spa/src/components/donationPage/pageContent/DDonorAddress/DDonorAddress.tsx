// Needed to type return value from usePlacesWidget
/// <reference types="google.maps" />
import AddIcon from '@material-design-icons/svg/filled/add.svg?react';
import MinusIcon from '@material-design-icons/svg/filled/horizontal_rule.svg?react';
import { Collapse } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CountryOption } from 'components/base';
import { usePage } from 'components/donationPage/DonationPage';
import DElement from 'components/donationPage/pageContent/DElement';
import { DonorAddressElement } from 'hooks/useContributionPage';
import AddressAutocomplete, { PlaceSelection } from './AddressAutocomplete';
import { CountrySelect, TextField, Button, CollapseChild } from './DDonorAddress.styled';

const DDonorAddressPropTypes = {
  element: PropTypes.object.isRequired
};

export interface DDonorAddressProps extends InferProps<typeof DDonorAddressPropTypes> {
  element: DonorAddressElement;
}

export function DDonorAddress({ element }: DDonorAddressProps) {
  const { t } = useTranslation();
  const { errors, mailingCountry, setMailingCountry } = usePage();
  const [address, setAddress] = useState('');
  const [showComplement, setShowComplement] = useState(false);
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const isOptional = element.content?.addressOptional === true;
  const zipAndCountryOnly = !!element.content?.zipAndCountryOnly;
  const stateLabel = useMemo(() => {
    const includeProvince = element.content?.additionalStateFieldLabels?.includes('province');
    const includeRegion = element.content?.additionalStateFieldLabels?.includes('region');

    if (includeProvince && includeRegion) {
      return t('donationPage.dDonorAddress.stateLabel.stateProvinceAndRegion');
    }

    if (includeProvince) {
      return t('donationPage.dDonorAddress.stateLabel.stateAndProvince');
    }

    if (includeRegion) {
      return t('donationPage.dDonorAddress.stateLabel.stateAndRegion');
    }

    return t('donationPage.dDonorAddress.stateLabel.state');
  }, [element.content?.additionalStateFieldLabels, t]);

  const toggleComplement = () => {
    setShowComplement((prev) => !prev);
    setComplement('');
  };

  // The change event on <CountrySelect> sends an object value, but the
  // underlying input will always show the label.

  function handleChangeCountry(event: ChangeEvent<Record<never, never>>, value: CountryOption) {
    setMailingCountry(value.isoCode);
  }

  function handleChangePlace({ address, city, countryIsoCode, state, zip }: PlaceSelection) {
    setAddress(address);
    setCity(city);
    setMailingCountry(countryIsoCode);
    setState(state);
    setZip(zip);
  }

  return (
    <DElement>
      <Grid container spacing={3}>
        {!zipAndCountryOnly && (
          <>
            <Grid item xs={12}>
              <AddressAutocomplete
                error={!!errors.mailing_street}
                fullWidth
                id="mailing_street"
                name="mailing_street"
                label={t('donationPage.dDonorAddress.address')}
                onSelectPlace={handleChangePlace}
                onChange={(e) => setAddress(e.target.value)}
                helperText={errors.mailing_street}
                required={!isOptional}
                value={address}
                data-testid="mailing_street"
              />
              <Button
                startIcon={
                  showComplement ? (
                    <MinusIcon width={15} height={16} style={{ marginRight: -8 }} />
                  ) : (
                    <AddIcon width={16} height={16} style={{ marginRight: -8 }} />
                  )
                }
                $showComplement={showComplement}
                onClick={toggleComplement}
              >
                {t('donationPage.dDonorAddress.showLine2')}
              </Button>
            </Grid>
            <Collapse in={showComplement} style={{ width: '100%' }}>
              <CollapseChild>
                <Grid item xs={12}>
                  <TextField
                    error={!!errors.mailing_complement}
                    fullWidth
                    id="mailing_complement"
                    name="mailing_complement"
                    label={t('donationPage.dDonorAddress.line2')}
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    helperText={errors.mailing_complement}
                    data-testid="mailing_complement"
                  />
                </Grid>
              </CollapseChild>
            </Collapse>
            <Grid item xs={12}>
              <TextField
                error={!!errors.mailing_city}
                fullWidth
                id="mailing_city"
                name="mailing_city"
                label={t('donationPage.dDonorAddress.city')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                helperText={errors.mailing_city}
                required={!isOptional}
                data-testid="mailing_city"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                error={!!errors.mailing_state}
                fullWidth
                id="mailing_state"
                name="mailing_state"
                label={stateLabel}
                value={state}
                onChange={(e) => setState(e.target.value)}
                helperText={errors.mailing_state}
                required={!isOptional}
                data-testid="mailing_state"
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} md={zipAndCountryOnly ? 6 : 4}>
          <TextField
            error={!!errors.mailing_postal_code}
            fullWidth
            id="mailing_postal_code"
            name="mailing_postal_code"
            label={t('donationPage.dDonorAddress.zip')}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            helperText={errors.mailing_postal_code}
            required
            data-testid="mailing_postal_code"
          />
        </Grid>
        <Grid item xs={12} md={zipAndCountryOnly ? 6 : 4}>
          <CountrySelect
            autoHighlight
            error={!!errors.mailing_country}
            helperText={errors.mailing_country}
            id="country"
            label={t('donationPage.dDonorAddress.country')}
            name="mailing_country"
            onChange={handleChangeCountry}
            value={mailingCountry ?? ''}
            required
          />
        </Grid>
      </Grid>
    </DElement>
  );
}

DDonorAddress.propTypes = DDonorAddressPropTypes;

DDonorAddress.type = 'DDonorAddress';
DDonorAddress.displayName = 'Contributor Address';
DDonorAddress.description = 'Collect contributor address';
DDonorAddress.required = true;
DDonorAddress.unique = true;

export default DDonorAddress;
