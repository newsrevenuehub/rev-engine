import { useState, useEffect } from 'react';
import * as S from './ContributorDashboard.styled';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import axios, { AuthenticationError } from 'ajax/axios';
import { CONTRIBUTIONS } from 'ajax/endpoints';

// Children
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';

function ContributorDashboard() {
  const alert = useAlert();
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);

  useEffect(() => {
    async function fetchContributions() {
      try {
        const { data } = await axios.get(CONTRIBUTIONS);
        setContributions(data.results);
      } catch (e) {
        if (e instanceof AuthenticationError || e?.response?.status === 403) {
          setTokenExpired(true);
        } else {
          alert.error(GENERIC_ERROR);
        }
      }
    }
    fetchContributions();
  }, [alert]);

  return (
    <>
      <S.ContributorDashboard>
        {contriubtions.map((contribution) => (
          <p key={contribution.id}>{contribution.formatted_amount}</p>
        ))}
      </S.ContributorDashboard>
      {tokenExpired && <ContributorTokenExpiredModal isOpen={tokenExpired} />}
    </>
  );
}

export default ContributorDashboard;
