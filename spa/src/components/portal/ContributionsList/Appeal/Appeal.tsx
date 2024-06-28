import MultipleArrows from 'assets/icons/multiple_arrows.svg';
import PortalAppealImage from 'assets/images/portal-appeal.jpg';
import { RevenueProgram } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { AppealButton, Description, Image, MultipleArrowsIcon, TextWrapper, Title, Wrapper } from './Appeal.styled';

const AppealLink = AppealButton as any;

export interface AppealProps extends InferProps<typeof AppealPropTypes> {
  revenueProgram?: Pick<RevenueProgram, 'contributor_portal_show_appeal' | 'website_url'>;
  /**
   * If true, the appeal will render in a way to best fit being inside a modal
   * @default false
   * */
  isInsideModal?: boolean;
}

const Appeal = ({ isInsideModal, revenueProgram }: AppealProps) => {
  if (!revenueProgram?.contributor_portal_show_appeal) {
    return null;
  }

  return (
    <Wrapper data-testid="appeal" $isInsideModal={!!isInsideModal}>
      <MultipleArrowsIcon src={MultipleArrows} $isInsideModal={!!isInsideModal} alt="Arrows pointing up icon" />
      <Image src={PortalAppealImage} alt="People holding hands" />
      <TextWrapper>
        <Title>We couldn’t do this important work without you</Title>
        <Description>
          <p>
            We appreciate your commitment to our independent newsroom. Reader support is critical in sustaining our
            work—and strengthening democracy.
          </p>
          <p>
            Your contributions help enable all of us to be better informed, connected and empowered. Thank you for
            believing in the importance of independent journalism.
          </p>
        </Description>
        {revenueProgram.website_url && (
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
