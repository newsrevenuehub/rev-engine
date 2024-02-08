import AttachMoney from '@material-design-icons/svg/outlined/attach_money.svg?react';
import HomeWork from '@material-design-icons/svg/outlined/home_work.svg?react';
import Image from '@material-design-icons/svg/outlined/image.svg?react';
import ShoppingBasket from '@material-design-icons/svg/outlined/shopping_basket.svg?react';
import VolunteerActivism from '@material-design-icons/svg/outlined/volunteer_activism.svg?react';
import {
  DeleteOutline,
  EditOutlined,
  Payment,
  Person,
  Schedule,
  SentimentVerySatisfied,
  TextFields
} from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { ComponentType } from 'react';
import { Tooltip } from 'components/base';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import { NoComponentError } from 'components/donationPage/pageGetters';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';
import {
  ControlIconButton,
  Controls,
  Header,
  HeaderDescription,
  HeaderIcon,
  HeaderTitle,
  Root
} from './PageItem.styled';

const dynamicElements = {
  ...dynamicPageElements,
  ...dynamicSidebarElements
} as Record<PageElementType, Partial<ContributionPageElement>>;

const elementIcons: Record<PageElementType, ComponentType> = {
  DAmount: AttachMoney,
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
    <Root $disabled={!!disabled} $isStatic={!!isStatic} {...props} data-testid={`page-item-${element.type}`}>
      {dynamicElements[element.type] ? (
        <>
          <div>
            <Header>
              <HeaderIcon $disabled={!!disabled}>
                <ElementIcon />
              </HeaderIcon>
              <HeaderTitle $disabled={!!disabled}>{dynamicElements[element.type].displayName}</HeaderTitle>
            </Header>
            <HeaderDescription>{dynamicElements[element.type].description}</HeaderDescription>
          </div>
          {!isStatic && (
            <Controls>
              {handleItemDelete && !dynamicElements[element.type].required && (
                <Tooltip title={`Remove ${dynamicElements[element.type].displayName}`}>
                  <ControlIconButton
                    aria-label={`Remove ${dynamicElements[element.type].displayName}`}
                    color="text"
                    onClick={handleItemDelete}
                    data-testid="trash-button"
                  >
                    <DeleteOutline />
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
  onClick: PropTypes.func
};

PageItem.propTypes = PageItemPropTypes;

export default PageItem;
