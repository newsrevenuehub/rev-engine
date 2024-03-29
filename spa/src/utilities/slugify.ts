function slugify(string: string, separator = '-') {
  return string
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '')
    .replace(/\s+/g, separator);
}

export default slugify;
