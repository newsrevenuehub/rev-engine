export const ICONS = {
  CHEVRON: 'chevron',
  SEARCH: 'magnifying-glass',
  CHECK_CIRCLE: 'check-circle',
  TIMES_CIRCLE: 'times-circle',
  LOGOUT: 'logout',
  ARROW_LEFT: 'arrow-left'
};

function SvgIcon({ icon, ...props }) {
  return (
    <svg {...props} data-testid={`svg-icon_${icon}`}>
      <use xlinkHref={`#${icon}`} />
    </svg>
  );
}
export default SvgIcon;
