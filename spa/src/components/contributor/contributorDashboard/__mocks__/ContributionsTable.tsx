import { useContributorDashboardContext } from '../ContributorDashboard';

// We need something to test the context, and can't insert children manually
// into ContributorDashboard, so we do it here.

export function ContributionsTable({ rpSlug }: { rpSlug: string }) {
  const { setTokenExpired } = useContributorDashboardContext();

  return (
    <>
      <div data-testid="mock-contributions-table" data-rp-slug={rpSlug} />
      <button onClick={() => setTokenExpired(true)}>setTokenExpired</button>
    </>
  );
}

export default ContributionsTable;
