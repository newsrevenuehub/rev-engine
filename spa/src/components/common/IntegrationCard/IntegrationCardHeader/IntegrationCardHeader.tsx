import { useMemo } from 'react';
import PropTypes, { InferProps } from 'prop-types';

import {
  Header,
  Image,
  Required,
  CornerMessage,
  Site,
  LaunchIcon,
  Title,
  TitleWrapper
} from './IntegrationCardHeader.styled';

export type IntegrationCardHeaderProps = InferProps<typeof IntegrationCardPropTypes>;

const IntegrationCardHeader = ({
  isActive = false,
  enableCornerMessage = false,
  isRequired,
  cornerMessage,
  title,
  image,
  site
}: IntegrationCardHeaderProps) => {
  const renderCornerMessage = useMemo(() => {
    if ((!isRequired || !cornerMessage) && !enableCornerMessage) return null;
    if (isRequired) {
      return <Required>*Required</Required>;
    }
    if (cornerMessage && !isActive) {
      return <CornerMessage>{cornerMessage}</CornerMessage>;
    }
    return null;
  }, [cornerMessage, enableCornerMessage, isActive, isRequired]);

  return (
    <Header>
      <Image src={image} aria-label={`${title} logo`} />
      <TitleWrapper>
        <Title>{title}</Title>
        <div style={{ display: 'flex' }}>
          <Site href={site.url} rel="noopener noreferrer" target="_blank">
            {site.label}
            <LaunchIcon />
          </Site>
        </div>
      </TitleWrapper>
      {renderCornerMessage}
    </Header>
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
  isActive: PropTypes.bool,
  enableCornerMessage: PropTypes.bool
};

IntegrationCardHeader.propTypes = IntegrationCardPropTypes;

export default IntegrationCardHeader;
