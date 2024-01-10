import { ReactChild, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress } from 'components/base';
import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import ContributionItem from './ContributionItem/ContributionItem';
import NoContributions from './NoContributions';
import ContributionFetchError from './ContributionFetchError';
import ContributionDetail from './ContributionDetail/ContributionDetail';
import { List, Root, Subhead, Columns, Loading, Legend, Detail } from './ContributionsList.styled';

export function ContributionsList() {
  const { contributionId } = useParams<{ contributionId?: string }>();
  const { contributor } = usePortalAuthContext();
  const { contributions, isError, isLoading, refetch } = usePortalContributionList(contributor?.id);
  const selectedContribution = contributions.find(
    (contribution) => contribution.payment_provider_id === contributionId
  );
  // This needs to be state instead of a ref to trigger effects in
  // ContributionDetail when an item is selected.
  const [selectedContributionEl, setSelectedContributionEl] = useState<HTMLAnchorElement | null>(null);
  let content: ReactChild;

  if (isLoading) {
    content = (
      <Loading>
        <CircularProgress aria-label="Loading contributions" variant="indeterminate" />
      </Loading>
    );
  } else if (isError) {
    content = <ContributionFetchError message="Error loading contributions." onRetry={() => refetch()} />;
  } else if (contributor && contributions?.length > 0) {
    content = (
      <List $detailVisible={!!selectedContribution}>
        {contributions.map((contribution) => (
          <ContributionItem
            contribution={contribution}
            key={contribution.payment_provider_id}
            // If a contribution is currently selected, selecting another one
            // should replace it in history so that the back button always goes
            // back to the list without detail.
            replaceHistory={!!contributionId}
            ref={selectedContribution === contribution ? setSelectedContributionEl : undefined}
            selected={selectedContribution === contribution}
          />
        ))}
      </List>
    );
  } else {
    content = <NoContributions />;
  }

  return (
    <Root>
      <Columns>
        <Legend $detailVisible={!!selectedContribution}>
          <Subhead>Transactions</Subhead>
          <p>View billing history, update payment details, and resend receipts.</p>
        </Legend>
        {content}
        {contributor && selectedContribution && (
          <Detail>
            <ContributionDetail
              domAnchor={selectedContributionEl}
              contributionId={selectedContribution.payment_provider_id}
              contributorId={contributor.id}
            />
          </Detail>
        )}
      </Columns>
    </Root>
  );
}

export default ContributionsList;
