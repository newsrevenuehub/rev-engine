import PropTypes from 'prop-types';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';

import { BANNER_TYPE } from 'constants/bannerConstants';
import useModal from 'hooks/useModal';

import { Flex, Button, Label } from './Banner.styled';

const Banner = ({ type, className, message }) => {
  const { open, handleClose } = useModal(true);

  if (!open) return null;

  return (
    <>
      <Flex className={className} type={type} data-testid="banner">
        <InfoOutlinedIcon style={{ height: 20, width: 20 }} />
        <Label>{message}</Label>
        <Button onClick={handleClose} type={type}>
          Got it
        </Button>
      </Flex>
      <div style={{ marginTop: 60 }} />
    </>
  );
};

Banner.propTypes = {
  type: PropTypes.oneOf(Object.values(BANNER_TYPE)),
  message: PropTypes.string.isRequired,
  className: PropTypes.string
};

Banner.defaultProps = {
  className: '',
  type: BANNER_TYPE.BLUE
};

export default Banner;
