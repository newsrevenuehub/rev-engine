import styled from 'styled-components';

export const DAmountStyled = styled.ul`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
  list-style-type: none;

  padding: 0;
  margin: 1.5rem 0;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    display: flex;
    flex-direction: column;
  }
`;

export const FeesContainer = styled.div`
  grid-column: 1 / span 2;
`;

export const OtherAmount = styled.div<{ selected?: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  background: ${(props) => props.theme.colors.white};
  border: 1px solid;
  border-color: ${(props) => (props.selected ? props.theme.colors.cstm_CTAs || props.theme.colors.primary : '#c3c3c3')};
  cursor: text;
  border-radius: ${(props) => props.theme.radii[1]};
  min-height: 48px;
  line-height: 48px;
  padding: 0 1rem;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-family: ${(props) => props.theme.systemFont};
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

export const FreqSubtext = styled.span<{ selected?: boolean }>`
  font-weight: 300;
  color: ${(props) => (props.selected ? props.theme.colors.white : props.theme.colors.grey[3])};
`;
