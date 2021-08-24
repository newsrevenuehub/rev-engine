import styled from 'styled-components';

import SvgIcon from 'assets/icons/SvgIcon';

export const DBenefits = styled.aside``;

export const BenefitsContent = styled.div``;

export const BenefitLevelDetails = styled.h2`
  font-size: ${(props) => props.theme.fontSizes[2]};
  font-weight: normal;
  margin-bottom: 1rem;
`;

export const LevelName = styled.h3`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const LevelRange = styled.p`
  font-size: ${(props) => props.theme.fontSizes[2]};
`;

export const LevelsList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
`;

export const Level = styled.li`
  border-bottom: 1px ${(props) => props.theme.ruleStyle || 'solid'} ${(props) => props.theme.colors.grey[1]};
  padding: 2rem 0;
`;

export const LevelInclusion = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  font-style: italic;
  margin-bottom: 2rem;
`;

export const LevelBenefitList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
`;

export const Benefit = styled.li`
  display: flex;
  flex-direction: row;
  align-items: top;

  &:not(:last-child) {
    margin-bottom: 2rem;
  }
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

export const BenefitDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: left;
  line-height: normal;
`;

export const BenefitName = styled.h4`
  display: inline-block;
  margin-left: 2rem;
  flex: 1;
`;

export const BenefitDescription = styled.p`
  display: inline-block;
  margin-left: 2rem;
  font-style: italic;
  flex: 1;
`;
