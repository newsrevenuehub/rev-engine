import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
function formatDatetimeForAPI(datetime, withTime = true) {
  // target python time string format is YYYY-MM-DDThh:mm[:ss[.uuuuuu]]
  if (withTime) return format(datetime, "y-MM-dd'T'HH:mm:ss.SSSx");
  else return format(datetime, 'y-MM-dd');
}
export default formatDatetimeForAPI;

export function formatDatetimeRoundedDay(datetime, startOfDay = true) {
  let dt = datetime;
  if (startOfDay) dt = setTimeToMidnight(dt);
  else dt = setTimeToJustBeforeMidnight(dt);
  return format(dt, "y-MM-dd'T'HH:mm:ss.SSSx");
}

function setTimeToJustBeforeMidnight(datetime) {
  let dt = setHours(datetime, 23);
  dt = setMinutes(dt, 59);
  dt = setSeconds(dt, 59);
  dt = setMilliseconds(dt, 999);
  return dt;
}

function setTimeToMidnight(datetime) {
  let dt = setHours(datetime, 0);
  dt = setMinutes(dt, 0);
  dt = setSeconds(dt, 0);
  dt = setMilliseconds(dt, 0);
  return dt;
}
