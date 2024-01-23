import { forwardRef } from 'react';
import { ContributionItemProps } from '../ContributionItem';

export const ContributionItem = forwardRef<HTMLDivElement, ContributionItemProps>((props, ref) => (
  <div data-testid={`mock-contribution-item-${props.contribution.id}`} ref={ref} />
));

export default ContributionItem;
