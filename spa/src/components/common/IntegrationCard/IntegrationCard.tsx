import { Switch, Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import PropTypes, { InferProps } from 'prop-types';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

import { IntegrationCardType } from './constants';
import {
  Title,
  Flex,
  Required,
  CornerMessage,
  Header,
  Image,
  Content,
  Site,
  Icon,
  Description,
  Footer
} from './IntegrationCard.styled';

export interface IntegrationCardProps
  extends Omit<IntegrationCardType, 'toggleLabel' | 'site'>,
    InferProps<typeof IntegrationCardPropTypes> {}

const IntegrationCard = ({ className, isActive, ...card }: IntegrationCardProps) => {
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();
  const showCornerMessage = card.isRequired || !!card.cornerMessage;

  const renderCornerMessage = (showMessage: boolean) => {
    if (!showMessage) return null;
    if (card.isRequired) {
      return <Required>*Required</Required>;
    }
    if (card.cornerMessage) {
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
            <Icon icon={faExternalLinkAlt} />
          </Site>
        </div>
        <Description>{card.description}</Description>
      </Content>
      <Footer $active={isActive!}>
        <p>{isActive! ? 'Connected' : card.toggleLabel || 'Not Connected'}</p>
        <Tooltip
          title={<p style={{ color: 'white', margin: 0 }}>{card.toggleTooltipMessage}</p>}
          placement="bottom-end"
          open={showTooltip && !!card.toggleTooltipMessage}
          onClose={handleCloseTooltip}
          onOpen={handleOpenTooltip}
        >
          {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
          <div data-testid="integration-switch-wrapper">
            <Switch
              checked={isActive!}
              name={`${card.title} integration`}
              inputProps={{ 'aria-label': `${card.title} is ${isActive ? '' : 'not '}integrated` }}
              disabled={card.disabled}
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
  cornerMessage: PropTypes.string,
  site: PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
  }).isRequired,
  description: PropTypes.string.isRequired,
  toggleLabel: PropTypes.node,
  toggleTooltipMessage: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  isActive: PropTypes.bool
};

IntegrationCard.propTypes = IntegrationCardPropTypes;

IntegrationCard.defaultProps = {
  isActive: false,
  className: ''
};

export default IntegrationCard;
