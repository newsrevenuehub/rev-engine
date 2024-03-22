import { EditOutlined, RemoveCircleOutline } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Tooltip } from 'components/base';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import { NoComponentError } from 'components/donationPage/pageGetters';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';
import { ControlIconButton, Controls, Description, DragIndicator, Header, Root } from './PageItem.styled';

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
} as Record<PageElementType, Partial<ContributionPageElement>>;

export interface PageItemProps extends InferProps<typeof PageItemPropTypes> {
  element: Pick<ContributionPageElement, 'type'>;
  onClick?: () => void;
}

function PageItem({
  element,
  disabled,
  isStatic,
  handleItemEdit,
  handleItemDelete,
  showDescription,
  ...props
}: PageItemProps) {
  const showDelete = handleItemDelete && !dynamicElements[element.type]?.required;

  return (
    <Root $disabled={!!disabled} $isStatic={!!isStatic} {...props} data-testid={`page-item-${element.type}`}>
      {dynamicElements[element.type] ? (
        <>
          {!isStatic && <DragIndicator />}
          <Header $disabled={!!disabled}>{dynamicElements[element.type].displayName}</Header>
          {showDescription && (
            <Description $disabled={!!disabled}>{dynamicElements[element.type].description}</Description>
          )}
          {!isStatic && (
            <Controls>
              {showDelete && (
                <Tooltip title={`Remove ${dynamicElements[element.type].displayName}`}>
                  <ControlIconButton
                    aria-label={`Remove ${dynamicElements[element.type].displayName}`}
                    color="text"
                    onClick={handleItemDelete}
                    data-testid="trash-button"
                    $delete
                    $rounding={handleItemEdit ? 'left' : 'both'}
                  >
                    <RemoveCircleOutline />
                  </ControlIconButton>
                </Tooltip>
              )}
              {handleItemEdit && (
                <Tooltip title={`Edit ${dynamicElements[element.type].displayName}`}>
                  <ControlIconButton
                    aria-label={`Edit ${dynamicElements[element.type].displayName}`}
                    color="text"
                    onClick={handleItemEdit}
                    data-testid="pencil-button"
                    $rounding={showDelete ? 'right' : 'both'}
                  >
                    <EditOutlined />
                  </ControlIconButton>
                </Tooltip>
              )}
            </Controls>
          )}
        </>
      ) : (
        <NoComponentError name={element.type} />
      )}
    </Root>
  );
}

const PageItemPropTypes = {
  element: PropTypes.shape({
    type: PropTypes.string.isRequired
  }).isRequired,
  disabled: PropTypes.bool,
  isStatic: PropTypes.bool,
  handleItemEdit: PropTypes.func,
  handleItemDelete: PropTypes.func,
  onClick: PropTypes.func,
  showDescription: PropTypes.bool
};

PageItem.propTypes = PageItemPropTypes;

export default PageItem;
