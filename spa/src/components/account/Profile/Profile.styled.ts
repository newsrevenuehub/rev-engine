import styled from 'styled-components';
import { Modal as MuiModal } from '@material-ui/core';

export const Profile = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  font-family: ${(props) => props.theme.systemFont};
  background: ${(props) => props.theme.colors.white};
  border: 0.5px solid ${(props) => props.theme.colors.muiGrey[400]};
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.muiBorderRadius.xl};
  padding: 30px 65px;
  width: 90%;
  max-width: 610px;
  max-height: 100vh;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 30px;
  }
`;

export const Modal = styled(MuiModal)`
  display: flex;
  align-items: center;
  justify-content: center;

  *,
  ::after,
  ::before {
    outline: none;
  }
  a,
  a span,
  a:hover,
  a:hover span {
    color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
    text-decoration: underline;
  }
`;

export const Title = styled.h1`
  margin-top: 0px;
  font-weight: 700;
  font-size: ${(props) => props.theme.fontSizesUpdated['lgx']};
  line-height: ${(props) => props.theme.fontSizesUpdated['lg2x']};
  color: ${(props) => props.theme.colors.account.purple[1]};
`;

export const Description = styled.div`
  font-family: Roboto, sans-serif;
  font-style: normal;
  font-weight: 300;
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  margin-bottom: 30px;
`;

export const Anchor = styled.a`
  cursor: pointer;
  width: 100%;
  text-align: center;
  span,
  svg {
    vertical-align: middle;
    display: inline-block;
  }
  span {
    font-weight: 500;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    line-height: ${(props) => props.theme.fontSizesUpdated.md};
    text-align: center;
  }
  svg {
    font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  }
`;

export const BottomNav = styled.img`
  width: 42px;
  margin: 34px auto 0px;
`;

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex-basis: 100%;
  flex: 1;
  margin-right: 20px;

  &:last-child {
    margin-right: 0;
  }
`;

export const Select = styled.select`
  appearance: none;
  background: none;
  border: none;
  /* Undo normal padding around the element, match height of other fields. */
  margin: -8px -6px -8px -12px;
  height: 37px;
  padding: 10px 6px 10px 12px;
  /* Extra width due to negative margins. */
  width: calc(100% + 18px);
`;

export const SelectIcon = styled.div`
  color: #d9d9d9;
  pointer-events: none;
  position: absolute;
  right: 8px;
`;
