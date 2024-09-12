import { CircularProgress, Tab } from 'components/base';
import Sort from 'components/common/Sort';
import usePortal from 'hooks/usePortal';
import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import { ReactChild, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContactInfoPopover from './ContactInfoPopover/ContactInfoPopover';
import ContributionDetail from './ContributionDetail/ContributionDetail';
import ContributionFetchError from './ContributionFetchError';
import ContributionItem from './ContributionItem/ContributionItem';
import { ContributionsHeader } from './ContributionsHeader';
import {
  AlignPositionWrapper,
  ContactInfoWrapper,
  Detail,
  Layout,
  Legend,
  List,
  Loading,
  Root,
  StyledPortalPage,
  Subhead,
  Tabs
} from './ContributionsList.styled';
import NoContributions from './NoContributions';

const CONTRIBUTION_SORT_OPTIONS = [
  {
    label: (
      <span>
        Date <i>(most recent)</i>
      </span>
    ),
    selectedLabel: 'Date',
    value: 'first_payment_date'
  },
  { label: 'Status', value: 'status' },
  {
    label: (
      <span>
        Amount <i>(high to low)</i>
      </span>
    ),
    selectedLabel: 'Amount',
    value: 'amount'
  }
];

const CONTRIBUTIONS_TABS = ['All', 'Recurring', 'One-time'] as const;

export function ContributionsList() {
  const [tab, setTab] = useState(0);
  const { contributionId } = useParams<{ contributionId?: string }>();
  const { contributor } = usePortalAuthContext();
  const { page, pageIsFetched } = usePortal();
  const [ordering, setOrdering] = useState(CONTRIBUTION_SORT_OPTIONS[0].value);
  const { contributions, isError, isLoading, refetch } = usePortalContributionList(
    contributor?.id,
    page?.revenue_program.id,
    {
      ordering: ordering === 'first_payment_date' ? `-${ordering}` : `-${ordering},-first_payment_date`,
      // If the tab is 'All', we don't need to pass an interval
      ...(tab !== 0 && { interval: CONTRIBUTIONS_TABS[tab].toLowerCase().replace('-', '_') })
    }
  );
  const selectedContribution =
    contributionId && contributions.find((contribution) => contribution.id === parseInt(contributionId));
  // This needs to be state instead of a ref to trigger effects in
  // ContributionDetail when an item is selected.
  const [selectedContributionEl, setSelectedContributionEl] = useState<HTMLAnchorElement | null>(null);
  let content: ReactChild;
  const contentProps = { role: 'tabpanel', 'aria-labelledby': `tab-${tab}` };

  useEffect(() => {
    // Track viewing of a contribution detail in Pendo if available. If this
    // fails, log an error but don't otherwise show an error to the user.

    if (selectedContribution) {
      try {
        (window as any).pendo.track('portal-contribution-detail-view', {
          status: selectedContribution.status
        });
      } catch (error) {
        console.error(`Couldn't track a contribution detail view event in Pendo: ${(error as Error).message}`);
      }
    }
  }, [selectedContribution]);

  if (isLoading || !pageIsFetched) {
    content = (
      <Loading {...contentProps}>
        <CircularProgress aria-label="Loading contributions" variant="indeterminate" />
      </Loading>
    );
  } else if (isError) {
    content = (
      <AlignPositionWrapper {...contentProps}>
        <ContributionFetchError message="Error loading contributions." onRetry={refetch} />
      </AlignPositionWrapper>
    );
  } else if (contributor && contributions?.length > 0) {
    content = (
      <List $detailVisible={!!selectedContribution} {...contentProps}>
        {contributions.map((contribution) => (
          <ContributionItem
            contribution={contribution}
            key={contribution.id}
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
    content = (
      <AlignPositionWrapper {...contentProps}>
        <NoContributions />
      </AlignPositionWrapper>
    );
  }

  return (
    <StyledPortalPage>
      <Root>
        <Layout>
          <ContributionsHeader defaultPage={page} revenueProgram={page?.revenue_program} />
          {/* TODO: DEV-4981 Enable Impact Tracker as soon as it's available */}
          {/* <Impact>
            <ImpactTracker contributorId={contributor?.id} />
          </Impact> */}
          <Legend $detailVisible={!!selectedContribution}>
            <Subhead>Transactions</Subhead>
            <p>View billing history, update payment details, and resend receipts.</p>
            <Tabs aria-label="Filter contributions by" value={tab}>
              {CONTRIBUTIONS_TABS.map((name, index) => (
                <Tab
                  {...(index === tab && { 'aria-controls': `tab-${index}` })}
                  id={`tab-${index}`}
                  key={name}
                  label={name}
                  onClick={() => setTab(index)}
                  selected={index === tab}
                />
              ))}
            </Tabs>
            <Sort options={CONTRIBUTION_SORT_OPTIONS} onChange={setOrdering} id="contributions-sort" />
            <ContactInfoWrapper>
              <ContactInfoPopover revenueProgram={page?.revenue_program} />
            </ContactInfoWrapper>
          </Legend>
          {content}
          {contributor && selectedContribution && (
            <Detail>
              <ContributionDetail
                domAnchor={selectedContributionEl}
                contributionId={selectedContribution.id}
                contributorId={contributor.id}
              />
            </Detail>
          )}
        </Layout>
      </Root>
    </StyledPortalPage>
  );
}

export default ContributionsList;
