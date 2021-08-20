import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PageCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 2rem 3rem 2rem;
  padding: 2rem 1rem;
  cursor: pointer;
  border-radius: ${(props) => props.theme.radii[0]};

  transition: all 0.1s ease-in-out;
  &:hover {
    transform: translate(-1px, -1px);
    box-shadow: ${(props) => props.theme.shadows[1]};
  }

  &:active {
    transform: translate(1px, 1px);
    box-shadow: ${(props) => props.theme.shadows[0]};
  }
`;

export const LiveIcon = styled(FontAwesomeIcon)`
  position: absolute;
  top: 10px;
  right: 10px;
  color: ${(props) => props.theme.colors.success};
  font-size: 16px;
`;

export const PageThumbnailWrapper = styled.div`
  height: 150px;
  width: 150px;
  border-radius: 100%;
  overflow: hidden;
  position: relative;
  box-shadow: ${(props) => props.theme.shadows[0]};
`;

export const PageThumbnail = styled.img`
  width: 100%;
  height: auto;
`;

export const NoImage = styled.div`
  height: 100%;
  width: 100%;
  background: ${(props) => props.theme.colors.grey[0]};
  color: ${(props) => props.theme.colors.grey[1]};
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PageData = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
`;

export const Label = styled.span`
  color: ${(props) => props.theme.colors.grey[2]};
`;

export const PageName = styled.p`
  font-weight: bold;
  color: ${(props) => props.theme.colors.grey[3]};
`;

export const PagePublishDate = styled.p`
  font-weight: bold;
  color: ${(props) => (props.isLive ? props.theme.colors.success : props.theme.colors.grey[3])};
`;
