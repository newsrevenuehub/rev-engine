import { Typography } from '@material-ui/core';

/**
 * Text that is perceiveable only by assistive technology. Where possible, use ARIA instead.
 * @see https://v4.mui.com/api/typography/
 */
export const OffscreenText = ({ children }) => <Typography variant="srOnly">{children}</Typography>;

export default OffscreenText;
