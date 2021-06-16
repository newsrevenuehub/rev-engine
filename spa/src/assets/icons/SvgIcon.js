export const ICONS = {
  CHEVRON: 'chevron',
  SEARCH: 'magnifying-glass',
  CHECK_CIRCLE: 'check-circle',
  TIMES_CIRCLE: 'times-circle',
  CLOSE: 'close',
  CHECK_MARK: 'check-mark',
  LOGOUT: 'logout',
  ARROW_LEFT: 'arrow-left',
  STRIPE_POWERED: 'powered-by-stripe'
};

function SvgIcon({ icon, ...props }) {
  return (
    <svg {...props} data-testid={`svg-icon_${icon}`}>
      <use xlinkHref={`#${icon}`} />
    </svg>
  );
}
export default SvgIcon;
