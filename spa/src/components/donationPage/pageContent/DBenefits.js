import React from 'react';
import * as S from './DBenefits.styled';
import PropTypes from 'prop-types';

// Assets
import { ICONS } from 'assets/icons/SvgIcon';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DBenefits() {
  const {
    page: { donor_benefits }
  } = usePage();

  if (!donor_benefits || donor_benefits.name === '----none----') return null;

  return (
    <S.DBenefits data-testid="d-benefits">
      <S.BenefitsContent>
        <S.BenefitsName>{donor_benefits.name}</S.BenefitsName>
        <S.TiersList>
          {donor_benefits.tiers?.map((tier, i) => {
            const prevTier = i !== 0 ? donor_benefits.tiers[i - 1] : 0;
            return (
              <S.Tier key={tier.name + i}>
                <S.TierName>{tier.name}</S.TierName>
                <S.TierDescription>{tier.description}</S.TierDescription>
                {i !== 0 && <S.TierInclusion>Everything from {prevTier.name}, plus</S.TierInclusion>}
                <S.TierBenefitList>
                  {tier.benefits?.map((benefit, i) => (
                    <S.Benefit key={benefit.name + i}>
                      <S.BenefitCheck>
                        <S.BenefitIcon icon={ICONS.CHECK_MARK} />
                      </S.BenefitCheck>
                      <S.BenefitDescription>{benefit.name}</S.BenefitDescription>
                    </S.Benefit>
                  ))}
                </S.TierBenefitList>
              </S.Tier>
            );
          })}
        </S.TiersList>
      </S.BenefitsContent>
    </S.DBenefits>
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
