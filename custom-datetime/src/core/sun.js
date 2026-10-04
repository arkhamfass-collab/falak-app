/**
 * src/core/sun.js
 * كل ما يخص الشمس: الإحداثيات البروجية (السماوية) والاستوائية والأفقية، الشروق والزوال
 * والغروب، ظل الزوال وظل الوقت الآني لعود طوله 60 سم، ومدتا الليل والنهار.
 * الدقة: نظرية VSOP87 الكاملة (عبر planetposition.Planet + بيانات الأرض) حسب خوارزميات ميوس.
 *
 * تنبيه مهم على اصطلاح خط الطول: مكتبة ميوس (astronomia) تقيس خط الطول الجغرافي موجبا نحو
 * الغرب. هذا الملف ونظيره moon.js يستقبلان خط الطول بالاصطلاح المعتاد (شرقا موجب، كما في GPS
 * والخرائط) ويعكسان العلامة داخليا فقط عند استدعاء مكتبة ميوس - فلا داعي لأي عكس خارج هذا الملف.
 */

import base from './astro/src/base.js'
import julian from './astro/src/julian.js'
import solar from './astro/src/solar.js'
import nutation from './astro/src/nutation.js'
import coordLib from './astro/src/coord.js'
import sidereal from './astro/src/sidereal.js'
import riseLib from './astro/src/rise.js'
import riseSetUtil from './riseSetUtil.js'
import deltatLib from './astro/src/deltat.js'
import { Planet } from './astro/src/planetposition.js'
import earthData from './astro/data/vsop87Bearth.js'
import { normalizeDeg360, normalizeDegSigned180 } from './format.js'
import { utcCivilDayAnchorJD } from './timeutil.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

const earth = new Planet(earthData)

/** الإحداثيات البروجية والاستوائية الظاهرية للشمس عند لحظة TT (jde) معيّنة */
export function sunEclipticAndEquatorial (jde) {
  const ecl = solar.apparentVSOP87(earth, jde) // {lon, lat, range} بالراديان و AU
  const eq = solar.apparentEquatorialVSOP87(earth, jde) // {ra, dec, range}
  return { ecl, eq }
}

/**
 * الإحداثيات الأفقية (الارتفاع والسمت) والساعة الزاوية للشمس عند لحظة UT معيّنة.
 * @param {number} jdUT - اليوم الجولياني بالتوقيت العالمي (لا الديناميكي)
 * @param {{ra:number, dec:number}} eq - الإحداثيات الاستوائية الظاهرية (راديان)
 * @param {number} latDeg - عرض المراقب (شمالا موجب)
 * @param {number} lonEastDeg - طول المراقب (شرقا موجب)
 */
export function horizontalFromEquatorial (jdUT, eq, latDeg, lonEastDeg) {
  const gstApparentSec = sidereal.apparent(jdUT) // بالثواني
  const lonWestRad = -lonEastDeg * D2R
  const g = { lat: latDeg * D2R, lon: lonWestRad }
  const equ = new coordLib.Equatorial(eq.ra, eq.dec)
  const hz = equ.toHorizontal(g, gstApparentSec)
  // الساعة الزاوية H = الوقت النجمي المحلي الظاهري - المطلع المستقيم
  const gstRad = gstApparentSec * Math.PI / (12 * 3600)
  let H = normalizeDegSigned180((gstRad - lonWestRad - eq.ra) * R2D)
  // تنبيه اصطلاحي مهم: مكتبة ميوس (coord.toHorizontal) تُرجع السمت مقيسا من الجنوب نحو الغرب
  // (اصطلاح ميوس الفلكي التقليدي في كتابه)، بينما المعتاد في كل التطبيقات العملية (ومنها تطبيقات
  // القبلة والمواقيت) ولدى عامة المستخدمين هو قياسه من الشمال باتجاه الشرق (اصطلاح البوصلة
  // nominal المعتاد: شمال=٠، شرق=٩٠، جنوب=١٨٠، غرب=٢٧٠) - وبهذا الاصطلاح يقع السمت قبل الزوال
  // عادة بين ٠ و١٨٠ تقريبا (الشرق) وبعده بين ١٨٠ و٣٦٠ (الغرب)، كما هو متوقَّع. نحوّل بإضافة ١٨٠°.
  const azimuthDegCompass = normalizeDeg360(hz.az * R2D + 180)
  return {
    altitudeDeg: hz.alt * R2D,
    azimuthDeg: azimuthDegCompass,
    hourAngleDeg: H
  }
}

/**
 * يُجهّز القيم المشتركة اللازمة لأي حساب "عبور الشمس لارتفاع معيّن" في يوم محلي معيّن:
 * مرساة اليوم العالمي jd0، فارق ΔT، الوقت النجمي Th0، موضع المراقب p، وإحداثيات الشمس
 * الاستوائية الظاهرية عند منتصف الليل العالمي لليوم السابق/الحالي/التالي (لأجل الاستيفاء الثلاثي).
 * @private
 */
function _dailySunSetup (localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg) {
  const jd0 = utcCivilDayAnchorJD(localYear, localMonth, localDay, observerTime)
  const cal = new julian.Calendar().fromJD(jd0)
  const jde0 = cal.toJDE()
  const deltaTsec = deltatLib.deltaT(cal.toYear())
  const eqPrev = solar.apparentEquatorialVSOP87(earth, jde0 - 1)
  const eqThis = solar.apparentEquatorialVSOP87(earth, jde0)
  const eqNext = solar.apparentEquatorialVSOP87(earth, jde0 + 1)
  const p = { lat: latDeg * D2R, lon: -lonEastDeg * D2R }
  const Th0 = sidereal.apparent0UT(jd0)
  return { jd0, jde0, deltaTsec, eqPrev, eqThis, eqNext, p, Th0 }
}

/**
 * يحسب شروق/زوال/غروب الشمس "اليوم" (حسب اليوم المحلي للمراقب) بدقة عالية باستعمال
 * الاستيفاء الثلاثي النقاط (طريقة ميوس، الفصل 15) بدل التقريب أحادي النقطة.
 * @returns {{riseDate:Date|null, transitDate:Date|null, setDate:Date|null, status:'ok'|'alwaysAbove'|'alwaysBelow', transitAltitudeDeg:number, dayLengthHours:number, nightLengthHours:number}}
 */
export function sunRiseTransitSet (localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg) {
  const { jd0, eqPrev, eqThis, eqNext, p, Th0, deltaTsec } =
    _dailySunSetup(localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg)
  const h0 = riseLib.stdh0.solar

  let out = { status: 'ok', riseDate: null, transitDate: null, setDate: null }
  try {
    const rs = riseSetUtil.safeTimes(p, deltaTsec, h0, Th0, [eqPrev.ra, eqThis.ra, eqNext.ra], [eqPrev.dec, eqThis.dec, eqNext.dec])
    out.riseDate = julian.JDToDate(jd0 + rs.rise / 86400)
    out.transitDate = julian.JDToDate(jd0 + rs.transit / 86400)
    out.setDate = julian.JDToDate(jd0 + rs.set / 86400)
  } catch (e) {
    out.status = (e && e.code === -1) ? 'alwaysAbove' : 'alwaysBelow'
  }

  // ارتفاع الشمس عند الزوال (منتصف اليوم) = 90° - |العرض - الميل| تماما (الساعة الزاوية=0 عند الزوال)
  const transitAltitudeDeg = 90 - Math.abs(latDeg - eqThis.dec * R2D)

  // مدتا النهار والليل: بطريقة الساعة الزاوية النصفية عند عبور الشمس (تقريب كلاسيكي معتمد،
  // يُفترض فيه تغير الميل طفيفا خلال اليوم)
  let dayLengthHours, nightLengthHours
  try {
    const H0rad = riseLib.hourAngle(latDeg * D2R, h0, eqThis.dec)
    dayLengthHours = 2 * H0rad * R2D / 15
    nightLengthHours = 24 - dayLengthHours
  } catch (e) {
    dayLengthHours = (e && e.code === -1) ? 24 : 0
    nightLengthHours = 24 - dayLengthHours
  }

  return { ...out, transitAltitudeDeg, dayLengthHours, nightLengthHours }
}

/**
 * يحسب لحظة عبور الشمس ارتفاعا معيّنا (بالدرجات، سالب = تحت الأفق) صباحا (rise) ومساءا (set)
 * في يوم محلي معيّن - يُستعمل لحساب الفجر والعشاء بطريقة الزاوية الفلكية.
 * @param {number} altitudeDeg - الارتفاع المستهدف بالدرجات (سالب تحت الأفق، كزاوية الفجر/العشاء)
 */
export function sunAngleCrossing (localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg, altitudeDeg) {
  const { jd0, eqPrev, eqThis, eqNext, p, Th0, deltaTsec } =
    _dailySunSetup(localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg)
  const h0 = altitudeDeg * D2R
  let out = { status: 'ok', riseDate: null, transitDate: null, setDate: null }
  try {
    const rs = riseSetUtil.safeTimes(p, deltaTsec, h0, Th0, [eqPrev.ra, eqThis.ra, eqNext.ra], [eqPrev.dec, eqThis.dec, eqNext.dec])
    out.riseDate = julian.JDToDate(jd0 + rs.rise / 86400)
    out.transitDate = julian.JDToDate(jd0 + rs.transit / 86400)
    out.setDate = julian.JDToDate(jd0 + rs.set / 86400)
  } catch (e) {
    out.status = (e && e.code === -1) ? 'alwaysAbove' : 'alwaysBelow'
  }
  return out
}

/**
 * طول ظل عمودي (بالسنتيمتر) لعود رأسي بطول gnomonCm عند ارتفاع شمسي altitudeDeg.
 * يُرجع null إذا كانت الشمس عند الأفق أو تحته (لا ظل محدد المعنى أو الشمس غائبة).
 */
export function shadowLengthCm (altitudeDeg, gnomonCm = 60) {
  if (altitudeDeg <= 0.0001) return null
  return gnomonCm / Math.tan(altitudeDeg * D2R)
}

/**
 * سمت الظل: نظير سمت الشمس تماما (فرق ١٨٠° ثابت دائما، قبل الزوال أو بعده سواء) - فالجمع
 * أو الطرح لـ١٨٠° يعطيان النتيجة نفسها بعد تضييق المدى لـ٠-٣٦٠°، فلا حاجة للتفريق بين قبل
 * الزوال وبعده كخطوتين منفصلتين. يُستدعى فقط حين يوجد ظل فعلا (انظر shadowLengthCm أعلاه)؛
 * القيمة عند الزوال نفسه ثابتة دوما (شمالا أو جنوبا تماما) فلا تُحسب لها هنا (انظر render.js).
 */
export function shadowAzimuthDeg (sunAzimuthDeg) {
  return normalizeDeg360(sunAzimuthDeg + 180)
}

export default {
  sunEclipticAndEquatorial,
  horizontalFromEquatorial,
  sunRiseTransitSet,
  sunAngleCrossing,
  shadowLengthCm,
  shadowAzimuthDeg,
  earth,
  nutationModule: nutation,
  baseModule: base
}
