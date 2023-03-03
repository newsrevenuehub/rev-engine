import PropTypes, { InferProps } from 'prop-types';
import useUser from 'hooks/useUser';
import useContributionPageList from 'hooks/useContributionPageList';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';

const PageUsagePropTypes = {
  className: PropTypes.string
};

export type PageUsageProps = InferProps<typeof PageUsagePropTypes>;

// One day, this should be handled by a localization library.

function formatPageCount(count: number) {
  if (count === 1) {
    return '1 page';
  }

  return `${count} pages`;
}

/**
 * Displays a count of how many pages the user's organization has, and the
 * relevant limit if any.
 */
export function PageUsage({ className }: PageUsageProps) {
  const { isLoading: pagesAreLoading, pages } = useContributionPageList();
  const { isLoading: userIsLoading, user } = useUser();
  const plan = user?.organizations[0]?.plan;

  if (pagesAreLoading || userIsLoading || !plan || !pages) {
    return null;
  }

  if (
    user?.role_type.includes(USER_ROLE_HUB_ADMIN_TYPE) ||
    user?.role_type.includes(USER_SUPERUSER_TYPE) ||
    plan?.name === 'PLUS'
  ) {
    return <span className={className!}>{formatPageCount(pages.length)}</span>;
  }

  return (
    <span className={className!}>
      {pages.length} of {formatPageCount(plan.page_limit)}
    </span>
  );
}

PageUsage.propTypes = PageUsagePropTypes;
export default PageUsage;
