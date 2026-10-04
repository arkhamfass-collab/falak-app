/**
 * src/core/moon.js
 * كل ما يخص القمر: الإحداثيات البروجية والاستوائية والأفقية، الشروق والزوال والأفول،
 * المطال (elongation)، العمر، البعد عن الأرض، الطور، وتاريخ/وقت الاقتران القادم.
 * الدقة: نظرية ميوس المختصرة (الفصل 47) وهي النظيرة لـVSOP87 الخاصة بحركة القمر
 * (علما أن VSOP87 نفسها نظرية كواكب ولا تغطي القمر، فاستُعملت نظرية ميوس القمرية المكافئة لها دقة).
 */

import base from './astro/src/base.js'
import julian from './astro/src/julian.js'
import moonposition from './astro/src/moonposition.js'
import moonphase from './astro/src/moonphase.js'
import nutation from './astro/src/nutation.js'
import coordLib from './astro/src/coord.js'
import sidereal from './astro/src/sidereal.js'
import { Earth76 } from './astro/src/globe.js'
import riseLib from './astro/src/rise.js'
import riseSetUtil from './riseSetUtil.js'
import deltatLib from './astro/src/deltat.js'
import solar from './astro/src/solar.js'
import moonillum from './astro/src/moonillum.js'
import { Planet } from './astro/src/planetposition.js'
import earthData from './astro/data/vsop87Bearth.js'
import { normalizeDeg360, normalizeDegSigned180 } from './format.js'
import { utcCivilDayAnchorJD } from './timeutil.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const earth = new Planet(earthData)

/** الإحداثيات البروجية (الظاهرية) والاستوائية (الظاهرية) للقمر عند لحظة TT (jde) معيّنة */
export function moonEclipticAndEquatorial (jde) {
  const geo = moonposition.position(jde) // {lon, lat, range} بلا تصحيح الرؤوس (nutation)
  const [dpsi, deps] = nutation.nutation(jde)
  const trueObliquity = nutation.meanObliquity(jde) + deps
  const lonApparent = geo.lon + dpsi
  const ecl = { lon: lonApparent, lat: geo.lat, range: geo.range }
  const eq = new coordLib.Ecliptic(lonApparent, geo.lat).toEquatorial(trueObliquity)
  const parallax = moonposition.parallax(geo.range)
  return { ecl, eq: { ra: eq.ra, dec: eq.dec }, range: geo.range, parallax }
}

/**
 * يحوّل الإحداثيات الاستوائية الظاهرية الجيومركزية للقمر (كما تُرى من مركز الأرض، وهي ما تُرجعه
 * moonEclipticAndEquatorial) إلى إحداثيات طوبوغرافية (كما يراها فعليا مراقب على سطح الأرض عند
 * latDeg/lonEastDeg) - تصحيح "متوازي السمت الموضعي" (parallax)، الفصل ٤٠ من كتاب ميوس "خوارزميات
 * فلكية". ضروري للقمر خاصة: قربه النسبي من الأرض (~٣٨٤ ألف كم) يجعل هذا الفرق يصل لنحو درجة
 * كاملة قرب الأفق، بخلاف الأجرام البعيدة (الشمس، حيث الفرق المقابل لا يتجاوز ثوانٍ قوسية
 * فيُهمَل تماما - لذلك لا يوجد نظير لهذه الدالة في sun.js أصلا).
 * هذا التصحيح خاص بحساب الإحداثيات *الأفقية* (الارتفاع/السمت/الساعة الزاوية "الآن") فقط - لا
 * يُطبَّق على الإحداثيات الاستوائية المعروضة للمستخدم في تبويب القمر (تبقى جيومركزية كما
 * يتعارف عليه فلكيا في كل التقاويم والمراجع)، ولا على حساب الشروق/العبور/الغروب (الذي يعالج
 * أثر متوازي السمت بطريقته الخاصة المناسبة له عبر riseLib.stdh0Lunar أدناه - الفصل ١٥).
 * ارتفاع المراقب عن سطح البحر يُفترض صفرا لعدم وجود حقل له في التطبيق (أثره ثانوي جدا مقارنة
 * بالتصحيح الأساسي هنا).
 * @param {number} jdUT - اليوم الجولياني بالتوقيت العالمي
 * @param {{ra:number, dec:number}} eq - الإحداثيات الاستوائية الظاهرية الجيومركزية (راديان)
 * @param {number} parallaxRad - متوازي السمت الأفقي المعادل π بالراديان (من moonEclipticAndEquatorial)
 * @param {number} latDeg - عرض المراقب (شمالا موجب)
 * @param {number} lonEastDeg - طول المراقب (شرقا موجب)
 * @returns {{ra:number, dec:number}} الإحداثيات الاستوائية الطوبوغرافية (راديان)
 */
export function topocentricEquatorial (jdUT, eq, parallaxRad, latDeg, lonEastDeg) {
  const gstApparentSec = sidereal.apparent(jdUT)
  const gstRad = gstApparentSec * Math.PI / (12 * 3600)
  const lonWestRad = -lonEastDeg * D2R
  const H = gstRad - lonWestRad - eq.ra // الساعة الزاوية الجيومركزية (راديان؛ لا حاجة لتضييق المدى لأغراض الجيب/الجتا أدناه)

  const [rhoSinPhiPrime, rhoCosPhiPrime] = Earth76.parallaxConstants(latDeg * D2R, 0)
  const sinPi = Math.sin(parallaxRad)
  const cosDec = Math.cos(eq.dec)
  const sinDec = Math.sin(eq.dec)

  // ميوس، المعادلات ٤٠.٢-٤٠.٤
  const deltaAlpha = Math.atan2(
    -rhoCosPhiPrime * sinPi * Math.sin(H),
    cosDec - rhoCosPhiPrime * sinPi * Math.cos(H)
  )
  const topoDec = Math.atan2(
    (sinDec - rhoSinPhiPrime * sinPi) * Math.cos(deltaAlpha),
    cosDec - rhoCosPhiPrime * sinPi * Math.cos(H)
  )
  return { ra: eq.ra + deltaAlpha, dec: topoDec }
}

export function horizontalFromEquatorial (jdUT, eq, latDeg, lonEastDeg) {
  const gstApparentSec = sidereal.apparent(jdUT)
  const lonWestRad = -lonEastDeg * D2R
  const g = { lat: latDeg * D2R, lon: lonWestRad }
  const equ = new coordLib.Equatorial(eq.ra, eq.dec)
  const hz = equ.toHorizontal(g, gstApparentSec)
  const gstRad = gstApparentSec * Math.PI / (12 * 3600)
  const H = normalizeDegSigned180((gstRad - lonWestRad - eq.ra) * R2D)
  // نفس تحويل الاصطلاح الموثَّق في sun.js (horizontalFromEquatorial): ميوس يقيس السمت من الجنوب
  // غربا، ونحوّله هنا إلى الاصطلاح المعتاد (من الشمال شرقا) بإضافة ١٨٠°.
  return { altitudeDeg: hz.alt * R2D, azimuthDeg: normalizeDeg360(hz.az * R2D + 180), hourAngleDeg: H }
}

/** شروق/زوال/أفول القمر "اليوم" بالاستيفاء الثلاثي (نفس طريقة ميوس المستعملة للشمس، الفصل 15) */
export function moonRiseTransitSet (localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg) {
  const jd0 = utcCivilDayAnchorJD(localYear, localMonth, localDay, observerTime)
  const cal = new julian.Calendar().fromJD(jd0)
  const jde0 = cal.toJDE()
  const deltaTsec = deltatLib.deltaT(cal.toYear())

  const mPrev = moonEclipticAndEquatorial(jde0 - 1)
  const mThis = moonEclipticAndEquatorial(jde0)
  const mNext = moonEclipticAndEquatorial(jde0 + 1)

  const p = { lat: latDeg * D2R, lon: -lonEastDeg * D2R }
  const h0 = riseLib.stdh0Lunar(mThis.parallax)
  const Th0 = sidereal.apparent0UT(jd0)

  let out = { status: 'ok', riseDate: null, transitDate: null, setDate: null }
  try {
    const rs = riseSetUtil.safeTimes(p, deltaTsec, h0, Th0,
      [mPrev.eq.ra, mThis.eq.ra, mNext.eq.ra], [mPrev.eq.dec, mThis.eq.dec, mNext.eq.dec])
    out.riseDate = julian.JDToDate(jd0 + rs.rise / 86400)
    out.transitDate = julian.JDToDate(jd0 + rs.transit / 86400)
    out.setDate = julian.JDToDate(jd0 + rs.set / 86400)
  } catch (e) {
    out.status = (e && e.code === -1) ? 'alwaysAbove' : 'alwaysBelow'
  }
  return out
}

/** الفصل الزاوي الظاهري بين جسمين (استواءي) - صيغة جيب التمام الكروية القياسية */
export function angularSeparationDeg (ra1, dec1, ra2, dec2) {
  const cosPsi = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2)
  return Math.acos(Math.min(1, Math.max(-1, cosPsi))) * R2D
}

/** أقرب اقتران (محاق/new moon) لسنة عشرية معيّنة */
function nearestNewMoonJDE (jde) {
  return moonphase.newMoon(base.JDEToJulianYear(jde))
}

/** أول اقتران يقع بعد jde (أو يساويه) */
export function nextNewMoonAfter (jde) {
  let y = base.JDEToJulianYear(jde)
  let candidate = nearestNewMoonJDE(jde)
  let guard = 0
  while (candidate <= jde && guard < 10) {
    y += moonphase.meanLunarMonth / 365.25
    candidate = moonphase.newMoon(y)
    guard++
  }
  return candidate
}

/** آخر اقتران وقع قبل jde (أو يساويه) */
export function previousNewMoonBeforeOrAt (jde) {
  let y = base.JDEToJulianYear(jde)
  let candidate = nearestNewMoonJDE(jde)
  let guard = 0
  while (candidate > jde && guard < 10) {
    y -= moonphase.meanLunarMonth / 365.25
    candidate = moonphase.newMoon(y)
    guard++
  }
  return candidate
}

const PHASE_NAMES_AR = {
  new: 'محاق',
  waxingCrescent: 'هلال متزايد',
  firstQuarter: 'تربيع أول',
  waxingGibbous: 'أحدب متزايد',
  full: 'بدر',
  waningGibbous: 'أحدب متناقص',
  lastQuarter: 'تربيع أخير',
  waningCrescent: 'هلال متناقص'
}

const PHASE_NAMES_FR = {
  new: 'nouvelle lune',
  waxingCrescent: 'premier croissant',
  firstQuarter: 'premier quartier',
  waxingGibbous: 'lune gibbeuse croissante',
  full: 'pleine lune',
  waningGibbous: 'lune gibbeuse décroissante',
  lastQuarter: 'dernier quartier',
  waningCrescent: 'dernier croissant'
}

/** يصنّف طور القمر إلى مفتاح موحَّد (مستقل عن اللغة) من نسبة الإضاءة k (0..1) وحالة التزايد (waxing) */
function moonPhaseKey (illuminatedFraction, isWaxing) {
  const k = illuminatedFraction
  if (k < 0.02) return 'new'
  if (k > 0.98) return 'full'
  if (k < 0.48) return isWaxing ? 'waxingCrescent' : 'waningCrescent'
  if (k <= 0.52) return isWaxing ? 'firstQuarter' : 'lastQuarter'
  return isWaxing ? 'waxingGibbous' : 'waningGibbous'
}

/**
 * يصنّف طور القمر من نسبة الإضاءة k (0..1) وحالة التزايد (waxing)
 */
export function moonPhaseNameArabic (illuminatedFraction, isWaxing) {
  return PHASE_NAMES_AR[moonPhaseKey(illuminatedFraction, isWaxing)]
}

/** نظير moonPhaseNameArabic بالفرنسية */
export function moonPhaseNameFrench (illuminatedFraction, isWaxing) {
  return PHASE_NAMES_FR[moonPhaseKey(illuminatedFraction, isWaxing)]
}

/** يختار الاسم بحسب اللغة (افتراضيا عربي) */
export function moonPhaseName (illuminatedFraction, isWaxing, lang = 'ar') {
  return lang === 'fr' ? moonPhaseNameFrench(illuminatedFraction, isWaxing) : moonPhaseNameArabic(illuminatedFraction, isWaxing)
}

/**
 * يجمع بيانات الطور والعمر والمطال والاقتران القادم عند لحظة jde معيّنة.
 * @param {{ra:number,dec:number,range:number}} sunEq - إحداثيات الشمس الاستوائية الظاهرية ومسافتها (AU) عند نفس jde
 * @param {{ra:number,dec:number}} moonEq - إحداثيات القمر الاستوائية الظاهرية عند نفس jde
 * @param {number} moonRangeKm
 */
export function moonPhaseInfo (jde, sunEq, moonEq, moonRangeKm) {
  const elongationDeg = angularSeparationDeg(moonEq.ra, moonEq.dec, sunEq.ra, sunEq.dec)
  // زاوية الطور عبر مثلث الأرض-القمر-الشمس (صيغة ميوس القياسية في moonillum.js، الفصل 48)
  // نحوّل مسافة الشمس من AU إلى كم لتكون بنفس وحدة مسافة القمر
  const sunRangeKm = sunEq.range * base.AU
  const phaseAngle = moonillum.phaseAngleEquatorial(
    { ra: moonEq.ra, dec: moonEq.dec, range: moonRangeKm },
    { ra: sunEq.ra, dec: sunEq.dec, range: sunRangeKm }
  )
  const k = base.illuminated(phaseAngle) // النسبة المضيئة 0..1

  const prevNM = previousNewMoonBeforeOrAt(jde)
  const nextNM = nextNewMoonAfter(jde)
  const ageDays = jde - prevNM
  const isWaxing = ageDays < (moonphase.meanLunarMonth / 2)

  return {
    elongationDeg,
    illuminatedFraction: k,
    ageDays,
    phaseNameArabic: moonPhaseNameArabic(k, isWaxing),
    phaseNameFrench: moonPhaseNameFrench(k, isWaxing),
    nextNewMoonJDE: nextNM,
    nextNewMoonUTCDate: julian.JDEToDate(nextNM)
  }
}

export default {
  moonEclipticAndEquatorial,
  topocentricEquatorial,
  horizontalFromEquatorial,
  moonRiseTransitSet,
  angularSeparationDeg,
  nextNewMoonAfter,
  previousNewMoonBeforeOrAt,
  moonPhaseNameArabic,
  moonPhaseNameFrench,
  moonPhaseName,
  moonPhaseInfo,
  earth,
  solarModule: solar
}
