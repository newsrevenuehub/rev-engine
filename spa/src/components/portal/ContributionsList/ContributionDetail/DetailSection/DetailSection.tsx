import PropTypes, { InferProps } from 'prop-types';
import { Controls, Header, Root, Title } from './DetailSection.styled';

const DetailSectionPropTypes = {
  children: PropTypes.node,
  controls: PropTypes.node,
  disabled: PropTypes.bool,
  highlighted: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired
};

export type DetailSectionProps = InferProps<typeof DetailSectionPropTypes>;

export function DetailSection({ children, controls, disabled, highlighted, title }: DetailSectionProps) {
  return (
    <Root $disabled={!!disabled} $highlighted={!!highlighted}>
      <Header>
        {typeof title === 'string' ? <Title>{title}</Title> : title}
        <Controls>{controls}</Controls>
      </Header>
      {children}
    </Root>
  );
}

DetailSection.propTypes = DetailSectionPropTypes;
export default DetailSection;
