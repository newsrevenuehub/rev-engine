import styled from 'styled-components';

export const NeedHelpCta = styled.div`
  margin: 17px 0px 4px;
`;

export const NeedHelpSpan = styled.span`
  font-weight: 500;
`;

export const StripeFAQ = styled.a`
  font-weight: 500;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.account.blueLink};
`;
