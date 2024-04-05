import QuestionMarkIcon from '@material-design-icons/svg/filled/question_mark.svg?react';
import LocalPhoneOutlinedIcon from '@material-ui/icons/LocalPhoneOutlined';
import MailOutlinedIcon from '@material-ui/icons/MailOutlined';
import { CircularProgress } from 'components/base';
import { ArrowPopover } from 'components/common/ArrowPopover';
import Sort from 'components/common/Sort';
import usePortal from 'hooks/usePortal';
import { usePortalAuthContext } from 'hooks/usePortalAuth';
import { usePortalContributionList } from 'hooks/usePortalContributionList';
import { ReactChild, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContributionDetail from './ContributionDetail/ContributionDetail';
import ContributionFetchError from './ContributionFetchError';
import ContributionItem from './ContributionItem/ContributionItem';
import { ContributionsHeader } from './ContributionsHeader';
import {
  AlignPositionWrapper,
  ContactInfoButton,
  ContactInfoDetails,
  ContactRow,
  ContactTypography,
  Detail,
  Layout,
  Legend,
  Link,
  List,
  Loading,
  Root,
  StyledPortalPage,
  Subhead,
  TitleTypography
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
    value: 'created'
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

export function ContributionsList() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { contributionId } = useParams<{ contributionId?: string }>();
  const { contributor } = usePortalAuthContext();
  const { page } = usePortal();
  const hasContactInfo = page?.revenue_program.contact_email || page?.revenue_program.contact_phone;
  const [ordering, setOrdering] = useState(CONTRIBUTION_SORT_OPTIONS[0].value);
  const { contributions, isError, isLoading, refetch } = usePortalContributionList(contributor?.id, {
    ordering: ordering === 'created' ? `-${ordering}` : `-${ordering},-created`
  });
  const selectedContribution =
    contributionId && contributions.find((contribution) => contribution.id === parseInt(contributionId));
  // This needs to be state instead of a ref to trigger effects in
  // ContributionDetail when an item is selected.
  const [selectedContributionEl, setSelectedContributionEl] = useState<HTMLAnchorElement | null>(null);
  let content: ReactChild;

  const showContactInfoPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

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

  if (isLoading) {
    content = (
      <Loading>
        <CircularProgress aria-label="Loading contributions" variant="indeterminate" />
      </Loading>
    );
  } else if (isError) {
    content = (
      <AlignPositionWrapper>
        <ContributionFetchError message="Error loading contributions." onRetry={refetch} />
      </AlignPositionWrapper>
    );
  } else if (contributor && contributions?.length > 0) {
    content = (
      <List $detailVisible={!!selectedContribution}>
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
      <AlignPositionWrapper>
        <NoContributions />
      </AlignPositionWrapper>
    );
  }

  return (
    <StyledPortalPage>
      <Root>
        <Layout>
          <ContributionsHeader defaultPage={page} revenueProgram={page?.revenue_program} />
          <Legend $detailVisible={!!selectedContribution}>
            <Subhead>Transactions</Subhead>
            <p>View billing history, update payment details, and resend receipts.</p>
            <Sort options={CONTRIBUTION_SORT_OPTIONS} onChange={setOrdering} id="contributions-sort" />
            {hasContactInfo && (
              <>
                <ContactInfoButton color="primaryDark" onClick={showContactInfoPopover}>
                  <QuestionMarkIcon />
                </ContactInfoButton>
                <ArrowPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={!!anchorEl} placement="top">
                  <TitleTypography>Need help?</TitleTypography>
                  <ContactTypography>Contact us:</ContactTypography>
                  <ContactInfoDetails>
                    {page?.revenue_program.contact_phone && (
                      <ContactRow>
                        <LocalPhoneOutlinedIcon />
                        <p>
                          Phone:{' '}
                          <Link href={`tel:${page?.revenue_program.contact_phone}`}>
                            {page?.revenue_program.contact_phone}
                          </Link>
                        </p>
                      </ContactRow>
                    )}
                    {page?.revenue_program.contact_email && (
                      <ContactRow>
                        <MailOutlinedIcon />
                        <p>
                          Email:{' '}
                          <Link href={`mailto:${page?.revenue_program.contact_email}`}>
                            {page?.revenue_program.contact_email}
                          </Link>
                        </p>
                      </ContactRow>
                    )}
                  </ContactInfoDetails>
                </ArrowPopover>
              </>
            )}
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
