import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const ImageWithPreview = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ImageSection = styled.div`
  max-width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const NoThumbnail = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 75px;
  border: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const Thumbnail = styled.img`
  flex: 1;
  max-width: 90%;
  max-height: 200px;
  cursor: pointer;
`;

export const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem;
`;

export const Button = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;

  transition: all 0.1s ease-in-out;

  &:hover {
    transform: translate(-1px, -1px);
  }
  &:active {
    transform: translate(1px, 1px);
  }
`;

export const UploadIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.primary};
  margin-bottom: 1rem;
`;

export const RemoveIcon = styled(FontAwesomeIcon)`
  color: ${(props) => props.theme.colors.caution};
`;
