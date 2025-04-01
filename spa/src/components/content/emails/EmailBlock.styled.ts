import { Button } from 'components/base';
import styled from 'styled-components';

export const Actions = styled.div`
  align-self: center;
  display: grid;
  gap: 20px;
  grid-area: actions;
  justify-self: stretch;
`;

export const Description = styled.div`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  grid-area: description;
`;

export const Name = styled.h2`
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};
  font-weight: 400;
  grid-area: name;
`;

export const Root = styled.div`
  border: ${({ theme }) => `1px solid ${theme.basePalette.greyscale.grey3}`};
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  display: grid;
  grid-template:
    'name actions'
    'description actions' / 620px 150px;
  justify-content: space-between;
  padding: 15px 30px;
`;

export const SendTestButton = styled(Button)`
  && {
    text-transform: none;
  }
`;
