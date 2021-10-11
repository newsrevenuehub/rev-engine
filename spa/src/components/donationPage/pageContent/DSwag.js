import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Styles
import * as S from './DSwag.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Constants
import { NO_VALUE } from 'constants/textConstants';

// Context
import { usePage } from '../DonationPage';

// Children
import Select from 'elements/inputs/Select';
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
  return yearlyTotal;
}

const YEARLY_DONATION_SWAG_THRESHOLD = 240;

function getYearlyMeetsThreshold(yearly) {
  return yearly >= YEARLY_DONATION_SWAG_THRESHOLD;
}

function DSwag({ element, ...props }) {
  const theme = useTheme();
  const { page, frequency, amount } = usePage();

  const [shouldShowBenefits, setShouldShowBenefits] = useState(true);
  const [optOut, setOptOut] = useState(element?.content?.optOutDefault);

  useEffect(() => {
    setShouldShowBenefits(getYearlyMeetsThreshold(calculateYearlyAmount(frequency, amount)));
  }, [frequency, amount]);

  return (
    <DElement label="Member Benefits" {...props} data-testid="d-frequency">
      {element?.content?.swagThreshold > 0 && (
        <S.ThresholdMessage>
          Give a total of {page.currency.symbol}
          {element.content.swagThreshold}/year or more to be eligible
        </S.ThresholdMessage>
      )}
      <AnimatePresence>
        {shouldShowBenefits && (
          <S.DSwag {...S.containerSwagimation}>
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
              {!optOut && (
                <S.SwagsList {...S.containerSwagimation}>
                  {element.content.swags.map((swag) => (
                    <SwagItem
                      key={swag.swagName}
                      swag={swag}
                      isOnlySwag={element.content.swags.length === 1}
                      {...S.optSwagimation}
                    />
                  ))}
                </S.SwagsList>
              )}
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
  })
};

DSwag.type = 'DSwag';
DSwag.displayName = 'Member benefits';
DSwag.description = 'Allow donors to make choices out optional swag';
DSwag.required = false;
DSwag.unique = true;

export default DSwag;

const NO_SWAG_OPT = '--No, thank you--';

function SwagItem({ swag, isOnlySwag, ...props }) {
  const [selectedSwagOption, setSelectedSwagOption] = useState();

  // If it's the only swag item, don't show the "No swag" option, since that's covered by the "optOut" option.
  const swagOptions = isOnlySwag ? swag.swagOptions : [NO_SWAG_OPT].concat(swag.swagOptions);

  return (
    <S.SwagItem {...props}>
      <S.SwagName>{swag.swagName}</S.SwagName>
      <S.SwagOptions>
        <Select
          selectedItem={selectedSwagOption}
          onSelectedItemChange={({ selectedItem }) => setSelectedSwagOption(selectedItem)}
          items={swagOptions}
        />
      </S.SwagOptions>
    </S.SwagItem>
  );
}
