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
  testId,
  name,
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
        <S.Select
          {...getToggleButtonProps()}
          name={name}
          data-testid={testId}
          value={(selectedItem && displayAccessor ? selectedItem[displayAccessor] : selectedItem) || placeholder}
        />

        {/* </S.Select> */}

        <S.List {...getMenuProps()} isOpen={isOpen} dropdownPosition={dropdownPosition}>
          {isOpen &&
            items.map((item, index) => (
              <S.Item
                key={`${item}${index}`}
                highlighted={highlightedIndex === index}
                data-testid={`select-item-${index}`}
                {...getItemProps({ item, index })}
              >
                {displayAccessor ? item[displayAccessor] : item}
              </S.Item>
            ))}
        </S.List>
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
