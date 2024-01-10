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
 * Values in the column layout.
 */
export const Detail = styled.div`
  padding-left: 12px;
`;

/**
 * Section heading.
 */
export const Heading = styled.h4`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 600;
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey2};
  padding-bottom: 10px;

  &:first-of-type {
    margin-top: 0;
  }
`;

/**
 * Headings in the column layout.
 */
export const Subheading = styled.h5`
  &:first-of-type {
    margin-top: 0;
  }
`;
