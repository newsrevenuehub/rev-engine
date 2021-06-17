import { format } from 'date-fns';
function convertDatetimeForAPI(datetime) {
  // target python time string format is YYYY-MM-DDThh:mm[:ss[.uuuuuu]]
  return format(datetime, "y-MM-dd'T'kk:mm:ss.SSS");
}
export default convertDatetimeForAPI;
