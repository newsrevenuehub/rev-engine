import styled from 'styled-components';

export const SelectableButton = styled.div`
  text-align: center;
  background: ${(props) => (props.selected ? props.theme.colors.cstm_CTAs : '#efefef')};
  border: 1px solid;
  border-color: ${(props) => (props.selected ? props.theme.colors.cstm_CTAs : '#c3c3c3')};

  border-radius: ${(props) => props.theme.radii[1]};
  min-height: 48px;
  line-height: 48px;
  cursor: pointer;
  padding: 0 1rem;
  position: relative;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 700;
  color: ${(props) => (props.selected ? props.theme.colors.white : props.theme.colors.black)};
`;
