/**
 * src/core/siderealTimes.js
 * الوقت النجمي بأنواعه الثلاثة:
 *  - GST0: الوقت النجمي العالمي عند منتصف الليل (0 سا توقيت عالمي) بغرينتش.
 *  - GST : الوقت النجمي العالمي الظاهري الآني (الدائر مع الزمن) بغرينتش.
 *  - LST : الوقت النجمي المحلي للمراقب = GST + خط طوله شرقا (بالساعات).
 */

import siderealLib from './astro/src/sidereal.js'
import julian from './astro/src/julian.js'

/**
 * @param {Date} utcDate - اللحظة الزمنية (أي كائن Date، فهو دائما UTC داخليا)
 * @param {number} lonEastDeg - خط طول المراقب، شرقا موجب
 */
export function computeSiderealTimes (utcDate, lonEastDeg) {
  const jd = julian.DateToJD(utcDate)
  const gst0Seconds = siderealLib.mean0UT(jd)
  const gstSeconds = siderealLib.apparent(jd)

  const gst0Hours = gst0Seconds / 3600
  const gstHours = gstSeconds / 3600
  let lstHours = gstHours + lonEastDeg / 15
  lstHours = ((lstHours % 24) + 24) % 24

  return { gst0Hours, gstHours, lstHours, jd }
}

export default { computeSiderealTimes }
