import React from 'react';
import * as S from './SBenefits.styled';

// Assets
import { ICONS } from 'assets/icons/SvgIcon';

// Context
import { usePage } from 'components/donationPage/DonationPage';

function SBenefits() {
  const {
    page: { donor_benefits }
  } = usePage();

  if (!donor_benefits || donor_benefits.name === '----none----') return null;

  return (
    <S.SBenefits data-testid="s-benefits">
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
    </S.SBenefits>
  );
}

export default SBenefits;
