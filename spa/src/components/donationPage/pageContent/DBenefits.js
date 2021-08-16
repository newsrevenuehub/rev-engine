import React from 'react';
import * as S from './DBenefits.styled';
import PropTypes from 'prop-types';

// Assets
import { ICONS } from 'assets/icons/SvgIcon';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import ElementError from 'components/donationPage/pageContent/ElementError';

function DBenefits({ live }) {
  const {
    page: { benefit_levels }
  } = usePage();

  if (!benefit_levels) {
    if (live) return null;
    return <ElementError>No Donor Benefits configured for this page</ElementError>;
  }
  debugger;
  return (
    <DElement data-testid="d-benefits">
      <S.BenefitsContent>
        <S.LevelsList data-testid="levels-list">
          {benefit_levels?.map((level, i) => {
            const prevLevel = i !== 0 ? benefit_levels[i - 1] : 0;
            return (
              <S.Level key={level.name + i} data-testid="level">
                <S.BenefitLevelName>
                  {level.name}: {level.donation_range}
                </S.BenefitLevelName>
                <S.LevelDescription data-testid="level-description">{level.description}</S.LevelDescription>
                {i !== 0 && <S.LevelInclusion>Everything from {prevLevel.name}, plus</S.LevelInclusion>}
                <S.LevelBenefitList data-testid="level-benefit-list">
                  {level.benefits?.map((benefit, i) => {
                    return (
                      <S.Benefit key={benefit.name + i} data-testid="level-benefit">
                        <S.BenefitCheck>
                          <S.BenefitIcon icon={ICONS.CHECK_MARK} />
                        </S.BenefitCheck>
                        <S.BenefitDetails>
                          <S.BenefitName>{benefit.name}</S.BenefitName>
                          <S.BenefitDescription data-testid="level-benefit__description">
                            {benefit.description}
                          </S.BenefitDescription>
                        </S.BenefitDetails>
                      </S.Benefit>
                    );
                  })}
                </S.LevelBenefitList>
              </S.Level>
            );
          })}
        </S.LevelsList>
      </S.BenefitsContent>
    </DElement>
  );
}

const imagePropTypes = {
  url: PropTypes.string.isRequired
};

DBenefits.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.shape(imagePropTypes)
  })
};

DBenefits.type = 'DBenefits';
DBenefits.displayName = 'Donor benefits';
DBenefits.description = 'Display donor benefits';
DBenefits.required = false;
DBenefits.unique = true;

export default DBenefits;
