import styled from 'styled-components';

export const Donations = styled.div`
  table {
    width: 100%;
  }
  tr {
    border: 2px solid;
    border-color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
    border-radius: ${(props) => props.theme.radii[0]};
    min-height: 80px;
    background: ${(props) => props.theme.colors.paneBackground};
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  }
`;
