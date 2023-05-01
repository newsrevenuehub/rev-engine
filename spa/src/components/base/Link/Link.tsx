import { Link as MuiLink, LinkProps as MuiLinkProps } from '@material-ui/core';
import styled from 'styled-components';

export type LinkProps = MuiLinkProps;

/**
 * @see https://v4.mui.com/components/links/#links
 */
export const Link = styled(MuiLink)`
  && {
    color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
    font-weight: 500;

    &:active {
      color: #0042a3;
    }

    &:hover {
      color: #0a6dff;
    }
  }
`;

export default Link;
