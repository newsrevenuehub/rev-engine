import { Style } from '../useStyleList';

// Types here come from looking at Django models, in particular whether a field
// can be null. Even if a field is not nullable, it may be an empty string.

export type PageElementType =
  | 'DAmount'
  | 'DBenefits'
  | 'DDonorAddress'
  | 'DDonorInfo'
  | 'DFrequency'
  | 'DImage'
  | 'DPayment'
  | 'DReason'
  | 'DRichText'
  | 'DSwag';

/**
 * A plan a revenue program belongs to which determines which capabilities they
 * have access to.
 */
export interface EnginePlan {
  /**
   * Can pages have a custom thank you page?
   */
  custom_thank_you_page_enabled: boolean;
  /**
   * User-visible name for the plan.
   */
  label: string;
  /**
   * Internal name of the plan.
   */
  name: string;
  /**
   * What element types are allowed in a page's main content?
   */
  page_elements: PageElementType[];
  /**
   * How many pages can a revenue program have?
   */
  page_limit: number;
  /**
   * What element types are allowed in a page's sidebar?
   */
  sidebar_elements: PageElementType[];
  /**
   * How many styles can a revenue program have?
   */
  style_limit: number;
}

/**
 * A benefit contributors can receive based on how much they contribute.
 */
export interface ContributionBenefitLevel {
  /**
   * Currency used for lower_limit and upper_limit.
   */
  currency: string;
  /**
   * Level of the benefit. e.g. a level 2 benefit is "more" than a level 1
   * benefit.
   */
  level: number;
  /**
   * Lower monetary limit that a contribution must meet in order to be eligible
   * for the benefit.
   */
  lower_limit: number;
  /**
   * User-visible name for the benefit level.
   */
  name: string;
  /**
   * Lower monetary limit that a contribution must meet in order to be eligible
   * for the benefit.
   */
  upper_limit: number;
}

/**
 * A user-editable element that appears on a page, either in the main content
 * area or sidebar.
 */
export interface ContributionPageElement {
  content: unknown;
  /**
   * Names of required fields.
   */
  requiredFields: string[];
  type: PageElementType;
  /**
   * Internal ID of the element.
   */
  uuid: string;
}

/**
 * A configured payment provider for a revenue program.
 */
export interface PaymentProvider {
  /**
   * Timestamp when the payment provider was created.
   */
  created: string;
  /**
   * Currency used by the payment provider, e.g. `USD`.
   */
  currency: string;
  default_payment_provider: string;
  /**
   * Internal ID of the payment provider.
   */
  id: number;
  /**
   * Account ID of the Stripe account.
   */
  stripe_account_id: string | null;

  // Unsure of what these two attributes are for.
  stripe_oauth_refresh_token: string;
  stripe_product_id: string | null;

  /**
   * Has the parentrevenue program verified itself with Stripe?
   */
  stripe_verified: boolean;
}

/**
 * A revenue program. Organizations can have multiple revenue programs
 * associated with them.
 */
export interface RevenueProgram {
  /**
   * Point of contact for the revenue program.
   */
  contact_email: string;
  /**
   * ID used for Facebook analytics.
   */
  facebook_pixel_id: string | null;
  /**
   * Domain used for Google Analytics.
   */
  google_analytics_v3_domain: string | null;
  /**
   * ID used for Google Analytics.
   */
  google_analytics_v3_id: string | null;
  /**
   * ID used for Google Analytics.
   */
  google_analytics_v4_id: string | null;
  /**
   * Internal ID of the revenue program.
   */
  id: number;
  /**
   * User-visible name of the revenue program.
   */
  name: string;
  /**
   * Slug for the revenue program used in URLs.
   */
  slug: string;
  /**
   * Twitter handle of the revenue program, minus leading @.
   */
  twitter_handle: string;
  /**
   * URL for the revenue program's web site.
   */
  website_url: string;
}

/**
 * A page where visitors can make contributions to a revenue program.
 */
export interface ContributionPage {
  // --------------------------------------------------------------------------
  // Basic attributes
  // --------------------------------------------------------------------------

  /**
   * Timestamp when the page was created.
   */
  created: string;
  /**
   * Internal ID of the page.
   */
  id: string;
  /**
   * Timestamp when the page was last changed.
   */
  modified: string;
  /**
   * Name of the page. This is different than the slug.
   */
  name: string;
  /**
   * URL to a preview image of the page.
   */
  page_screenshot: string | null;
  /**
   * Timestamp when the page was published.
   */
  published_date: string | null;
  /**
   * Plan the page belongs to.
   */
  plan: EnginePlan;
  /**
   * Slug of the page that's used in URLs.
   */
  slug: string;
  /**
   * ID of the template used to create the page initially.
   */
  template_pk: string | null;

  // --------------------------------------------------------------------------
  // Config
  // --------------------------------------------------------------------------

  /**
   * Can this page show an offer for a New York Times comp subscription?
   */
  allow_offer_nyt_comp: boolean;
  /**
   * Benefit levels for this page, used by the DBenefits element.
   */
  benefit_levels: ContributionBenefitLevel[];
  /**
   * URL for a "back to the news" link on our generic thank you page.
   */
  post_thank_you_redirect: string;
  /**
   * Redirect to this URL after contributing instead of our generic one.
   */
  thank_you_redirect: string;

  // --------------------------------------------------------------------------
  // Payment provider config
  // --------------------------------------------------------------------------

  /**
   * Currency that the page uses for contribution amounts. Undefined if a
   * payment provider hasn't been set up yet.
   */
  currency?: {
    code: string;
    symbol: string;
  };
  /**
   * Payment provider configured for this page.
   */
  payment_provider: PaymentProvider;
  /**
   * Account ID of the Stripe account associated with the page.
   */
  stripe_account_id: string;

  // --------------------------------------------------------------------------
  // Appearance config
  // --------------------------------------------------------------------------

  /**
   * If a string, URL to an image to display beneath the header. If a file, it's
   * an image the user set in the app.
   */
  graphic: string | File | null;
  /**
   * URL to the thumbnail of the image that displays beneath the header.
   */
  graphic_thumbnail: string | null;
  /**
   * If a string, URL to a background image to use for the page header. If it's
   * a file, it's an image the user set in the app.
   */
  header_bg_image: string | File | null;
  /**
   * URL for a thumbnail of the header image.
   */
  header_bg_image_thumbnail: string | null;
  /**
   * URL to link from the header.
   */
  header_link: string;
  /**
   * If a string, URL to the logo to use for the page header. If it's a file,
   * it's an image the user set in the app.
   */
  header_logo: string | File | null;
  /**
   * URL for a thumbnail of the header logo.
   */
  header_logo_thumbnail: string;
  /**
   * Text to display on the page header.
   */
  heading: string;
  /**
   * Style to use for the page.
   */
  styles: Style | null;

  // --------------------------------------------------------------------------
  // Parent revenue program
  // --------------------------------------------------------------------------

  /**
   * Revenue program this page belongs to.
   */
  revenue_program: RevenueProgram;
  /**
   * FIPS code of the country that the revenue program belongs to.
   */
  revenue_program_country: string;
  /**
   * Is the revenue program nonprofit?
   */
  revenue_program_is_nonprofit: boolean;

  // --------------------------------------------------------------------------
  // Content
  // --------------------------------------------------------------------------

  /**
   * Elements in the main content of the page.
   */
  elements: ContributionPageElement[] | null;
  /**
   * Elements in the sidebar of the page.
   */
  sidebar_elements: ContributionPageElement[];
}
