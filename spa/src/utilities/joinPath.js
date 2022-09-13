// joins multiple paths with the given seperator and removes multiple consecutive separators
function joinPath(parts) {
  const sep = '/';
  var replace = new RegExp(sep + '{1,}', 'g');
  return parts.join(sep).replace(replace, sep);
}

export default joinPath;
