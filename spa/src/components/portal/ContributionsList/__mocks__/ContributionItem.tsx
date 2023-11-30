import { ContributionItemProps } from '../ContributionItem';

export const ContributionItem = (props: ContributionItemProps) => (
  <div data-testid={`mock-contribution-item-${props.contribution.payment_provider_id}`} />
);

export default ContributionItem;
