import { ReactChild } from 'react';
import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import ContributionItem from './ContributionItem';
import { MainContent, List, Root, Subhead, Columns } from './ContributionsList.styled';
import NoContributions from './NoContributions';
import { CircularProgress } from 'components/base';

export function ContributionsList() {
  const { contributor } = usePortalAuthContext();
  const { contributions, isLoading } = usePortalContributionList(contributor?.id);
  let content: ReactChild;

  if (isLoading) {
    content = <CircularProgress aria-label="Loading contributions" variant="indeterminate" />;
  } else if (contributions?.length > 0) {
    content = (
      <List>
        {contributions.map((contribution) => (
          <ContributionItem contribution={contribution} key={contribution.payment_provider_id} />
        ))}
      </List>
    );
  } else {
    content = <NoContributions />;
  }

  return (
    <Root>
      <Columns>
        <MainContent>
          <Subhead>Transactions</Subhead>
          <p>View billing history, update payment details, and resend receipts.</p>
          {content}
        </MainContent>
      </Columns>
    </Root>
  );
}

export default ContributionsList;
