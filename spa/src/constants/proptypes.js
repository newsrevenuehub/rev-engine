import PropTypes from 'prop-types';

export const PagePropTypes = {
  name: PropTypes.string,
  revenue_program: PropTypes.shape({
    slug: PropTypes.string
  }).isRequired,
  payment_provider: PropTypes.shape({
    stripe_verified: PropTypes.bool
  }).isRequired,
  slug: PropTypes.string,
  published_date: PropTypes.string
};

export const UserPropTypes = {
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string.isRequired
};
