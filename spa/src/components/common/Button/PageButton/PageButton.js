import PropTypes from 'prop-types';
import clsx from 'clsx';

import EditIcon from 'assets/icons/edit.svg';

const PageButton = ({ name, page_screenshot, published_date, onClick }) => (
  <div className={clsx('flex flex-col items-start relative')}>
    {published_date && (
      <p className="absolute px-2 py-1 z-10 leading-3 top-1.5 left-1.5 text-xs font-semibold bg-nature-green rounded-sm text-white">
        LIVE
      </p>
    )}
    <button
      onClick={onClick}
      className="h-[120px] w-[168px] bg-white/[0.3] absolute hover:bg-zinc-800/[0.5] group flex justify-center items-center rounded-md active:bg-light-blue/[0.5] peer"
    >
      <img src={EditIcon} alt="edit page" className="hidden group-hover:block" />
    </button>
    <div
      data-testid="background-image"
      {...(page_screenshot && { style: { backgroundImage: `url(${page_screenshot})` } })}
      className={clsx('bg-slate-200 rounded-md h-[120px] w-[168px] flex justify-center items-center', {
        'bg-no-repeat bg-cover bg-center': page_screenshot
      })}
    >
      {!page_screenshot && <p className="text-neutral-500">No preview</p>}
    </div>
    <label className="font-semibold mt-3 break-words max-w-[168px] peer-active:text-light-blue">{name}</label>
  </div>
);

PageButton.propTypes = {
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  page_screenshot: PropTypes.string,
  published_date: PropTypes.string
};

PageButton.defaultProps = {
  page_screenshot: null,
  published_date: null
};

export default PageButton;
