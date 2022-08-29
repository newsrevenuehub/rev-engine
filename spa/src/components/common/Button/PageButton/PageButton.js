import PropTypes from 'prop-types';

import { Flex, Tag, Button, Icon, Background, Label } from './PageButton.styled';

import EditIcon from 'assets/icons/edit.svg';

const PageButton = ({ className, name, page_screenshot, published_date, onClick }) => (
  <Flex className={className}>
    {published_date && <Tag>LIVE</Tag>}
    <Button onClick={onClick} aria-label={name}>
      <Icon src={EditIcon} alt="edit page" />
    </Button>
    <Background
      data-testid="background-image"
      hasImage={!!page_screenshot}
      {...(page_screenshot && { style: { backgroundImage: `url(${page_screenshot})` } })}
    >
      {!page_screenshot && <p>No preview</p>}
    </Background>
    <Label>{name}</Label>
  </Flex>
);

PageButton.propTypes = {
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  page_screenshot: PropTypes.string,
  published_date: PropTypes.string,
  className: PropTypes.string
};

PageButton.defaultProps = {
  page_screenshot: null,
  published_date: null,
  className: ''
};

export default PageButton;
