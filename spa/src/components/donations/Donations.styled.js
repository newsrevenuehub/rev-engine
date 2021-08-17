import styled, { css } from 'styled-components';

export const ResolutionDateCaution = styled.div`
  ${(props) => {
    switch (props.urgency) {
      case 'urgent':
        return css`
          color: ${(props) => props.theme.colors.caution};
          font-weight: bold;
        `;
      case 'soon':
        return css`
          color: ${(props) => props.theme.colors.warning};
          font-weight: bold;
        `;
      default:
        return '';
    }
  }};
`;

export const DateTimeCell = styled.div``;

export const DateSpan = styled.span`
  display: block;
`;

export const Time = styled.span`
  display: block;
  font-weight: 200;
`;
