function isInViewport(el) {
  const bounding = el.getBoundingClientRect();
  return (
    bounding.top >= 0 &&
    bounding.left >= 0 &&
    bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function scrollIfNotVisible(el) {
  if (!isInViewport(el)) {
    el.scrollIntoView({ block: 'center' });
  }
}

export default scrollIfNotVisible;
