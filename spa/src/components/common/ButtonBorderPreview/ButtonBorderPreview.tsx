import PropTypes, { InferProps } from 'prop-types';

import Arrow from 'assets/icons/dotted-arrow.svg';
import { Flex, Dot, Position, Button, ArrowLeft, ArrowDown } from './ButtonBorderPreview.styled';

export type ButtonBorderPreviewProps = InferProps<typeof ButtonBorderPreviewPropTypes>;

const ButtonBorderPreview = ({ className, borderRadius = 0 }: ButtonBorderPreviewProps) => {
  const dotPositions: Position[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <Flex className={className!}>
      {dotPositions.map((position) => (
        <Dot key={position} $position={position} />
      ))}
      <ArrowLeft src={Arrow} alt="arrow" />
      <ArrowDown src={Arrow} alt="arrow" />
      <Button $borderRadius={borderRadius!} data-testid="border-button">
        Button
      </Button>
    </Flex>
  );
};

const ButtonBorderPreviewPropTypes = {
  className: PropTypes.string,
  borderRadius: PropTypes.number
};

ButtonBorderPreview.propTypes = ButtonBorderPreviewPropTypes;

export default ButtonBorderPreview;
