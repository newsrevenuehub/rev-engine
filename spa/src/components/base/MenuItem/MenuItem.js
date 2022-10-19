import { MenuItem as MuiMenuItem } from '@material-ui/core';
import styled from 'styled-components';
import { forwardRef } from 'react';

const StyledMenuItem = styled(MuiMenuItem)`
  && {
    margin: 4px;
    border-radius: ${(props) => props.theme.muiBorderRadius.md};
  }
`;

export const MenuItem = forwardRef((props, ref) => <StyledMenuItem ref={ref} {...props} />);

MenuItem.propTypes = MuiMenuItem.propTypes;

export default MenuItem;
