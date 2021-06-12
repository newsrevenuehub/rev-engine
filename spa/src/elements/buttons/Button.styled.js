import styled from 'styled-components';

export const Button = styled.button`
  display: block;
  text-align: center;
  background: ${(props) => props.theme.colors.primary};
  border: 1px solid;
  border-color: ${(props) => props.theme.colors.primary};

  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};

  border-radius: ${(props) => props.theme.radii[1]};
  width: 100%;
  min-height: 48px;
  line-height: 48px;

  padding: 0 1rem;
  position: relative;
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 700;
  color: ${(props) => props.theme.colors.white};
`;
