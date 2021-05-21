import * as S from './Select.styled';
import PropTypes from 'prop-types';
import BaseField from 'elements/inputs/BaseField';

// Deps
import { useSelect } from 'downshift';

function Select({ onChange, items, placeholder, ...props }) {
  const {
    isOpen,
    selectedItem,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    highlightedIndex,
    getItemProps
  } = useSelect({ items });

  return (
    <BaseField labelProps={{ ...getLabelProps() }} {...props}>
      <S.SelectWrapper>
        <S.Select type="button" {...getToggleButtonProps()}>
          {selectedItem || placeholder}
        </S.Select>
        <S.List {...getMenuProps()}>
          {isOpen &&
            items.map((item, index) => (
              <S.Item
                key={`${item}${index}`}
                highlighted={highlightedIndex === index}
                // style={highlightedIndex === index ? { backgroundColor: '#bde4ff' } : {}}
                {...getItemProps({ item, index })}
              >
                {item}
              </S.Item>
            ))}
        </S.List>
      </S.SelectWrapper>
    </BaseField>
  );
}

Select.propTypes = {
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string
};

Select.defaultProps = {
  placeholder: 'Select an item'
};

export default Select;
