import PropTypes, { InferProps } from 'prop-types';
import { Controls, Header, Root, Title } from './DetailSection.styled';

const DetailSectionPropTypes = {
  children: PropTypes.node,
  controls: PropTypes.node,
  disabled: PropTypes.bool,
  highlighted: PropTypes.bool,
  title: PropTypes.string.isRequired
};

export type DetailSectionProps = InferProps<typeof DetailSectionPropTypes>;

export function DetailSection({ children, controls, disabled, highlighted, title }: DetailSectionProps) {
  return (
    <Root $disabled={!!disabled} $highlighted={!!highlighted}>
      <Header>
        <Title>{title}</Title>
        <Controls>{controls}</Controls>
      </Header>
      {children}
    </Root>
  );
}

DetailSection.propTypes = DetailSectionPropTypes;
export default DetailSection;
