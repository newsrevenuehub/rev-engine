import styled from 'styled-components';
import { DISCLAIMER_TEXT_SIZE_PX } from 'constants/styleConstants';

export const DonationPageDisclaimer = styled.div`
  margin: 0 auto;
  max-width: 450px;
  width: 100%;
  font-size: ${DISCLAIMER_TEXT_SIZE_PX};
  font-style: italic;

  p {
    margin: 0.5rem;
    font-family: ${(props) => props.theme.systemFont};
  }
`;
