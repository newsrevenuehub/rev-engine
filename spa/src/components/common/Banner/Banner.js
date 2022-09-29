import PropTypes from 'prop-types';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';

import { BANNER_TYPE } from 'constants/bannerConstants';
import useModal from 'hooks/useModal';

import { Flex, Button, Label } from './Banner.styled';

const Banner = ({ type, className }) => {
  const { open, handleClose } = useModal(true);

  const label = {
    [BANNER_TYPE.STRIPE]:
      'Looks like you need to set up a Stripe connection in order to start receiving contributions.',
    [BANNER_TYPE.PUBLISH]:
      'Looks like you need to publish a contribution page in order to start receiving contributions.'
  }[type];

  if (!open) return null;

  return (
    <>
      <Flex className={className} type={type} data-testid="banner">
        <InfoOutlinedIcon style={{ height: 20, width: 20 }} />
        <Label>{label}</Label>
        <Button onClick={handleClose} aria-label="Dismiss message" type={type}>
          Got it
        </Button>
      </Flex>
      <div style={{ marginTop: 60 }} />
    </>
  );
};

Banner.propTypes = {
  type: PropTypes.oneOf(Object.values(BANNER_TYPE)),
  className: PropTypes.string
};

Banner.defaultProps = {
  className: '',
  type: BANNER_TYPE.STRIPE
};

export default Banner;
