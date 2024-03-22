import { IconButton } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Button = styled(IconButton)`
  && {
    border-radius: 30px;
    height: 60px;
    width: 60px;

    svg {
      width: 25px;
      height: 25px;
    }

    &[aria-pressed='true'] {
      border: 2px solid ${({ theme }) => theme.basePalette.primary.engineBlue};

      svg {
        color: ${({ theme }) => theme.basePalette.primary.engineBlue};
      }
    }
  }
`;
