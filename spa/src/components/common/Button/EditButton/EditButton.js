import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { BUTTON_TYPE, COLOR_LIST } from 'constants/buttonConstants';
import { Flex, Tag, Button, Icon, Background, Label, BookmarkIcon } from './EditButton.styled';
import EditIcon from 'assets/icons/edit.svg';

const EditButton = ({ type, className, name, page_screenshot, published_date, onClick, style }) => {
  const liveTag = useMemo(() => {
    if (type === BUTTON_TYPE.STYLE && style?.used_live) {
      return <BookmarkIcon data-testid={`style-${style?.id}-live`} />;
    }

    if (type === BUTTON_TYPE.PAGE && published_date) {
      return <Tag>LIVE</Tag>;
    }
    return null;
  }, [published_date, style?.id, style?.used_live, type]);

  const backgroundContent = useMemo(() => {
    if (type === BUTTON_TYPE.STYLE) {
      return COLOR_LIST.map((color) => (
        <div
          data-testid="custom-color"
          key={color}
          style={{ backgroundColor: style?.colors?.[color], flexGrow: 1, height: '100%' }}
        />
      ));
    }

    return !page_screenshot && <p>No preview</p>;
  }, [page_screenshot, style?.colors, type]);

  return (
    <Flex className={className}>
      {liveTag}
      <Button onClick={onClick} aria-label={name} type={type}>
        <Icon src={EditIcon} alt="edit page" />
      </Button>
      <Background
        type={type}
        data-testid="background-image"
        hasImage={!!page_screenshot}
        {...(page_screenshot && { style: { backgroundImage: `url(${page_screenshot})` } })}
      >
        {backgroundContent}
      </Background>
      <Label>{name}</Label>
    </Flex>
  );
};

EditButton.propTypes = {
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  type: PropTypes.oneOf(Object.values(BUTTON_TYPE)),
  style: PropTypes.shape({
    id: PropTypes.number,
    used_live: PropTypes.bool,
    colors: PropTypes.shape({
      cstm_mainBackground: PropTypes.string,
      cstm_formPanelBackground: PropTypes.string,
      cstm_mainHeader: PropTypes.string,
      cstm_CTAs: PropTypes.string
    })
  }),
  page_screenshot: PropTypes.string,
  published_date: PropTypes.string,
  className: PropTypes.string
};

EditButton.defaultProps = {
  type: BUTTON_TYPE.PAGE,
  page_screenshot: null,
  published_date: null,
  style: undefined,
  className: ''
};

export default EditButton;
