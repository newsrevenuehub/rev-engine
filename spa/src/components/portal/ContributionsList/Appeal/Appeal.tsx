import PropTypes, { InferProps } from 'prop-types';
import { Description, Title, Wrapper, TextWrapper, AppealButton, Image } from './Appeal.styled';
import { PORTAL } from 'routes';
import { Link as RouterLink } from 'react-router-dom';
import { RevenueProgram } from 'hooks/useContributionPage';
import PortalAppealImage from 'assets/images/portal-appeal.jpg';

const AppealLink = AppealButton as any;

export interface AppealProps extends InferProps<typeof AppealPropTypes> {
  revenueProgram?: Pick<RevenueProgram, 'contributor_portal_show_appeal' | 'website_url'>;
  /**
   * If true, the appeal will render in a slim version, taking less space on the screen
   * @default false
   * */
  slim?: boolean;
  /**
   * If true, the appeal will render in a way to best fit being inside a modal
   * @default false
   * */
  isInsideModal?: boolean;
}

const Appeal = ({ slim, isInsideModal, revenueProgram }: AppealProps) => {
  if (!revenueProgram?.contributor_portal_show_appeal) {
    return null;
  }

  return (
    <Wrapper data-testid="appeal" $slim={!!slim} $isInsideModal={!!isInsideModal}>
      <Image $slim={!!slim} src={PortalAppealImage} alt="People holding hands" />
      <TextWrapper $slim={!!slim}>
        <Title $slim={!!slim}>We couldn’t do this important work without you</Title>
        <Description $hideText={!!slim}>
          <p>
            We appreciate your commitment to our independent newsroom. Reader support is critical in sustaining our
            work—and strengthening democracy.
          </p>
          <p>
            Your contributions help enable all of us to be better informed, connected and empowered. Thank you for
            believing in the importance of independent journalism.
          </p>
        </Description>
        {slim && (
          <AppealLink role="link" component={RouterLink} to={PORTAL.CONTRIBUTIONS}>
            See more
          </AppealLink>
        )}
        {!slim && revenueProgram.website_url && (
          <AppealLink component="a" href={revenueProgram.website_url} target="_blank">
            Keep Reading
          </AppealLink>
        )}
      </TextWrapper>
    </Wrapper>
  );
};

const AppealPropTypes = {
  slim: PropTypes.bool,
  isInsideModal: PropTypes.bool,
  revenueProgram: PropTypes.object
};

Appeal.propTypes = AppealPropTypes;

export default Appeal;
