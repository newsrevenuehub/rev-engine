import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Styles
import * as S from './DSwag.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

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

function getYearlyMeetsThreshold(yearly, threshold) {
  return !threshold || yearly >= threshold;
}

function DSwag({ element, ...props }) {
  const theme = useTheme();
  const { page, frequency, amount } = usePage();

  const [shouldShowBenefits, setShouldShowBenefits] = useState(true);
  const [optOut, setOptOut] = useState(element?.content?.optOutDefault);

  useEffect(() => {
    setShouldShowBenefits(
      getYearlyMeetsThreshold(calculateYearlyAmount(frequency, amount), element.content.swagThreshold)
    );
  }, [frequency, amount, element.content.swagThreshold]);

  return (
    <DElement label="Member benefits" {...props} data-testid="d-swag">
      {element?.content?.swagThreshold > 0 && (
        <S.ThresholdMessage>
          Give a total of {page.currency.symbol}
          {element.content.swagThreshold} /year or more to be eligible
        </S.ThresholdMessage>
      )}
      <AnimatePresence>
        {shouldShowBenefits && (
          <S.DSwag {...S.containerSwagimation} data-testid="swag-content">
            <S.OptOut>
              <S.Checkbox
                id="opt-out"
                data-testid="swag-opt-out"
                type="checkbox"
                name="swag_opt_out"
                color={theme.colors.primary}
                checked={optOut}
                inputProps={{ 'aria-label': 'controlled' }}
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
  // If it's the only swag item, don't show the "No swag" option, since that's covered by the "optOut" option.
  const swagOptions = isOnlySwag ? swag.swagOptions : [NO_SWAG_OPT].concat(swag.swagOptions);

  const [selectedSwagOption, setSelectedSwagOption] = useState(swagOptions[0]);

  return (
    <S.SwagItem {...props} data-testid={`swag-item-${swag.swagName}`}>
      <S.SwagName>{swag.swagName}</S.SwagName>
      <S.SwagOptions>
        <Select
          testId={`swag-choices-${swag.swagName}`}
          name={`swag_choice_${swag.swagName}`}
          selectedItem={selectedSwagOption}
          onSelectedItemChange={({ selectedItem }) => setSelectedSwagOption(selectedItem)}
          items={swagOptions}
        />
      </S.SwagOptions>
    </S.SwagItem>
  );
}
