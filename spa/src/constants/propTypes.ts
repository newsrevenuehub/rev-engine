import PropTypes, { InferProps } from 'prop-types';

export const PartialPagePropTypes = {
  name: PropTypes.string,
  revenue_program: PropTypes.shape({
    slug: PropTypes.string
  }),
  payment_provider: PropTypes.shape({
    stripe_verified: PropTypes.bool
  }),
  slug: PropTypes.string,
  published_date: PropTypes.string
};

export const PagePropTypes = {
  ...PartialPagePropTypes,
  revenue_program: PartialPagePropTypes.revenue_program.isRequired,
  payment_provider: PartialPagePropTypes.payment_provider.isRequired
};

export const UserPropTypes = {
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string.isRequired
};

export interface PageType extends InferProps<typeof PagePropTypes> {
  styles: {
    font: string;
  };
  revenue_program: {
    name: string;
    default_donation_page: unknown;
    organization: {
      plan: {
        name: string;
      };
    };
  };
}
