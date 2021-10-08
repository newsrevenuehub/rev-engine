import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Styles
import * as S from './DSwag.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function calculateYearlyAmount(frequency, amount) {
  let yearlyTotal = amount;
  switch (frequency) {
    case 'one_time':
      yearlyTotal *= 1;
      break;

    case 'month':
      yearlyTotal *= 12;
      break;

    case 'year':
      yearlyTotal *= 1;
      break;

    default:
      yearlyTotal *= 1;
      break;
  }
  console.log('frequency', frequency);
  console.log('amount', amount);
  console.log('yearlyTotal', yearlyTotal);
  return yearlyTotal;
}

const YEARLY_DONATION_SWAG_THRESHOLD = 240;

function getYearlyMeetsThreshold(yearly) {
  return yearly >= YEARLY_DONATION_SWAG_THRESHOLD;
}

function DSwag({ element, ...props }) {
  const theme = useTheme();
  const { frequency, amount } = usePage();

  const [shouldShowBenefits, setShouldShowBenefits] = useState(true);
  const [optOut, setOptOut] = useState(false);
  // const [compSub, setCompSub] = useState(false);

  useEffect(() => {
    console.log('use effect runs');
    setShouldShowBenefits(getYearlyMeetsThreshold(calculateYearlyAmount(frequency, amount)));
  }, [frequency, amount]);

  return (
    <DElement label="Member Benefits" {...props} data-testid="d-frequency">
      <S.ThresholdMessage>Gotta hit those num nums</S.ThresholdMessage>

      <AnimatePresence>
        {shouldShowBenefits && (
          <S.DSwag {...S.swagAnimation}>
            <S.OptOut>
              <S.Checkbox
                id="opt-out"
                data-testid="opt-out"
                type="checkbox"
                color={theme.colors.primary}
                checked={optOut}
                onChange={() => setOptOut(!optOut)}
              />
              <S.CheckboxLabel htmlFor="opt-out">
                Maximize my donation – I'd rather not receive member merchandise.
              </S.CheckboxLabel>
            </S.OptOut>
            <AnimatePresence>
              {/* {!optOut && (
            <S.SwagOptions>
              <S.CompSubscription>
                <S.CompSubDescription>
                  Add New York Times subscription? Give $15/month, $180/year or more
                </S.CompSubDescription>
                <S.CompSubWrapper>
                  <S.Checkbox
                    id="comp-subscription"
                    data-testid="comp-subscription"
                    type="checkbox"
                    color={theme.colors.primary}
                    checked={compSub}
                    onChange={() => setCompSub(!compSub)}
                  />
                  <S.CheckboxLabel htmlFor="comp-subscription">
                    Yes, I'd like to include a New York Times subscription.
                  </S.CheckboxLabel>
                </S.CompSubWrapper>
              </S.CompSubscription>
            </S.SwagOptions>
          )} */}
            </AnimatePresence>
          </S.DSwag>
        )}
      </AnimatePresence>
    </DElement>
  );
}

DSwag.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes
    // content: PropTypes.arrayOf(
    //   PropTypes.shape({ displayName: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
    // )
  })
};

DSwag.type = 'DSwag';
DSwag.displayName = 'Member benefits';
DSwag.description = 'Allow donors to make choices out optional swag';
DSwag.required = false;
DSwag.unique = true;

export default DSwag;
