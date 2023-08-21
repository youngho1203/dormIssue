/**
 * 'yyyy-mm-dd' date String
 */
function _getNowDateISOFormattedString(){
  return _getISOTimeZoneCorrectedDateString(new Date());
}

/**
 * javascript toISOString timezone treatment
 */
function _getISOTimeZoneCorrectedDateString(date, dateTime) {
  // timezone offset 처리 
  let tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
  let correctedDate = new Date(date.getTime() - tzoffset);
  // 2011-10-05T14:48:00.000Z
  return dateTime ? correctedDate.toISOString().substring(0, 19).replace("T", ' ') : correctedDate.toISOString().substring(0, 10);
}
