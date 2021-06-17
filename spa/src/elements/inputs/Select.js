import * as S from './Select.styled';
import PropTypes from 'prop-types';
import BaseField from 'elements/inputs/BaseField';

// Deps
import { useSelect } from 'downshift';

function Select({
  selectedItem,
  onSelectedItemChange,
  items,
  dropdownPosition,
  displayAccessor,
  placeholder,
  ...props
}) {
  const { isOpen, getToggleButtonProps, getLabelProps, getMenuProps, highlightedIndex, getItemProps } = useSelect({
    items,
    selectedItem,
    onSelectedItemChange
  });

  return (
    <BaseField labelProps={{ ...getLabelProps() }} {...props}>
      <S.SelectWrapper>
        <S.Select type="button" {...getToggleButtonProps()} suppressRefError>
          {(selectedItem && selectedItem[displayAccessor]) || placeholder}
        </S.Select>
        {isOpen && (
          <S.List {...getMenuProps()} dropdownPosition={dropdownPosition}>
            {items.map((item, index) => (
              <S.Item
                key={`${item}${index}`}
                highlighted={highlightedIndex === index}
                data-testid={`select-item-${index}`}
                {...getItemProps({ item, index })}
              >
                {item[displayAccessor]}
              </S.Item>
            ))}
          </S.List>
        )}
      </S.SelectWrapper>
    </BaseField>
  );
}

Select.propTypes = {
  onSelectedItemChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string
};

Select.defaultProps = {
  placeholder: 'Select an item'
};

export default Select;
