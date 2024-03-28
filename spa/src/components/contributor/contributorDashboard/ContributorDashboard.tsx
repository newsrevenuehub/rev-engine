import { createContext, Dispatch, SetStateAction, useContext, useState } from 'react';
import { useConfigureAnalytics } from 'components/analytics';
import HeaderSection from 'components/common/HeaderSection';
import ContributorTokenExpiredModal from './ContributorTokenExpiredModal';
import ContributionsTable from './ContributionsTable';
import { Root } from './ContributorDashboard.styled';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';

const ContributorDashboardContext = createContext<{
  tokenExpired: boolean;
  setTokenExpired: Dispatch<SetStateAction<boolean>>;
}>({
  setTokenExpired: () => {
    throw new Error('This context must be used inside a <ContributorDashboard> element.');
  },
  tokenExpired: false
});

export const useContributorDashboardContext = () => useContext(ContributorDashboardContext);

function ContributorDashboard() {
  const [tokenExpired, setTokenExpired] = useState(false);
  const rpSlug = getRevenueProgramSlug();

  useConfigureAnalytics();

  return (
    <ContributorDashboardContext.Provider value={{ setTokenExpired, tokenExpired }}>
      <>
        <Root>
          <HeaderSection title="Your Contributions" subtitle="Changes made may not be reflected immediately." />
          <ContributionsTable rpSlug={rpSlug} />
        </Root>
        {tokenExpired && <ContributorTokenExpiredModal isOpen={tokenExpired} />}
      </>
    </ContributorDashboardContext.Provider>
  );
}

export default ContributorDashboard;
