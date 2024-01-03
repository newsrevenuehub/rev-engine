import { ContributionItemProps } from '../ContributionItem';

export const ContributionItem = (props: ContributionItemProps) => (
  <div data-testid={`mock-contribution-item-${props.contribution.id}`} />
);

export default ContributionItem;
