import styled from 'styled-components';

export const Flex = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: start;
`;

export const Tag = styled.p`
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
  height: 120px;
  width: 168px;
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  background-color: ${(props) => props.theme.colors.white + '20'};
  position: absolute;

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
  height: 120px;
  width: 168px;
  background-color: ${(props) => props.theme.colors.muiGrey[100]};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
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
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 600;

  ${Flex}:active & {
    color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;
