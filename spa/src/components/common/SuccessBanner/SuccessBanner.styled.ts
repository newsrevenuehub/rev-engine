import styled from 'styled-components';

export const SuccessMessage = styled.div`
  background: #008e7c1a;
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  padding: 10.5px 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 17px;

  & p {
    color: ${(props) => props.theme.colors.muiGrey[900]};
  }
  & svg {
    fill: ${(props) => props.theme.colors.muiTeal[600]};
  }
`;
