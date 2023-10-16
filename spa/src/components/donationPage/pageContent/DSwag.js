import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import i18n from 'i18n';
import { useTranslation } from 'react-i18next';

// Styles
import * as S from './DSwag.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';

// Context
import { usePage } from '../DonationPage';

// Children
import Select from 'elements/inputs/Select';
import Checkbox from 'elements/inputs/Checkbox';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import GroupedLabel from 'elements/inputs/GroupedLabel';
import { InputGroup } from 'elements/inputs/inputElements.styled';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';

function calculateYearlyAmount(frequency, amount) {
  let yearlyTotal = amount;
  switch (frequency) {
    case CONTRIBUTION_INTERVALS.ONE_TIME:
      yearlyTotal *= 1;
      break;

    case CONTRIBUTION_INTERVALS.MONTHLY:
      yearlyTotal *= 12;
      break;

    case CONTRIBUTION_INTERVALS.ANNUAL:
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
  // Temp disabled in DEV-3733
  // TODO: Re-enable in DEV-3735
  return null;

  const { t } = useTranslation();
  const theme = useTheme();
  const { page, frequency, amount } = usePage();

  const [shouldShowBenefits, setShouldShowBenefits] = useState(true);
  const [optOut, setOptOut] = useState(element?.content?.optOutDefault);
  const [nytCompSub, setNytCompSub] = useState(false);

  useEffect(() => {
    setShouldShowBenefits(
      getYearlyMeetsThreshold(calculateYearlyAmount(frequency, amount), element.content?.swagThreshold)
    );
  }, [frequency, amount, element.content?.swagThreshold]);

  return (
    <DElement label={t('donationPage.dSwag.memberBenefits.label')} {...props} data-testid="d-swag">
      {element?.content?.swagThreshold > 0 && (
        <S.ThresholdMessage>
          {t('donationPage.dSwag.giveXToBeEligible', {
            amount: `${page.currency.symbol}${element.content?.swagThreshold} ${page.currency.code}`
          })}
        </S.ThresholdMessage>
      )}
      <AnimatePresence>
        {shouldShowBenefits && (
          <S.DSwag {...S.containerSwagimation} data-testid="swag-content">
            <motion.div>
              <Checkbox
                id="opt-out"
                data-testid="swag-opt-out"
                type="checkbox"
                name="swag_opt_out"
                color={theme.colors.primary}
                checked={optOut}
                inputProps={{ 'aria-label': 'controlled' }}
                onChange={() => setOptOut(!optOut)}
                label={t('donationPage.dSwag.maximizeContribution')}
              />
            </motion.div>
            <AnimatePresence>
              {!optOut && (
                <S.SwagsSection>
                  {element.content?.offerNytComp && (
                    <motion.div>
                      <Checkbox
                        id="nyt-comp-sub"
                        data-testid="nyt-comp-sub"
                        type="checkbox"
                        name="comp_subscription"
                        color={theme.colors.primary}
                        checked={nytCompSub}
                        inputProps={{ 'aria-label': 'controlled' }}
                        onChange={() => setNytCompSub(!nytCompSub)}
                        label={t('donationPage.dSwag.nytSubscription')}
                        value="nyt"
                      />
                    </motion.div>
                  )}
                  <S.SwagsList {...S.containerSwagimation}>
                    {element.content?.swags.map((swag) => (
                      <SwagItem
                        key={swag.swagName}
                        swag={swag}
                        isOnlySwag={element.content?.swags.length === 1}
                        {...S.optSwagimation}
                      />
                    ))}
                  </S.SwagsList>
                </S.SwagsSection>
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
DSwag.displayName = i18n.t('donationPage.dSwag.memberBenefits.title');
DSwag.description = i18n.t('donationPage.dSwag.allowSwagChoices');
DSwag.required = false;
DSwag.unique = true;

export default DSwag;

const NO_SWAG_OPT = i18n.t('donationPage.dSwag.noThanksOption');

function SwagItem({ swag, isOnlySwag, ...props }) {
  const { t } = useTranslation();
  // If it's the only swag item, don't show the "No swag" option, since that's covered by the "optOut" option.
  const swagOptions = isOnlySwag ? swag.swagOptions : [NO_SWAG_OPT].concat(swag.swagOptions);

  const [selectedSwagOption, setSelectedSwagOption] = useState(swagOptions[0]);

  return (
    <InputGroup {...props} data-testid={`swag-item-${swag.swagName}`}>
      <GroupedLabel>{swag.swagName}</GroupedLabel>
      <S.SwagOptions>
        <Select
          testId={`swag-choices-${swag.swagName}`}
          name={`swag_choice_${swag.swagName}`}
          selectedItem={selectedSwagOption}
          onSelectedItemChange={({ selectedItem }) => setSelectedSwagOption(selectedItem)}
          items={swagOptions}
          helpText={t('donationPage.dSwag.chooseMerchandise')}
          maxWidth="300px"
        />
      </S.SwagOptions>
    </InputGroup>
  );
}
