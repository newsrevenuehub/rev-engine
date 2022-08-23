import PropTypes from 'prop-types';
import clsx from 'clsx';

import AddIcon from 'assets/icons/add.svg';

export const NEW_BUTTON_TYPE = {
  PAGE: 'page',
  STYLE: 'style'
};

const NewButton = ({ type, onClick, className }) => {
  const buttonLabel = {
    [NEW_BUTTON_TYPE.PAGE]: 'New Page',
    [NEW_BUTTON_TYPE.STYLE]: 'New Style'
  }[type];

  const padding = {
    [NEW_BUTTON_TYPE.PAGE]: 'py-12',
    [NEW_BUTTON_TYPE.STYLE]: 'py-5'
  }[type];

  return (
    <div className={clsx('flex flex-col items-start', className)}>
      <button
        id="new-button"
        onClick={onClick}
        className={clsx('bg-dark-blue px-18 rounded-md peer hover:bg-dark-blue/[.9] active:bg-light-blue', padding)}
      >
        <img src={AddIcon} alt={`add ${type}`} />
      </button>
      <label htmlFor="new-button" className="font-semibold mt-3 peer-active:text-light-blue">
        {buttonLabel}
      </label>
    </div>
  );
};

NewButton.propTypes = {
  type: PropTypes.oneOf(Object.values(NEW_BUTTON_TYPE)),
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string
};

NewButton.defaultProps = {
  type: NEW_BUTTON_TYPE.PAGE,
  className: ''
};

export default NewButton;
