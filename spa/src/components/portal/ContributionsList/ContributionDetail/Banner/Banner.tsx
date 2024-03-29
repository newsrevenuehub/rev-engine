import BlockIcon from '@material-design-icons/svg/filled/block.svg?react';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { ReactNode } from 'react';
import { Description, IconWrapper, Root, Title } from './Banner.styled';

const BannerPropTypes = {
  contribution: PropTypes.object.isRequired
};

export interface BannerProps extends InferProps<typeof BannerPropTypes> {
  contribution: PortalContributionDetail;
}

export function Banner({ contribution }: BannerProps) {
  let showBanner = true;

  const bannerInfo: {
    title: string;
    Icon: ReactNode;
    description: string;
  } = {
    title: '',
    Icon: null,
    description: ''
  };

  switch (contribution.status) {
    case 'canceled': {
      bannerInfo.title = 'Canceled';
      bannerInfo.Icon = <BlockIcon />;
      bannerInfo.description =
        'This contribution was canceled. Help our community and continue your support of our mission by creating a new contribution.';

      break;
    }
    // TODO: Add additional banner options (ex: Failed)
    case 'failed': {
      // TODO: remove "showBanner = false;" when the "Failed" banner is implemented
      showBanner = false;
      bannerInfo.title = 'Failed';
      bannerInfo.description =
        'This contribution failed. Help our community and continue your support of our mission by creating a new contribution.';
      break;
    }
    default: {
      showBanner = false;
      break;
    }
  }

  if (!showBanner) {
    return null;
  }

  return (
    <Root>
      <IconWrapper data-testid="banner-icon">{bannerInfo.Icon}</IconWrapper>
      <Title>{bannerInfo.title}</Title>
      <Description>{bannerInfo.description}</Description>
    </Root>
  );
}

Banner.propTypes = BannerPropTypes;
export default Banner;
