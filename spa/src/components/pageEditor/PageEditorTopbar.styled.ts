import styled from 'styled-components';

export const Group = styled.div`
  align-items: center;
  display: flex;
  gap: 16px;
`;

export const Root = styled.div`
  align-items: center;
  background-color: ${(props) => props.theme.colors.topbarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: row;
  height: 48px;
  justify-content: space-between;
  left: 0;
  /* Padding on the left is reduced because the back button has its own padding. */
  padding: 0px 24px 0px 12px;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: ${(props) => props.theme.zIndex.header};
`;

export const SvgLogo = styled.img`
  height: 29px;
  border-right: 1px solid #f9f9f9;
  padding-right: 16px;
`;
