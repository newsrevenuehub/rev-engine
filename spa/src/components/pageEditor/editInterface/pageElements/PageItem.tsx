import PriceChange from '@material-design-icons/svg/outlined/price_change.svg?react';
import VolunteerActivism from '@material-design-icons/svg/outlined/volunteer_activism.svg?react';
import * as S from './PageItem.styled';
import PropTypes, { InferProps } from 'prop-types';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import { NoComponentError } from 'components/donationPage/pageGetters';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';
import {
  DeleteOutline,
  EditOutlined,
  HomeWork,
  Image,
  Payment,
  Person,
  Schedule,
  SentimentVerySatisfied,
  ShoppingBasket,
  TextFields
} from '@material-ui/icons';
import { ComponentType } from 'react';
import { IconButton } from 'components/base';

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
} as Record<PageElementType, Partial<ContributionPageElement>>;

const elementIcons: Record<PageElementType, ComponentType> = {
  DAmount: PriceChange,
  DBenefits: SentimentVerySatisfied,
  DDonorInfo: Person,
  DDonorAddress: HomeWork,
  DFrequency: Schedule,
  DImage: Image,
  DPayment: Payment,
  DReason: VolunteerActivism,
  DRichText: TextFields,
  DSwag: ShoppingBasket
};

export interface PageItemProps extends InferProps<typeof PageItemPropTypes> {
  element: Pick<ContributionPageElement, 'type'>;
  onClick?: () => void;
}

function PageItem({ element, disabled, isStatic, handleItemEdit, handleItemDelete, ...props }: PageItemProps) {
  const ElementIcon = elementIcons[element.type];

  return (
    <S.PageItem $disabled={!!disabled} {...props} data-testid={`page-item-${element.type}`}>
      {dynamicElements[element.type] ? (
        <>
          <S.ItemIconWrapper>
            <S.ItemIcon $disabled={!!disabled}>
              <ElementIcon />
            </S.ItemIcon>
          </S.ItemIconWrapper>
          <S.ItemContentWrapper>
            <S.ContentLeft>
              <S.ItemName>{dynamicElements[element.type].displayName}</S.ItemName>
              <S.ItemDescription>{dynamicElements[element.type].description}</S.ItemDescription>
            </S.ContentLeft>
            {!isStatic && (
              <S.ContentRight>
                {handleItemEdit && (
                  <IconButton
                    aria-label={`Edit ${element.type} block`}
                    color="text"
                    onClick={handleItemEdit}
                    data-testid="pencil-button"
                  >
                    <EditOutlined />
                  </IconButton>
                )}
                {handleItemDelete && !dynamicElements[element.type].required && (
                  <IconButton
                    aria-label={`Remove ${element.type} block`}
                    color="text"
                    onClick={handleItemDelete}
                    data-testid="trash-button"
                  >
                    <DeleteOutline />
                  </IconButton>
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
