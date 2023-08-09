import PropTypes, { InferProps } from 'prop-types';

import HeaderSection from 'components/common/HeaderSection';
import Searchbar from 'components/common/TextField/Searchbar';

import useStyles, { Flex, RightAction } from './Hero.styled';
import ExportButton from 'components/common/Button/ExportButton';

export type HeroProps = InferProps<typeof HeroPropTypes>;

const Hero = ({ title, subtitle, onChange, placeholder, className, exportData }: HeroProps) => {
  const classes = useStyles();
  const showExport = !!exportData?.email;

  return (
    <Flex className={className!}>
      <HeaderSection title={title} subtitle={subtitle} />
      {(showExport || onChange) && (
        <RightAction data-testid="right-action">
          {showExport && <ExportButton transactions={exportData.transactions!} email={exportData.email!} />}
          {onChange && <Searchbar placeholder={placeholder ?? ''} className={classes.searchbar} onChange={onChange} />}
        </RightAction>
      )}
    </Flex>
  );
};

const HeroPropTypes = {
  title: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  subtitle: PropTypes.string,
  className: PropTypes.string,
  exportData: PropTypes.shape({
    transactions: PropTypes.number,
    email: PropTypes.string.isRequired
  })
};

Hero.propTypes = HeroPropTypes;

Hero.defaultProps = {
  placeholder: '',
  className: ''
};

export default Hero;
