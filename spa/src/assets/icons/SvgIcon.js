function SvgIcon({ icon, ...props }) {
  return (
    <svg {...props}>
      <use xlinkHref={`#${icon}`} />
    </svg>
  );
}
export default SvgIcon;
