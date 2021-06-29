import { useState, useEffect } from 'react';
import * as S from './ContributorDashboard.styled';

// AJAX
import axios from 'ajax/axios';
import { CONTRIBUTIONS } from 'ajax/endpoints';

// Children
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';

function ContributorDashboard() {
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);

  useEffect(() => {
    async function fetchContributions() {
      try {
        const { data } = await axios.get(CONTRIBUTIONS);
        setContributions(data.results);
      } catch (e) {
        if (e?.response?.status === 403) {
          setTokenExpired(true);
        }
      }
    }
    fetchContributions();
  }, []);

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
