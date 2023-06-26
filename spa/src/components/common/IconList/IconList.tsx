import PropTypes, { InferProps } from 'prop-types';
import { Icon, Item, List, Text } from './IconList.styled';

export interface IconListProps extends InferProps<typeof IconListPropTypes> {
  iconSize?: 'small' | 'medium';
}

export const IconList = ({ list, iconSize = 'small' }: IconListProps) => {
  return (
    <List data-testid="list-item">
      {list.map(({ icon, text }) => (
        <Item key={text}>
          <Icon $size={iconSize} data-testid="list-item-icon">
            {icon}
          </Icon>
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
  ).isRequired,
  iconSize: PropTypes.oneOf(['small', 'medium'])
};

export default IconList;
