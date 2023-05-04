import PropTypes, { InferProps } from 'prop-types';
import { ContributionPageElement } from 'hooks/useContributionPage';

interface PageItemProps extends InferProps<typeof PageItemPropTypes> {
  element: Pick<ContributionPageElement, 'type'>;
  onClick?: () => void;
  handleItemEdit?: () => void;
  handleItemDelete?: () => void;
}

function PageItem({ element, disabled, isStatic, handleItemEdit, handleItemDelete, onClick }: PageItemProps) {
  return (
    <div data-testid="page-item-element">
      <div data-testid="element">{JSON.stringify(element)}</div>
      <div data-testid="disabled">{disabled}</div>
      <div data-testid="isStatic">{isStatic}</div>
      <button data-testid="handleItemEdit" onClick={handleItemEdit}>
        handleItemEdit
      </button>
      <button data-testid="handleItemDelete" onClick={handleItemDelete}>
        handleItemDelete
      </button>
      <button data-testid={`onClick-${element.type}`} onClick={onClick} disabled={!!disabled}>
        onClick
      </button>
    </div>
  );
}

const PageItemPropTypes = {
  element: PropTypes.any.isRequired,
  disabled: PropTypes.bool,
  isStatic: PropTypes.bool,
  handleItemEdit: PropTypes.func,
  handleItemDelete: PropTypes.func,
  onClick: PropTypes.func
};

PageItem.propTypes = PageItemPropTypes;

export default PageItem;
