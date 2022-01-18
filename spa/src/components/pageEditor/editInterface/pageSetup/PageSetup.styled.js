import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageSetup = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 6rem;
  margin-right: 4rem;
  padding: 1rem 0;
`;

export const PageName = styled.h2`
  margin-bottom: 1rem;
`;

export const MainContent = styled.div`
  display: flex;
`;

export const Images = styled.div``;

export const ImageSelectorWrapper = styled.div`
  margin: 2rem auto;
  padding-bottom: 2rem;

  border-bottom: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const InputWrapper = styled.div`
  padding: 2rem 0;
  border-bottom: ${(props) => (props.border ? '1px solid' : 'none')};
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
  margin-bottom: 2rem;

  & button:not(:last-child) {
    margin-right: 2rem;
  }
`;

export const AddStylesButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  border: 2px solid ${(props) => props.theme.colors.primary};
  width: 48px;
  height: 48px;
  cursor: pointer;
  border-radius: 50%;
  padding: 1rem;
  box-shadow: ${(props) => props.theme.shadows[1]};
  background: ${(props) => props.theme.colors.paneBackground};

  &:hover {
    transform: translate(-1px, -2px);
    box-shadow: ${(props) => props.theme.shadows[2]};
  }

  &:active {
    transform: translate(1px, 1px);
    box-shadow: ${(props) => props.theme.shadows[1]};
  }

  transition: all 0.1s ease-in-out;
`;

export const AddStylesIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.primary};
`;
