import styled from 'styled-components';

export const Prompt = styled.span`
  color: ${({ theme }) => theme.colors.muiGrey['600']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
`;

export const Root = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 0 auto;
  min-height: 56px; /* force height to be consistent even if button is not present */
  padding-top: 20px;
  width: 450px; /* mimicking content container */
`;
