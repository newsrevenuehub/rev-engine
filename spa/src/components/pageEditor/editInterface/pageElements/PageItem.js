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
  faShoppingBag
} from '@fortawesome/free-solid-svg-icons';

import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';

const dynamicElements = { ...dynamicPageElements, ...dynamicSidebarElements };

function PageItem({ element, disabled, dragState, isStatic, handleItemClick, ...props }) {
  const handleOpenProperties = () => {
    if (dragState !== 'idle') return;
    handleItemClick(element);
  };

  return (
    <S.PageItem
      disabled={disabled}
      onMouseUp={isStatic ? () => {} : handleOpenProperties}
      {...props}
      data-testid="edit-interface-item"
    >
      <S.ItemIconWrapper>
        <S.ItemIcon icon={getElementIcon(element.type)} disabled={disabled} />
      </S.ItemIconWrapper>
      <S.ItemContentWrapper>
        <S.ItemName>{dynamicElements[element.type].displayName}</S.ItemName>
        <S.ItemDescription>{dynamicElements[element.type].description}</S.ItemDescription>
      </S.ItemContentWrapper>
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

    default:
      return undefined;
  }
}

export default PageItem;
