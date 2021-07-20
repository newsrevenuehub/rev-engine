const formatDatetimeForDisplay = (isoString) => {
  if (!isoString) return null;
  const dateTime = new Date(isoString);
  return dateTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default formatDatetimeForDisplay;
