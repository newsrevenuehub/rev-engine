import { Typography } from '@material-ui/core';
import { ReactChild } from 'react';

export interface OffscreenTextProps {
  children: ReactChild;
}

/**
 * Text that is perceiveable only by assistive technology. Where possible, use ARIA instead.
 * @see https://v4.mui.com/api/typography/
 */
export const OffscreenText = ({ children }: OffscreenTextProps) => <Typography variant="srOnly">{children}</Typography>;

export default OffscreenText;
