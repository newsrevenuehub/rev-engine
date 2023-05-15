import PropTypes, { InferProps } from 'prop-types';
import { Icon, Item, List, Text } from './IconList.styled';

export type IconListProps = InferProps<typeof IconListPropTypes>;

export const IconList = ({ list }: IconListProps) => {
  if (list?.length === 0) return null;

  return (
    <List data-testid="list-item">
      {list!.map(({ icon, text }) => (
        <Item key={text}>
          <Icon data-testid="list-item-icon">{icon}</Icon>
          <Text data-testid="list-item-text">{text}</Text>
        </Item>
      ))}
    </List>
  );
};

const IconListPropTypes = {
  list: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node.isRequired,
      text: PropTypes.string.isRequired
    }).isRequired
  )
};

export default IconList;
