import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'elements/buttons/Button';

export const GenericThankYou = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.fieldBackground};
`;

export const Wrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const InnerContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.white};
  box-shadow: ${(props) => props.theme.shadows[1]};
  width: 100%;
  max-width: 700px;
  border-radius: ${(props) => props.theme.radii[1]};
  border: 6px solid ${(props) => props.theme.colors.primary};
  margin: 2rem 0;
  padding: 1rem 3rem;
`;

export const ThankYou = styled.h2`
  font-size: ${(props) => props.theme.fontSizes[4]};
  font-weight: 900;
  text-align: center;
  color: ${(props) => props.theme.colors.grey[4]};
  margin: 0;
  margin-bottom: 1rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizes[4]};
  }
`;

export const TextSection = styled.div``;

export const Text = styled.p``;

export const SocialShareSection = styled.div`
  margin-top: 3rem;
  margin-bottom: 2rem;
`;

export const SocialShareList = styled.ul`
  display: flex;
  flex-direction: row;
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
  margin-top: 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
    align-items: center;
  }
`;

export const SocialShareItem = styled.li`
  margin: 0 1rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 1rem 0;
  }
`;

const SocialShareButton = styled.a`
  background: none;
  border: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: ${(props) => props.theme.colors.black};
  transition: all 0.1s ease-in-out;
  padding: 0.5rem 1rem;
  cursor: pointer;

  &:hover {
    box-shadow: ${(props) => props.theme.shadows[1]};
  }

  &:active {
    box-shadow: ${(props) => props.theme.shadows[0]};
  }
`;

export const FacebookShare = styled(SocialShareButton)``;

export const TwitterShare = styled(SocialShareButton)``;

export const EmailShare = styled(SocialShareButton)``;

export const SocialImg = styled.img`
  height: 30px;
  width: auto;
  margin-right: 0.5rem;
`;

export const SocialIcon = styled(FontAwesomeIcon)`
  font-size: 30px;
  color: ${(props) => props.theme.colors.grey[1]};
  margin-right: 0.5rem;
`;

export const Redirect = styled(Button)``;
