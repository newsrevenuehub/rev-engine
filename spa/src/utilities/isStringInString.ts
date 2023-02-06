export function isStringInStringCaseInsensitive(
  base: string,
  search: string,
  regex = /[.,\/#!$%\^&\*;:@{}[\]=\-_`~()\s]/g
) {
  console.log({ regex });
  return base.toLowerCase().replace(regex, '').includes(search.toLowerCase().replace(regex, ''));
}
