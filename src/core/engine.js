/**
 * src/core/engine.js
 * المنسِّق الأعلى لكل وحدات المحرك: التاريخ/الوقت (هجري وميلادي)، الشمس، القمر، الوقت
 * النجمي، ومواقيت الصلاة. استدعاء computeAll() واحد يُرجع كل ما تحتاجه الواجهة (وتحتاجه
 * لاحقا وحدة القراءة الصوتية) لعرض/نطق لحظة "الآن" كاملة عند موقع مراقب معيّن.
 *
 * ملاحظة تصميم: يُرجع هذا الملف قيما رقمية خاما (درجات عشرية، كم، ساعات...) لا نصوصا
 * مُنسَّقة جاهزة للعرض - التنسيق (DMS، HH:MM:SS، تحويل الأرقام لكلام عربي...) مسؤولية
 * طبقة العرض (الواجهة) أو القارئ الصوتي، كل حسب حاجته الخاصة من نفس البيانات الخام.
 */

import julian from './astro/src/julian.js'
import sunModule from './sun.js'
import moonModule from './moon.js'
import siderealModule from './siderealTimes.js'
import prayerModule from './prayerTimes.js'
import hijriModule from './hijri.js'
import timeutilModule from './timeutil.js'
import formatModule from './format.js'

const R2D = 180 / Math.PI

/** موقع افتراضي (مكة المكرمة تقريبا) - يُستبدَل بموقع المستخدم الفعلي (آليا أو يدويا) */
export const DEFAULT_LOCATION = {
  latDeg: 21.3891,
  lonEastDeg: 39.8579,
  observerTime: { mode: 'offset', utcOffsetHours: 3 },
  gnomonCm: 60
}

/**
 * يحسب كل بيانات لحظة "الآن" (أو لحظة UTC مُعطاة) عند موقع مراقب معيّن.
 * @param {{latDeg:number, lonEastDeg:number, observerTime:object, gnomonCm?:number}} [location]
 * @param {Date} [nowUtc] - اللحظة المطلوبة (افتراضيا الآن)
 * @param {object} [prayerSettings] - إعدادات مواقيت الصلاة (اختياري، انظر DEFAULT_PRAYER_SETTINGS في prayerTimes.js)
 */
export function computeAll (location = DEFAULT_LOCATION, nowUtc = new Date(), prayerSettings = {}) {
  const { latDeg, lonEastDeg, observerTime, gnomonCm = 60 } = location

  const jdUT = julian.DateToJD(nowUtc) // لليوم الجولياني بالتوقيت العالمي (للوقت النجمي والأفقي)
  const jde = julian.DateToJDE(nowUtc) // لليوم الجولياني الديناميكي TT (لحساب المواضع نفسها)

  const localParts = timeutilModule.localPartsFromUTC(nowUtc, observerTime)
  const utcOffsetHours = timeutilModule.currentUtcOffsetHours(nowUtc, observerTime)
  const hijri = hijriModule.hijriFromLocalGregorianDate(localParts.year, localParts.month, localParts.day)
  const weekdayIndex = new Date(Date.UTC(localParts.year, localParts.month - 1, localParts.day)).getUTCDay()

  const time = {
    utcDate: nowUtc,
    utcOffsetHours,
    local: {
      ...localParts,
      weekdayIndex,
      weekdayNameArabic: formatModule.weekdayNameArabic(weekdayIndex),
      weekdayNameFrench: formatModule.weekdayNameFrench(weekdayIndex)
    },
    gregorian: {
      year: localParts.year,
      month: localParts.month,
      day: localParts.day,
      monthNameArabic: formatModule.gregorianMonthNameArabic(localParts.month),
      monthNameFrench: formatModule.gregorianMonthNameFrench(localParts.month)
    },
    hijri: {
      ...hijri,
      monthNameArabic: formatModule.hijriMonthNameArabic(hijri.month),
      monthNameFrench: formatModule.hijriMonthNameFrench(hijri.month)
    }
  }

  // ---------------- الشمس ----------------
  const { ecl: sunEcl, eq: sunEq } = sunModule.sunEclipticAndEquatorial(jde)
  const sunHz = sunModule.horizontalFromEquatorial(jdUT, sunEq, latDeg, lonEastDeg)
  const sunRTS = sunModule.sunRiseTransitSet(localParts.year, localParts.month, localParts.day, observerTime, latDeg, lonEastDeg)
  const shadowAtZawalCm = sunRTS.status === 'ok' ? sunModule.shadowLengthCm(sunRTS.transitAltitudeDeg, gnomonCm) : null
  const shadowNowCm = sunModule.shadowLengthCm(sunHz.altitudeDeg, gnomonCm)
  // سمت الظل الآن (نظير سمت الشمس): معنى فقط حين يوجد ظل فعلا (الشمس فوق الأفق)
  const shadowAzimuthNowDeg = shadowNowCm != null ? sunModule.shadowAzimuthDeg(sunHz.azimuthDeg) : null

  const sun = {
    ecliptic: { longitudeDeg: sunEcl.lon * R2D, distanceAU: sunEcl.range },
    equatorial: { rightAscensionDeg: sunEq.ra * R2D, declinationDeg: sunEq.dec * R2D, distanceAU: sunEq.range },
    horizontal: sunHz,
    riseTransitSet: sunRTS,
    gnomonCm,
    shadowAtZawalCm,
    shadowNowCm,
    shadowAzimuthNowDeg,
    dayLengthHours: sunRTS.dayLengthHours,
    nightLengthHours: sunRTS.nightLengthHours
  }

  // ---------------- القمر ----------------
  const moonData = moonModule.moonEclipticAndEquatorial(jde)
  // تصحيح متوازي السمت الموضعي (parallax، فصل ٤٠ ميوس) خاص بالإحداثيات *الأفقية* فقط - انظر
  // التعليق المفصّل في moon.js (topocentricEquatorial). الإحداثيات الاستوائية المعروضة أدناه
  // (moon.equatorial) تبقى جيومركزية كما هي عمدا، وكذلك الشروق/العبور/الغروب (moonRTS) والطور.
  const moonTopoEq = moonModule.topocentricEquatorial(jdUT, moonData.eq, moonData.parallax, latDeg, lonEastDeg)
  const moonHz = moonModule.horizontalFromEquatorial(jdUT, moonTopoEq, latDeg, lonEastDeg)
  const moonRTS = moonModule.moonRiseTransitSet(localParts.year, localParts.month, localParts.day, observerTime, latDeg, lonEastDeg)
  const moonPhase = moonModule.moonPhaseInfo(jde, sunEq, moonData.eq, moonData.range)
  const nextNewMoonLocal = timeutilModule.localPartsFromUTC(moonPhase.nextNewMoonUTCDate, observerTime)

  const moon = {
    ecliptic: { longitudeDeg: moonData.ecl.lon * R2D, latitudeDeg: moonData.ecl.lat * R2D, distanceKm: moonData.range },
    equatorial: { rightAscensionDeg: moonData.eq.ra * R2D, declinationDeg: moonData.eq.dec * R2D },
    horizontal: moonHz,
    riseTransitSet: moonRTS,
    elongationDeg: moonPhase.elongationDeg,
    ageDays: moonPhase.ageDays,
    illuminatedFraction: moonPhase.illuminatedFraction,
    phaseNameArabic: moonPhase.phaseNameArabic,
    phaseNameFrench: moonPhase.phaseNameFrench,
    distanceKm: moonData.range,
    nextNewMoon: { utcDate: moonPhase.nextNewMoonUTCDate, local: nextNewMoonLocal }
  }

  // ---------------- الوقت النجمي ----------------
  const sidereal = siderealModule.computeSiderealTimes(nowUtc, lonEastDeg)

  // ---------------- مواقيت الصلاة ----------------
  const prayerTimes = prayerModule.computePrayerTimes(
    localParts.year, localParts.month, localParts.day, observerTime, latDeg, lonEastDeg, prayerSettings
  )

  return { time, sun, moon, sidereal, prayerTimes, location }
}

export default { computeAll, DEFAULT_LOCATION }
