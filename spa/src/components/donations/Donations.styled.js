import styled from 'styled-components';
import { XButton } from 'elements/buttons/XButton.styled';

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

export const DonationsDetail = styled.div`
  background: ${(props) => props.theme.colors.paneBackground};
  padding: 1rem;

  ${XButton} {
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 15px;
    margin-right: 15px;
  }
`;
