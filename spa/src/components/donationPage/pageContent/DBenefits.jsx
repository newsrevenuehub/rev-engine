import * as S from './DBenefits.styled';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { usePage } from 'components/donationPage/DonationPage';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import ElementError from 'components/donationPage/pageContent/ElementError';

function DBenefits({ live }) {
  const { t } = useTranslation();
  const {
    page: { benefit_levels }
  } = usePage();

  if (!benefit_levels) {
    if (live) return null;
    return <ElementError>{t('donationPage.dBenefits.emptyError')}</ElementError>;
  }

  return (
    <DElement data-testid="d-benefits">
      <S.BenefitsContent>
        <S.LevelsList data-testid="levels-list">
          {benefit_levels?.map((level, i) => {
            const prevLevel = i !== 0 ? benefit_levels[i - 1] : 0;
            return (
              <S.Level key={level.name + i} data-testid="level">
                <S.BenefitLevelDetails>
                  <S.LevelName>{level.name}</S.LevelName>
                  <S.LevelRange data-testid="level-range">
                    {t('donationPage.dBenefits.perYear', {
                      donation: level.donation_range
                    })}
                  </S.LevelRange>
                </S.BenefitLevelDetails>
                {i !== 0 && (
                  <S.LevelInclusion>
                    {t('donationPage.dBenefits.everythingPlus', {
                      name: prevLevel.name
                    })}
                  </S.LevelInclusion>
                )}
                <S.LevelBenefitList data-testid="level-benefit-list">
                  {level.benefits?.map((benefit, i) => {
                    return (
                      <S.Benefit key={benefit.name + i} data-testid="level-benefit">
                        <S.BenefitCheck>
                          <S.BenefitIcon />
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
DBenefits.displayName = 'Member Benefits';
DBenefits.description = 'Display member benefits';
DBenefits.required = false;
DBenefits.unique = true;

export default DBenefits;
