import styled from 'styled-components';

import SvgIcon from 'assets/icons/SvgIcon';

export const SBenefits = styled.aside`
  width: 35%;
  padding: 0 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 100%;
    margin-top: 4rem;
  }
`;

export const BenefitsContent = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 100%;
    max-width: ${(props) => props.theme.maxWidths.sm};
    margin: 0 auto;
  }
`;

export const BenefitsName = styled.h2`
  font-size: ${(props) => props.theme.fontSizes[2]};
  font-weight: normal;
  padding-bottom: 1rem;
  border-bottom: 1px ${(props) => props.theme.ruleStyle || 'solid'} ${(props) => props.theme.colors.grey[1]};
`;

export const TiersList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
`;

export const Tier = styled.li`
  &:not(:last-child) {
    border-bottom: 1px ${(props) => props.theme.ruleStyle || 'solid'} ${(props) => props.theme.colors.grey[1]};
    margin-bottom: 2rem;
  }
`;

export const TierName = styled.h3`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const TierDescription = styled.p`
  font-size: ${(props) => props.theme.fontSizes[2]};
`;

export const TierInclusion = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  font-style: italic;
  margin-bottom: 2rem;
`;

export const TierBenefitList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
`;

export const Benefit = styled.li`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 2rem;
`;

export const BenefitCheck = styled.i`
  display: inline-block;
  position: relative;
  border-radius: 50%;
  background: ${(props) => props.theme.colors.secondary};
  width: 36px;
  height: 36px;
`;

export const BenefitIcon = styled(SvgIcon)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 17px;
  height: 23px;
  fill: ${(props) => props.theme.colors.white};
`;

export const BenefitDescription = styled.p`
  display: inline-block;
  margin-left: 2rem;
  flex: 1;
  white-space: wrap;
`;
