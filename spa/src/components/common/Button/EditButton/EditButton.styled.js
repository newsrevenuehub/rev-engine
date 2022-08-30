import styled from 'styled-components';
import BookmarkBorderIcon from '@material-ui/icons/BookmarkBorder';
import { BUTTON_TYPE } from 'constants/buttonConstants';

export const Flex = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
`;

export const BookmarkIcon = styled(BookmarkBorderIcon)`
  margin: 0;
  border-bottom-left-radius: ${(props) => props.theme.muiBorderRadius.sm};
  border-bottom-right-radius: ${(props) => props.theme.muiBorderRadius.sm};
  background-color: ${(props) => props.theme.colors.muiLightBlue[800]};
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  color: ${(props) => props.theme.colors.white};
  font-weight: 600;
  position: absolute;
  padding: 0.25rem;
  line-height: 0.75rem;
  top: 0;
  left: 8px;
  z-index: 1;
  height: 24px;
  width: 24px;
`;

export const Tag = styled.p`
  margin: 0;
  border-radius: ${(props) => props.theme.muiBorderRadius.sm};
  background-color: ${(props) => props.theme.colors.muiTeal[700]};
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  color: ${(props) => props.theme.colors.white};
  font-weight: 600;
  position: absolute;
  padding: 0.25rem 0.5rem;
  line-height: 0.75rem;
  top: 6px;
  left: 8px;
  z-index: 1;
`;

export const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${(props) => (props.type === BUTTON_TYPE.PAGE ? '120' : '70')}px;
  width: 168px;
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  background-color: ${(props) => props.theme.colors.white + '20'};
  position: absolute;
  border-color: transparent;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.muiGrey[900] + '90'};
  }

  &:active {
    background-color: ${(props) => props.theme.colors.muiLightBlue[500] + '90'};
  }
`;

export const Icon = styled.img`
  display: none;

  ${Button}:hover & {
    display: block;
  }
`;

export const Background = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${(props) => (props.type === BUTTON_TYPE.PAGE ? '120' : '70')}px;
  width: 168px;
  background-color: ${(props) => props.theme.colors.muiGrey[100]};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  overflow: hidden;
  ${(props) =>
    props.hasImage &&
    `
      background-repeat: no-repeat;
      background-position: center;
      background-size: cover;
    `}

  p {
    color: ${(props) => props.theme.colors.muiGrey[600]};
  }
`;

export const Label = styled.label`
  max-width: 168px;
  overflow-wrap: break-word;
  margin-top: 0.75rem;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 600;

  ${Flex}:active & {
    color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;
