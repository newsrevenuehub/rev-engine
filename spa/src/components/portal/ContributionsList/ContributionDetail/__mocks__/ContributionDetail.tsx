import { ContributionDetailProps } from '../ContributionDetail';

export const ContributionDetail = (props: ContributionDetailProps) => (
  <div
    data-testid="mock-contribution-detail"
    data-contributor-id={props.contributorId}
    data-contribution-id={props.contributionId}
  />
);

export default ContributionDetail;
