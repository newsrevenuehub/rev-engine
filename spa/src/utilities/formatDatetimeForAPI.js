import { format } from 'date-fns';
function formatDatetimeForAPI(datetime, withTime = true) {
  // target python time string format is YYYY-MM-DDThh:mm[:ss[.uuuuuu]]
  if (withTime) return format(datetime, "y-MM-dd'T'kk:mm:ss.SSS");
  return format(datetime, 'y-MM-dd');
}
export default formatDatetimeForAPI;
