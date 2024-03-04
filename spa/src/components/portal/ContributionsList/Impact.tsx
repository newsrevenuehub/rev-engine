// Quick and dirty component to display impact value. In real life, we'd do the
// retrieval using a hook.

import axios from 'ajax/axios';
import { Contributor } from 'hooks/usePortalAuth';
import { useEffect, useState } from 'react';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

export function Impact({ contributor }: { contributor?: Contributor }) {
  const [impact, setImpact] = useState<number>();

  useEffect(() => {
    async function load() {
      const { data } = await axios(`/contributors/${contributor!.id}/impact/`);

      setImpact((data as any).net_amount_paid);
    }

    if (contributor) {
      load();
    }
  }, [contributor]);

  return <p>Contributed to Date: {impact ? formatCurrencyAmount(impact) : 'loading'}</p>;
}

export default Impact;
