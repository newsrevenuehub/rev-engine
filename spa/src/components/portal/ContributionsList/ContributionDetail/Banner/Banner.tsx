import BlockIcon from '@material-design-icons/svg/filled/block.svg?react';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import { ReactNode } from 'react';
import { Description, IconWrapper, Root, Title } from './Banner.styled';
import { Link } from 'react-router-dom';
import { pageLink } from 'utilities/getPageLinks';
import { ContributionPage } from 'hooks/useContributionPage';
import { revEngineTheme } from 'styles/themes';

const BannerPropTypes = {
  defaultPage: PropTypes.any,
  contribution: PropTypes.object.isRequired
};

export interface BannerProps extends InferProps<typeof BannerPropTypes> {
  defaultPage?: ContributionPage;
  contribution: PortalContributionDetail;
}

export function Banner({ contribution, defaultPage }: BannerProps) {
  let showBanner = true;

  const bannerInfo: {
    title: string;
    Icon: ReactNode;
    description: string | ReactNode;
  } = {
    title: '',
    Icon: null,
    description: ''
  };

  switch (contribution.status) {
    case 'canceled': {
      const link = defaultPage ? pageLink(defaultPage) : undefined;
      const canceledAtFormattedDate =
        contribution.canceled_at &&
        Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        }).format(new Date(contribution.canceled_at));

      bannerInfo.title = 'Canceled';
      bannerInfo.Icon = <BlockIcon />;
      bannerInfo.description = (
        <>
          This contribution was canceled{!!canceledAtFormattedDate ? ` at ${canceledAtFormattedDate}` : ''}. Help our
          community and continue your support of our mission by{' '}
          {link ? (
            <Link
              style={{ textDecoration: 'underline', color: revEngineTheme.basePalette.secondary.hyperlink }}
              to={`//${link}`}
              target="_blank"
            >
              creating a new contribution
            </Link>
          ) : (
            'creating a new contribution'
          )}
          .
        </>
      );

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
