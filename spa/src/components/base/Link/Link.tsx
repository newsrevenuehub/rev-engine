import { Link as MuiLink, LinkProps as MuiLinkProps } from '@material-ui/core';
import { ExitToApp } from '@material-ui/icons';
import styled from 'styled-components';

export interface LinkProps extends MuiLinkProps {
  /**
   * Should the link have an icon indicating it's an external link appended?
   */
  external?: boolean;
}

/**
 * @see https://v4.mui.com/components/links/#links
 */
const StyledLink = styled(MuiLink)`
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

const ExternalIcon = styled(ExitToApp)`
  height: 24px;
  margin-left: 6px;
  vertical-align: middle;
  width: 24px;
`;

export function Link({ children, external, ...other }: LinkProps) {
  return (
    <StyledLink {...other}>
      {children}
      {external && <ExternalIcon />}
    </StyledLink>
  );
}

export default Link;
