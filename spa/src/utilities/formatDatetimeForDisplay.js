const formatDatetimeForDisplay = (isoString, time = false) => {
  if (!isoString) return null;
  const dateTime = new Date(isoString);
  let options;
  if (time) options = { hour: '2-digit', minute: '2-digit' };
  else options = { year: 'numeric', month: '2-digit', day: 'numeric' };

  // If we pass an empty array as the first argument, we get the browser's default
  return dateTime.toLocaleString([], options);
};

export default formatDatetimeForDisplay;
