import styled from 'styled-components';
import { Link as BaseLink } from 'components/base';

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
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

export const Description = styled.p`
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

export const Link = styled(BaseLink)`
  && {
    text-decoration: underline;
    font-weight: 500;
  }
`;
