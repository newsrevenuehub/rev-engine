import { Switch, SwitchProps, Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import PropTypes, { InferProps } from 'prop-types';

import {
  Title,
  Flex,
  Required,
  CornerMessage,
  Header,
  Image,
  Content,
  Site,
  Description,
  Footer,
  LaunchIcon
} from './IntegrationCard.styled';

export interface IntegrationCardProps extends InferProps<typeof IntegrationCardPropTypes> {
  onChange?: SwitchProps['onChange'];
}

const IntegrationCard = ({ className, isActive, onChange, ...card }: IntegrationCardProps) => {
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();
  const showCornerMessage = card.isRequired || !!card.cornerMessage;

  const renderCornerMessage = (showMessage: boolean) => {
    if (!showMessage) return null;
    if (card.isRequired) {
      return <Required>*Required</Required>;
    }
    if (card.cornerMessage && !isActive) {
      return <CornerMessage>{card.cornerMessage}</CornerMessage>;
    }
    return null;
  };

  return (
    <Flex className={className!} data-testid="integration-card">
      <Header>
        <Image src={card.image} aria-label={`${card.title} logo`} />
        <Title>{card.title}</Title>
        {renderCornerMessage(showCornerMessage)}
      </Header>
      <Content>
        <div style={{ display: 'flex' }}>
          <Site href={card.site.url} rel="noopener noreferrer" target="_blank">
            {card.site.label}
            <LaunchIcon />
          </Site>
        </div>
        <Description>{card.description}</Description>
      </Content>
      <Footer $active={isActive!}>
        <p>{isActive! ? 'Connected' : card.toggleLabel ?? 'Not Connected'}</p>
        <Tooltip
          interactive
          title={
            <p style={{ color: 'white', margin: 0 }}>
              {isActive ? card.toggleConnectedTooltipMessage ?? card.toggleTooltipMessage : card.toggleTooltipMessage}
            </p>
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
  onChange: PropTypes.func
};

IntegrationCard.propTypes = IntegrationCardPropTypes;

IntegrationCard.defaultProps = {
  isActive: false,
  className: ''
};

export default IntegrationCard;
