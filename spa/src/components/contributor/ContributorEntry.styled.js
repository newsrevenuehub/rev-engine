import styled from 'styled-components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'elements/buttons/Button';

export const ContributorEntry = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const ContentWrapper = styled.section`
  margin-top: 4rem;
  padding: 2rem;
  max-width: 600px;
`;

export const Title = styled.h1`
  text-align: center;
`;

export const EmailForm = styled.form``;

export const InputWrapper = styled.div`
  margin: 2rem 0;
`;

export const NoSuchContributor = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0 1rem;
  margin: 2rem 0;

  p {
    flex: 1;
    margin-left: 1rem;
  }
`;

export const NoSuchIcon = styled(FontAwesomeIcon)`
  font-size: 48px;
  color: ${(props) => props.theme.colors.warning};
`;

export const MagicLinkButton = styled(Button)`
  span {
    margin-left: 1rem;
    font-size: 32px;
  }
`;

export const Confirmation = styled.div`
  margin-top: 4rem;
  p {
    max-width: 400px;
    margin: 1rem auto;
  }
`;
