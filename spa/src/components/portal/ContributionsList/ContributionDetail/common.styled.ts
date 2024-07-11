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
export const SectionControlButton = styled(Button)`
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
      cursor: not-allowed;
      color: ${({ theme }) => theme.basePalette.greyscale.grey2};
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
  padding-left: 12px;
`;

/**
 * Headings in the column layout.
 */
export const Subheading = styled.h5`
  &:first-of-type {
    margin-top: 0;
  }
`;
