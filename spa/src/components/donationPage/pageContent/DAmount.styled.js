import styled from 'styled-components';

export const DAmount = styled.ul`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;

  padding: 0;
  margin: 1.5rem 0;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    grid-template-columns: 1fr;
  }
`;

export const OtherAmount = styled.div`
  display: flex;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.white};
  border: 1px solid;
  border-color: ${(props) => (props.selected ? props.theme.colors.cstm_CTAs || props.theme.colors.primary : '#c3c3c3')};
  cursor: text;
  border-radius: ${(props) => props.theme.radii[1]};
  min-height: 48px;
  line-height: 48px;
  padding: 0 1rem;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 700;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizes[0]};
  }
`;

export const OtherAmountInput = styled.input`
  color: ${(props) => props.theme.colors.black};
  border: none;
  outline: none;
  padding: 0 1rem;
  min-width: 50px;
  width: 100%;
`;

export const FreqSubtext = styled.span`
  font-weight: 300;
  color: ${(props) => (props.selected ? props.theme.colors.white : props.theme.colors.grey[3])};
`;
