import styled from 'styled-components';
import { XButton } from 'elements/buttons/XButton.styled';

export const DonationsDetail = styled.div`
  background: ${(props) => props.theme.colors.paneBackground};
  padding: 1rem;

  ${XButton} {
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 1rem;
    margin-right: 1rem;
  }
`;
export const Donations = styled.div``;
