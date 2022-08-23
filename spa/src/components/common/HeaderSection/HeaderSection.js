import PropTypes from 'prop-types';
import clsx from 'clsx';

const HeaderSection = ({ title, subtitle, className }) => (
  <div className={className}>
    <h1 className={clsx('mb-6 text-zinc-800 font-semibold text-4xl')}>{title}</h1>
    {subtitle && (
      <p data-testid="subtitle" className="text-zinc-500">
        {subtitle}
      </p>
    )}
  </div>
);

HeaderSection.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  className: PropTypes.string
};

HeaderSection.defaultProps = {
  subtitle: undefined,
  className: ''
};

export default HeaderSection;
