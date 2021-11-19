import * as S from './PageItem.styled';

// Assets
import {
  faParagraph,
  faClock,
  faHandHoldingUsd,
  faUser,
  faPlus,
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

const dynamicElements = { ...dynamicPageElements, ...dynamicSidebarElements };

function PageItem({ element, disabled, isStatic, handleItemClick, handleItemEdit, handleItemDelete, ...props }) {
  return (
    <S.PageItem disabled={disabled} {...props} data-testid={`page-item-${element.type}`}>
      {dynamicElements[element.type] ? (
        <>
          <S.ItemIconWrapper>
            <S.ItemIcon icon={getElementIcon(element.type)} disabled={disabled} />
          </S.ItemIconWrapper>
          <S.ItemContentWrapper>
            <S.ContentLeft>
              <S.ItemName>{dynamicElements[element.type].displayName}</S.ItemName>
              <S.ItemDescription>{dynamicElements[element.type].description}</S.ItemDescription>
            </S.ContentLeft>
            {!isStatic && (
              <S.ContentRight>
                <PencilButton onClick={handleItemEdit} />
                {!dynamicElements[element.type].required && <TrashButton onClick={handleItemDelete} />}
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

function getElementIcon(elementType) {
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

    case 'DAdditionalInfo':
      return faPlus;

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
      return undefined;
  }
}

export default PageItem;
