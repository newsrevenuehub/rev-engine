import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const FieldsetPropTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired
};

const Content = styled.div`
  padding: 10px;
`;

const Label = styled.legend`
  background-color: ${({ theme }) => theme.colors.muiGrey[100]};
  border-top-left-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  border-top-right-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  display: block;
  height: 24px;
  padding: 4px 10px;
  position: absolute;
  left: 4px;
  right: 4px;
  top: 4px;
`;

const Root = styled.fieldset`
  border: 1px solid ${({ theme }) => theme.colors.muiGrey[400]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  padding: 38px 4px 18px 4px;
  position: relative;
`;

export type FieldsetProps = InferProps<typeof FieldsetPropTypes>;

export function Fieldset({ children, label }: FieldsetProps) {
  return (
    <Root>
      <Label>{label}</Label>
      <Content>{children}</Content>
    </Root>
  );
}

Fieldset.propTypes = FieldsetPropTypes;
export default Fieldset;
