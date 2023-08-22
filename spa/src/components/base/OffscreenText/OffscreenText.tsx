import { Typography } from '@material-ui/core';
import PropTypes, { InferProps } from 'prop-types';

const OffscreenTextPropTypes = {
  children: PropTypes.node.isRequired
};

export type OffscreenTextProps = InferProps<typeof OffscreenTextPropTypes>;

/**
 * Text that is perceiveable only by assistive technology. Where possible, use ARIA instead.
 * @see https://v4.mui.com/api/typography/
 */
export const OffscreenText = ({ children }: OffscreenTextProps) => (
  <Typography variant="srOnly" data-testid="offscreen-text">
    {children}
  </Typography>
);

OffscreenText.propTypes = OffscreenTextPropTypes;

export default OffscreenText;
