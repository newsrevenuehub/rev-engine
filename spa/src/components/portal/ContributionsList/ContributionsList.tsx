import { ReactChild } from 'react';
import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import ContributionItem from './ContributionItem';
import NoContributions from './NoContributions';
import ContributionFetchError from './ContributionFetchError';
import { MainContent, List, Root, Subhead, Columns, Loading } from './ContributionsList.styled';
import { CircularProgress } from 'components/base';

export function ContributionsList() {
  const { contributor } = usePortalAuthContext();
  const { contributions, isError, isLoading, refetch } = usePortalContributionList(contributor?.id);
  let content: ReactChild;

  if (isLoading) {
    content = (
      <Loading>
        <CircularProgress aria-label="Loading contributions" variant="indeterminate" />
      </Loading>
    );
  } else if (isError) {
    content = <ContributionFetchError onRetry={() => refetch()} />;
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
