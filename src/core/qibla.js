/**
 * src/core/qibla.js
 * اتجاه القبلة: زاوية سمتها من موقع المراقب (بالصيغة الكروية الدقيقة، لا بتقريب خط مستقيم على
 * خريطة مسطَّحة)، ولحظة/لحظتا محاذاة الشمس أو ظلها لهذا السمت خلال اليوم (إن وُجدت).
 *
 * إحداثيات الكعبة المشرَّفة: 21.4225° شمالا، 39.82617° شرقا (كما في ويكيبيديا:
 * https://ar.wikipedia.org/wiki/الكعبة ، وبالدرجات/الدقائق/الثواني: 21°25′21″ش 39°49′34″ق).
 */

import julian from './astro/src/julian.js'
import sunModule from './sun.js'
import { normalizeDeg360, normalizeDegSigned180 } from './format.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export const KAABA_LAT_DEG = 21.4225
export const KAABA_LON_EAST_DEG = 39.82617

/**
 * زاوية سمت القبلة (من الشمال شرقا، ٠-٣٦٠°) من موقع عرضه latDeg وطوله lonEastDeg، بالصيغة
 * الكروية القياسية (bearing/forward azimuth على دائرة عظمى) - وهي الصيغة الصحيحة فلكيا (لا
 * صيغة الخط المستقيم على خريطة مسطَّحة، التي تُعطي زاوية خاطئة كلما بعدت المسافة).
 * الصيغة (مثلا "Aviation Formulary"، إد وليامز): θ = atan2(sinΔλ، cosφ1·tanφ2 − sinφ1·cosΔλ)
 * حيث φ1 عرض المراقب، φ2 عرض الكعبة، Δλ = (طول الكعبة شرقا − طول المراقب شرقا).
 * @param {number} latDeg - عرض المراقب (شمالا موجب)
 * @param {number} lonEastDeg - طول المراقب (شرقا موجب)
 * @returns {number} سمت القبلة بالدرجات (٠-٣٦٠، من الشمال شرقا - نفس اصطلاح سمت الشمس في التطبيق)
 */
export function qiblaAzimuthDeg (latDeg, lonEastDeg) {
  const phi1 = latDeg * D2R
  const phi2 = KAABA_LAT_DEG * D2R
  const deltaLambda = (KAABA_LON_EAST_DEG - lonEastDeg) * D2R
  const theta = Math.atan2(
    Math.sin(deltaLambda),
    Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda)
  )
  return normalizeDeg360(theta * R2D)
}

/** سمت الشمس عند لحظة UTC معيّنة - أداة داخلية لباحث لحظة المحاذاة أدناه فقط */
function sunAzimuthAtUTC (utcDate, latDeg, lonEastDeg) {
  const jdUT = julian.DateToJD(utcDate)
  const jde = julian.DateToJDE(utcDate)
  const { eq } = sunModule.sunEclipticAndEquatorial(jde)
  return sunModule.horizontalFromEquatorial(jdUT, eq, latDeg, lonEastDeg).azimuthDeg
}

/**
 * يبحث عن أول لحظة بين startDate وendDate يُساوي فيها fn(t) القيمة targetDeg (كزاوية)، بأخذ
 * عيّنات منتظمة ثم تضييق المجال بالتنصيف (bisection) حول أول عبور حقيقي للصفر يُعثر عليه.
 * يُرجع null إن لم يحدث تقاطع أصلا بين الطرفين (وارد فعلا بحسب خط العرض والفصل - زاوية السمت
 * المستهدفة قد لا تقع أصلا بين سمت الشروق وسمت الغروب ذلك اليوم).
 *
 * تنبيه فني مهم: الفرق (fn(t) - targetDeg) يُضيَّق للمجال (-180,180] عبر normalizeDegSigned180
 * لأجل تمييز "فوق/تحت الهدف"، لكن هذا التضييق نفسه يُنتج "قفزة" ظاهرية من +١٨٠° إلى -١٨٠°
 * (أو العكس) عند أي لحظة يكون فيها fn(t) مساويا للنظير المضاد لـtargetDeg (أي targetDeg+١٨٠°)
 * - وهذه قفزة اصطناعية سببها التضييق نفسه، لا عبورا حقيقيا للصفر. لتمييز العبور الحقيقي عن
 * هذه القفزة الاصطناعية: العبور الحقيقي بين عيّنتين متتاليتين قريبتين زمنيا يُغيّر الفرق بمقدار
 * صغير (إذ fn شبه رتيبة بين العيّنات)، بينما القفزة الاصطناعية تُغيّره بمقدار كبير جدا (قرب
 * ٣٦٠°) - فنتحقق أن |prevDiff-diff| صغيرة (أقل من ١٨٠°) قبل اعتباره عبورا حقيقيا، في كل من
 * حلقة أخذ العيّنات وحلقة التنصيف كلتيهما.
 * ملاحظة أخرى: يفترض أن fn شبه رتيبة (تتزايد أو تتناقص باستمرار) بين الطرفين - صحيح عمليا لسمت
 * الشمس خلال النهار في كل خطوط العرض المسكونة (خارج الدائرتين القطبيتين)، فلا داعٍ لمعالجة
 * أكثر من عبور حقيقي واحد محتمل هنا.
 */
function findCrossing (startDate, endDate, fn, targetDeg, samples = 360) {
  const t0 = startDate.getTime()
  const totalMs = endDate.getTime() - t0
  if (!(totalMs > 0)) return null

  const isRealCrossing = (dLo, dHi) =>
    ((dLo < 0 && dHi > 0) || (dLo > 0 && dHi < 0)) && Math.abs(dLo - dHi) < 180

  let prevT = t0
  let prevDiff = normalizeDegSigned180(fn(new Date(prevT)) - targetDeg)
  if (prevDiff === 0) return new Date(prevT)

  for (let i = 1; i <= samples; i++) {
    const t = t0 + (totalMs * i) / samples
    const diff = normalizeDegSigned180(fn(new Date(t)) - targetDeg)
    if (diff === 0) return new Date(t)
    if (isRealCrossing(prevDiff, diff)) {
      let lo = prevT; let hi = t; let diffLo = prevDiff
      for (let iter = 0; iter < 40; iter++) {
        const mid = (lo + hi) / 2
        const diffMid = normalizeDegSigned180(fn(new Date(mid)) - targetDeg)
        if (isRealCrossing(diffLo, diffMid)) { hi = mid } else { lo = mid; diffLo = diffMid }
      }
      return new Date((lo + hi) / 2)
    }
    prevT = t; prevDiff = diff
  }
  return null // لا تقاطع لهذا السمت المستهدَف خلال هذا المجال اليوم
}

/**
 * لحظتا محاذاة الشمس أو ظلها لسمت القبلة خلال اليوم (إن حدثت إحداهما أو كلتاهما):
 *  - sunTowardQiblaDate: اللحظة التي يكون فيها سمت الشمس نفسه مساويا لسمت القبلة (الشمس أمامكم
 *    تماما حين تستقبلون القبلة).
 *  - shadowTowardQiblaDate: اللحظة التي يكون فيها سمت الظل (= سمت الشمس + ١٨٠°) مساويا لسمت
 *    القبلة (ظل أي عمود عمودي يشير تماما نحو القبلة - وهي طريقة "رصد القبلة بالظل" المعروفة).
 * تُحسب فقط بين شروق الشمس وغروبها (خارج ذلك لا ظل ولا معنى عملي للمحاذاة)؛ تُرجع null لكل
 * لحظة لم تحدث ذلك اليوم عند هذا الموقع (وارد فعلا - انظر findCrossing أعلاه).
 * @param {Date|null} sunriseDate
 * @param {Date|null} sunsetDate
 * @param {number} latDeg
 * @param {number} lonEastDeg
 * @param {number} qiblaAzDeg
 */
export function qiblaAlignmentTimes (sunriseDate, sunsetDate, latDeg, lonEastDeg, qiblaAzDeg) {
  if (!sunriseDate || !sunsetDate) return { sunTowardQiblaDate: null, shadowTowardQiblaDate: null }
  const fn = (t) => sunAzimuthAtUTC(t, latDeg, lonEastDeg)
  const shadowTargetDeg = normalizeDeg360(qiblaAzDeg + 180)
  return {
    sunTowardQiblaDate: findCrossing(sunriseDate, sunsetDate, fn, qiblaAzDeg),
    shadowTowardQiblaDate: findCrossing(sunriseDate, sunsetDate, fn, shadowTargetDeg)
  }
}

export default { KAABA_LAT_DEG, KAABA_LON_EAST_DEG, qiblaAzimuthDeg, qiblaAlignmentTimes }
