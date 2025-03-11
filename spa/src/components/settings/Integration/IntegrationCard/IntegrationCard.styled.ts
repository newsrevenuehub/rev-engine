import styled from 'styled-components';
import { Button as BaseButton } from 'components/base';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 236px;
  padding: 10px;
  border: 0.5px solid ${(props) => props.theme.colors.muiGrey[400]};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};

  h2,
  p {
    font-family: ${(props) => props.theme.systemFont};
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
  }
`;

export const Content = styled.div`
  flex-grow: 1;
  margin-top: 15px;
  margin-bottom: 15px;
  display: grid;
  grid-template-areas: 'description description' 'view-details right-action';
  gap: 10px;
`;

export const RightActionWrapper = styled.div`
  grid-area: right-action;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

export const Description = styled.p`
  grid-area: description;
  margin: 0;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-weight: 400;
`;

export const Footer = styled.div<{ $active: boolean }>`
  display: flex;
  padding: 10px;
  margin-left: -10px;
  margin-right: -10px;
  margin-bottom: -10px;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  border-top: 0.5px solid ${(props) => props.theme.colors.muiGrey[400]};

  p {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    font-weight: 400;
    color: ${(props) => props.theme.colors.muiGrey[600]};
    ${(props) =>
      props.$active &&
      `
      color: ${props.theme.colors.muiTeal[600]};
      `}
  }
`;

export const CustomButtonLink = styled(BaseButton)`
  && {
    grid-area: view-details;
    width: fit-content;
    height: unset;
    text-transform: none;
    padding: 0;
    background-color: unset;
    box-shadow: unset;

    &:active {
      box-shadow: unset;
      background-color: unset;
    }

    &:hover {
      box-shadow: unset;
      background-color: unset;
    }

    .NreButtonLabel {
      text-decoration: underline;
      color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
      font-weight: 500;

      &:active {
        color: #0042a3;
        background-color: unset;
      }

      &:hover {
        color: #0a6dff;
      }
    }
  }
`;

export const TooltipTitle = styled.p`
  color: white;
  margin: 0;
  max-width: 230px;
`;
