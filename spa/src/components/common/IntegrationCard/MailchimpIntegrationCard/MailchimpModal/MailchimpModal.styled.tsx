import { Button, Link } from 'components/base';
import styled from 'styled-components';

export const Title = styled.h1`
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;
  margin: 0;
`;

export const InfoIcon = styled.div`
  height: 24px;
  width: 24px;
  color: ${(props) => props.theme.basePalette.primary.engineBlue};
`;

export const SupportText = styled.p`
  margin: 35px 0 10px;
`;

export const CancelButton = styled(Button)`
  && {
    min-width: 123px;
    font-weight: 600;
    box-shadow: none;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  }
`;

export const ActionButton = styled(Button)`
  && {
    min-width: 123px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.white};
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  }
`;

export const ExternalLink = styled(Link)`
  && {
    text-decoration: underline;
  }
`;
