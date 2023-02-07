export function isStringInStringCaseInsensitive(base: string, search: string) {
  const regex = /[.,\/#!$%\^&\*;:@{}[\]=\-_`~()\s]/g;
  return base.toLowerCase().replace(regex, '').includes(search.toLowerCase().replace(regex, ''));
}
