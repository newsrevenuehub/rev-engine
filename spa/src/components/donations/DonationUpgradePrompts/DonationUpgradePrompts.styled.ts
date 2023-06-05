import styled from 'styled-components';

export const Root = styled.div`
  /*
  For now, we absolutely position ourselves below the export button. We should
  add more flexibility to the <Hero> component eventually.
  */
  position: absolute;
  right: 0;
  top: 58px;
`;

export const Highlight = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale.black};
  box-shadow: -0.3px -2px 4px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
`;
