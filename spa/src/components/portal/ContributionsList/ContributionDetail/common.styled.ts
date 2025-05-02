import { Button } from 'components/base';
import styled from 'styled-components';

/**
 * Column layout for billing details and payment method.
 */
export const Columns = styled.div`
  display: grid;
  gap: 35px;
  grid-template-columns: 1fr 1fr;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Buttons that appear in the header of each section.
 */
export const SectionControlButton = styled(Button)<{ $cursorNotAllowed?: boolean }>`
  && {
    background: none;
    box-shadow: none;
    text-transform: none;

    &:hover {
      background: none;
      box-shadow: none;
    }

    .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.primary.engineBlue};
    }
  }

  &&.Mui-disabled {
    background-color: unset;

    .NreButtonLabel {
      ${({ $cursorNotAllowed }) => $cursorNotAllowed && 'cursor: not-allowed;'}
      color: ${({ theme }) => theme.basePalette.greyscale['30']};
    }
  }
`;

export const SectionEditButton = styled(Button)`
  && {
    text-transform: none;
  }
`;

/**
 * Values in the column layout.
 */
export const Detail = styled.div`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  padding-left: 12px;
`;

/**
 * Headings in the column layout.
 */
export const Subheading = styled.h5`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};

  &:first-of-type {
    margin-top: 0;
  }
`;
