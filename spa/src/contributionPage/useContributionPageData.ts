// Hook that connects data preloaded by Django into React.

import { useEffect, useState } from 'react';

export interface ContributionPageElement {
  type: string; // TODO more specific
  uuid: string;
}

export interface ContributionPageData {
  currency: {
    code: string;
    symbol: string;
  };
  elements: ContributionPageElement[];
  graphic: string | null;
  header_bg_image: string | null;
  header_link: string | null;
  header_log: string | null;
  header_logo_alt_text: string;
  heading: string | null;
  id: number;
  locale: 'en' | 'es';
  name: string;
  payment_provider: {
    stripe_account_id: string;
  };
  revenue_program: {
    country: string;
    is_nonprofit: boolean;
    slug: string;
  };
  sidebar_elements: ContributionPageElement[];
  slug: string;
  thank_you_redirect: string;
}

async function fetchFromApi() {
  // Hack to enable local development. In real life, we'd want to raise an
  // error or fall back to doing a real retrieval.
  console.log('Falling back to API retrieval');
  return await (await fetch('/api/v1/pages/live-detail/?revenue_program=billypenn')).json();
}

export function useContributionPageData(): ContributionPageData | Record<string, never> {
  const [data, setData] = useState<ContributionPageData | Record<string, never>>({});

  useEffect(() => {
    async function run() {
      const el = document.querySelector('#contribution_page_data');

      if (!el) {
        setData(await fetchFromApi());
        return;
      }

      try {
        setData(JSON.parse(el.innerHTML) as ContributionPageData);
      } catch (error) {
        console.log("Couldn't parse page data", error);
        setData(await fetchFromApi());
      }
    }

    run();
  }, []);

  return data;
}
