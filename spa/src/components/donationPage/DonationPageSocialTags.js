import Helmet from 'react-helmet';
import hubDefaultSocialCard from 'assets/images/hub-og-card.png';

// Export for donation-page.spec.js#"Donation page social meta tags"
export const getDefaultOgTitle = (rpName) => `Join | ${rpName}`;
export const getDefaultOgDescription = (rpName) =>
  `${rpName} is supported by people like you. Support ${rpName} today.`;
export const getOgImgAlt = (rpName) => `${rpName} social media card`;
export const DEFAULT_OG_IMG_ALT = 'fund journalism social media card';
export const DEFAULT_OG_URL = 'https://fundjournalism.org';
export const OG_TYPE = 'website';
export const TWITTER_CARD_TYPE = 'summary_large_image';
export const DEFAULT_TWITTER_CREATOR = 'fundjournalism';
export const DEFAULT_TWITTER_SITE = 'fundjournalism';

export const getImgUrl = (imagePath) => {
  const base = `${window.location.protocol}//${window.location.hostname}`;
  const url = new URL(imagePath, base);
  return url.href;
};

function DonationPageSocialTags({ revenueProgram = {} }) {
  return (
    <Helmet>
      {/* OpenGraph meta tags (used by Twitter and Facebook) */}
      <meta name="og:url" content={revenueProgram.social_url || DEFAULT_OG_URL}></meta>
      <meta name="og:title" content={revenueProgram.social_title || getDefaultOgTitle(revenueProgram.name)}></meta>
      <meta
        name="og:description"
        content={revenueProgram.social_description || getDefaultOgDescription(revenueProgram.name)}
      ></meta>
      <meta name="og:type" content={OG_TYPE}></meta>
      <meta name="og:image" content={getImgUrl(revenueProgram.social_card || hubDefaultSocialCard)}></meta>
      <meta
        name="og:image:alt"
        content={revenueProgram.social_card ? getOgImgAlt(revenueProgram.name) : DEFAULT_OG_IMG_ALT}
      ></meta>

      {/* Twitter exclusive meta tags */}
      <meta name="twitter:card" content={TWITTER_CARD_TYPE}></meta>
      <meta name="twitter:site" content={`@${revenueProgram.twitter_handle || DEFAULT_TWITTER_SITE}`}></meta>
      <meta name="twitter:creator" content={`@${revenueProgram.twitter_handle || DEFAULT_TWITTER_CREATOR}`}></meta>
    </Helmet>
  );
}

export default DonationPageSocialTags;
