import { Switch, SwitchProps, Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import PropTypes, { InferProps } from 'prop-types';

import {
  Flex,
  Content,
  Description,
  Footer,
  CustomButtonLink,
  RightActionWrapper,
  TooltipTitle
} from './IntegrationCard.styled';
import IntegrationCardHeader from './IntegrationCardHeader';

export interface IntegrationCardProps extends InferProps<typeof IntegrationCardPropTypes> {
  onChange?: SwitchProps['onChange'];
}

const IntegrationCard = ({
  className,
  isActive,
  onChange,
  onViewDetails,
  rightAction,
  ...card
}: IntegrationCardProps) => {
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();

  return (
    <Flex className={className!} data-testid="integration-card">
      <IntegrationCardHeader
        image={card.image}
        title={card.title}
        site={card.site}
        isRequired={card.isRequired}
        isActive={isActive}
        enableCornerMessage={true}
        cornerMessage={card.cornerMessage}
      />
      <Content>
        <Description>{card.description}</Description>
        {onViewDetails && <CustomButtonLink onClick={onViewDetails}>View Details</CustomButtonLink>}
        {rightAction && <RightActionWrapper data-testid="right-action">{rightAction}</RightActionWrapper>}
      </Content>
      <Footer $active={isActive!}>
        <p>{isActive! ? 'Connected' : card.toggleLabel ?? 'Not Connected'}</p>
        <Tooltip
          interactive
          title={
            <TooltipTitle>
              {isActive ? card.toggleConnectedTooltipMessage ?? card.toggleTooltipMessage : card.toggleTooltipMessage}
            </TooltipTitle>
          }
          placement="bottom-end"
          open={showTooltip && (!!card.toggleTooltipMessage || (!!card.toggleConnectedTooltipMessage && isActive!))}
          onClose={handleCloseTooltip}
          onOpen={handleOpenTooltip}
        >
          {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
          <div data-testid="integration-switch-wrapper">
            <Switch
              onChange={onChange}
              checked={isActive!}
              name={`${card.title} integration`}
              inputProps={{ 'aria-label': `${card.title} is ${isActive ? '' : 'not '}connected` }}
              disabled={card.disabled || isActive!}
            />
          </div>
        </Tooltip>
      </Footer>
    </Flex>
  );
};

const IntegrationCardPropTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  isRequired: PropTypes.bool.isRequired,
  cornerMessage: PropTypes.node,
  site: PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
  }).isRequired,
  description: PropTypes.string.isRequired,
  toggleLabel: PropTypes.node,
  toggleTooltipMessage: PropTypes.string,
  toggleConnectedTooltipMessage: PropTypes.node,
  className: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  isActive: PropTypes.bool,
  onViewDetails: PropTypes.func,
  onChange: PropTypes.func,
  rightAction: PropTypes.node
};

IntegrationCard.propTypes = IntegrationCardPropTypes;

IntegrationCard.defaultProps = {
  isActive: false,
  className: ''
};

export default IntegrationCard;
