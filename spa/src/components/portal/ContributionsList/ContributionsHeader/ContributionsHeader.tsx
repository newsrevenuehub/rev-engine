import PropTypes, { InferProps } from 'prop-types';
import { LinkButton } from 'components/base';
import { ContributionPage, RevenueProgramForContributionPage } from 'hooks/useContributionPage';
import { pageLink } from 'utilities/getPageLinks';
import { Controls, Header, Message, Root } from './ContributionsHeader.styled';

const ContributionsHeaderPropTypes = {
  defaultPage: PropTypes.any,
  revenueProgram: PropTypes.any
};

export interface ContributionsHeaderProps extends InferProps<typeof ContributionsHeaderPropTypes> {
  defaultPage?: ContributionPage;
  revenueProgram?: RevenueProgramForContributionPage;
}

export function ContributionsHeader({ defaultPage, revenueProgram }: ContributionsHeaderProps) {
  return (
    <Root>
      <Header>Your Contributions</Header>
      <Message>
        Your support helps quality journalism thrive, so that we can create a more informed and engaged society. Thank
        you for being a contributor.
      </Message>
      <Controls>
        {revenueProgram?.website_url && (
          <LinkButton color="secondary" href={revenueProgram?.website_url} target="_blank">
            Return to Website
          </LinkButton>
        )}
        {defaultPage && (
          <LinkButton color="primaryDark" href={`//${pageLink(defaultPage)}`} target="_blank">
            Make a New Contribution
          </LinkButton>
        )}
      </Controls>
    </Root>
  );
}

ContributionsHeader.propTypes = ContributionsHeaderPropTypes;
export default ContributionsHeader;
