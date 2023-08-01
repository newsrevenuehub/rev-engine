import { ReactComponent as LightIcon } from 'assets/icons/recycle_light.svg';
import { Header, Root, Text } from './ComingSoon.styled';

export function ComingSoon() {
  return (
    <Root>
      <LightIcon />
      <Header>More features coming soon!</Header>
      <Text>
        We’re working hard to develop new features to help you customize your contribution experience. Keep checking
        back for updates.
      </Text>
    </Root>
  );
}

export default ComingSoon;
