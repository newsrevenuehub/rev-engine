import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
function formatDatetimeForAPI(datetime, withTime = true) {
  // target python time string format is YYYY-MM-DDThh:mm[:ss[.uuuuuu]]
  const date = withTime ? datetime : setTimeToJustBeforeMidnight(datetime);
  return format(date, "y-MM-dd'T'kk:mm:ss.SSSx");
}
export default formatDatetimeForAPI;

function setTimeToJustBeforeMidnight(datetime) {
  let dt = setHours(datetime, 23);
  dt = setMinutes(datetime, 59);
  dt = setSeconds(datetime, 59);
  dt = setMilliseconds(datetime, 999);
  return dt;
}
