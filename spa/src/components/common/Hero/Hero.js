import PropTypes from 'prop-types';

import HeaderSection from 'components/common/HeaderSection';
import Searchbar from 'components/common/TextField/Searchbar';

import useStyles, { Flex } from './Hero.styled';

const Hero = ({ title, subtitle, onChange, placeholder, className }) => {
  const classes = useStyles();

  return (
    <Flex className={className}>
      <HeaderSection title={title} subtitle={subtitle} />
      {onChange && <Searchbar placeholder={placeholder} className={classes.searchbar} onChange={onChange} />}
    </Flex>
  );
};

Hero.propTypes = {
  title: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  subtitle: PropTypes.string,
  className: PropTypes.string
};

Hero.defaultProps = {
  subtitle: undefined,
  onChange: undefined,
  placeholder: '',
  className: ''
};

export default Hero;
