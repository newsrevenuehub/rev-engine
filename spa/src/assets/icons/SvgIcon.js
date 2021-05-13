function SvgIcon({ icon, ...props }) {
  return (
    <svg {...props} data-testid={`svg-icon_${icon}`}>
      <use xlinkHref={`#${icon}`} />
    </svg>
  );
}
export default SvgIcon;
