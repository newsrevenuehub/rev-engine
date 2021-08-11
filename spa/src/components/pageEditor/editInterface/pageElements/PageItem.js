import * as S from './PageItem.styled';

// Assets
import {
  faParagraph,
  faClock,
  faHandHoldingUsd,
  faUser,
  faPlus,
  faCreditCard,
  faAddressCard
} from '@fortawesome/free-solid-svg-icons';

import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';

function PageItem({ element, disabled, dragState, isStatic, handleItemClick, ...props }) {
  const handleOpenProperties = (e) => {
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
      {/* {dynamicElements[element.type].isRequired} */}
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

    default:
      return undefined;
  }
}

export default PageItem;
