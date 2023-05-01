import * as S from './PageItem.styled';
import PropTypes, { InferProps } from 'prop-types';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

// Assets
import {
  faParagraph,
  faClock,
  faHandHoldingUsd,
  faUser,
  faCreditCard,
  faAddressCard,
  faImage,
  faGifts,
  faShoppingBag,
  faHands
} from '@fortawesome/free-solid-svg-icons';

import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import { NoComponentError } from 'components/donationPage/pageGetters';
import PencilButton from 'elements/buttons/PencilButton';
import TrashButton from 'elements/buttons/TrashButton';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
} as Record<PageElementType, Partial<ContributionPageElement>>;

export interface PageItemProps extends InferProps<typeof PageItemPropTypes> {
  element: Pick<ContributionPageElement, 'type'>;
  onClick?: () => void;
}

function PageItem({ element, disabled, isStatic, handleItemEdit, handleItemDelete, ...props }: PageItemProps) {
  return (
    <S.PageItem $disabled={!!disabled} {...props} data-testid={`page-item-${element.type}`}>
      {dynamicElements[element.type] ? (
        <>
          <S.ItemIconWrapper>
            <S.ItemIcon icon={getElementIcon(element.type)} $disabled={!!disabled} />
          </S.ItemIconWrapper>
          <S.ItemContentWrapper>
            <S.ContentLeft>
              <S.ItemName>{dynamicElements[element.type].displayName}</S.ItemName>
              <S.ItemDescription>{dynamicElements[element.type].description}</S.ItemDescription>
            </S.ContentLeft>
            {!isStatic && (
              <S.ContentRight>
                <PencilButton aria-label={`Edit ${element.type} block`} onClick={handleItemEdit} />
                {!dynamicElements[element.type].required && (
                  <TrashButton aria-label={`Remove ${element.type} block`} onClick={handleItemDelete} />
                )}
              </S.ContentRight>
            )}
          </S.ItemContentWrapper>
        </>
      ) : (
        <NoComponentError name={element.type} />
      )}
    </S.PageItem>
  );
}

function getElementIcon(elementType: PageElementType): IconProp {
  switch (elementType) {
    case 'DRichText':
      return faParagraph;

    case 'DFrequency':
      return faClock;

    case 'DAmount':
      return faHandHoldingUsd;

    case 'DDonorInfo':
      return faUser;

    case 'DDonorAddress':
      return faAddressCard;

    case 'DPayment':
      return faCreditCard;

    case 'DImage':
      return faImage;

    case 'DBenefits':
      return faGifts;

    case 'DSwag':
      return faShoppingBag;

    case 'DReason':
      return faHands;

    default:
      // Should never happen
      return undefined as any;
  }
}

const PageItemPropTypes = {
  element: PropTypes.shape({
    type: PropTypes.string.isRequired
  }).isRequired,
  disabled: PropTypes.bool,
  isStatic: PropTypes.bool,
  handleItemEdit: PropTypes.func,
  handleItemDelete: PropTypes.func,
  onClick: PropTypes.func
};

PageItem.propTypes = PageItemPropTypes;

export default PageItem;
