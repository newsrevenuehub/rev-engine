import { Link } from 'react-router-dom';
import { PORTAL } from 'routes';
import { Root, Text } from './TokenError.styled';

export function TokenError() {
  return (
    <Root>
      <Text>We were unable to log you in.</Text>
      <Text>
        Magic links have short expiration times. If your link expired, <Link to={PORTAL.ENTRY}>go here</Link> to get
        another.
      </Text>
    </Root>
  );
}

export default TokenError;
