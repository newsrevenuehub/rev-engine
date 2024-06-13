import PropTypes, { InferProps } from 'prop-types';
import { Description, Title, Wrapper, TextWrapper, AppealButton } from './Appeal.styled';
import { PORTAL } from 'routes';
import { Link as RouterLink } from 'react-router-dom';
import { RevenueProgram } from 'hooks/useContributionPage';
import PortalAppealImage from 'assets/images/portal-appeal.png';

const AppealLink = AppealButton as any;

export interface AppealProps extends InferProps<typeof AppealPropTypes> {
  revenueProgram?: Pick<RevenueProgram, 'contributor_portal_show_appeal' | 'website_url'>;
}

const Appeal = ({ slim, inModal, revenueProgram }: AppealProps) => {
  if (!revenueProgram?.contributor_portal_show_appeal) {
    return null;
  }

  return (
    <Wrapper data-testid="appeal" $slim={!!slim} $inModal={!!inModal}>
      <img src={PortalAppealImage} alt="People holding hands" />
      <TextWrapper $slim={!!slim}>
        <Title $slim={!!slim}>We couldn’t do this important work without you</Title>
        <Description $hideText={!!slim}>
          We appreciate your commitment to our independent newsroom. Reader support is critical in sustaining our
          work—and strengthening democracy.
          <br />
          <br />
          Your contributions help enable all of us to be better informed, connected and empowered. Thank you for
          believing in the importance of independent journalism.
        </Description>
        {slim && (
          <AppealLink component={RouterLink} to={PORTAL.CONTRIBUTIONS}>
            See more
          </AppealLink>
        )}
        {!slim && revenueProgram.website_url && (
          <AppealLink component="a" href={revenueProgram.website_url} target="_blank" rel="noopener noreferrer">
            Keep Reading
          </AppealLink>
        )}
      </TextWrapper>
    </Wrapper>
  );
};

const AppealPropTypes = {
  slim: PropTypes.bool,
  inModal: PropTypes.bool,
  revenueProgram: PropTypes.object
};

Appeal.propTypes = AppealPropTypes;

export default Appeal;
