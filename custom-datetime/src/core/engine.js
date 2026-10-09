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
import qiblaModule from './qibla.js'
import zodiacModule from './zodiac.js'

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
 * @param {'kuwaiti'|'ummalqura'|'astronomical'} [hijriMethod] - طريقة حساب التقويم الهجري (انظر hijri.js)
 * @param {'geocentric'|'topocentric'} [moonCoordFrame] - اصطلاح طول/عرض/استواء القمر المعروض
 *   (البروجي والاستوائي، وبالتبعية البرج/المنزلة المشتقان منه) - جيومركزي افتراضيا (الاصطلاح
 *   الفلكي/التقويمي المعتاد)، أو طوبوغرافي (كما يُرى فعلا من موقع المراقب، يطابق ما تعرضه
 *   برامج الرصد كـSky Safari). لا يمس هذا أبدا الإحداثيات الأفقية (أفقية بطبيعتها دائما)، ولا
 *   الشروق/العبور/الغروب، ولا الطور/العمر/المطال (طلب المستخدم: انظر الشرح في moon.js).
 */
export function computeAll (location = DEFAULT_LOCATION, nowUtc = new Date(), prayerSettings = {}, hijriMethod = 'kuwaiti', moonCoordFrame = 'geocentric') {
  const { latDeg, lonEastDeg, observerTime, gnomonCm = 60 } = location

  const jdUT = julian.DateToJD(nowUtc) // لليوم الجولياني بالتوقيت العالمي (للوقت النجمي والأفقي)
  const jde = julian.DateToJDE(nowUtc) // لليوم الجولياني الديناميكي TT (لحساب المواضع نفسها)

  const localParts = timeutilModule.localPartsFromUTC(nowUtc, observerTime)
  const utcOffsetHours = timeutilModule.currentUtcOffsetHours(nowUtc, observerTime)
  const hijri = hijriModule.hijriForMethod(hijriMethod, localParts.year, localParts.month, localParts.day, latDeg, lonEastDeg, observerTime)
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

  // البرج والمنزلة: تصنيفان مشتقان من الطول البروجي، لكن لـ"البرج الحقيقي/التحقيقي" الذي طلب
  // المستخدم اعتماده (لا "التقديري" التقويمي) يُستعمل الطول البروجي بعد طرح الأيانامسا منه -
  // أي الموضع الحقيقي نسبة للنجوم الثابتة، لا نسبة لنقطة الاعتدال المتحركة. انظر التعليق المفصَّل
  // على ayanamsaDeg في zodiac.js. يبقى sun.ecliptic.longitudeDeg أدناه (الطول البروجي المعروض)
  // هو القيمة التقويمية المعتادة بلا تصحيح - التصحيح يخص تصنيف البرج/المنزلة فقط لا الطول نفسه.
  // الاسمان بكلتا اللغتين يُحسبان هنا (كـmoonPhase.phaseNameArabic/French) لا في طبقة العرض،
  // فالاسم بيانات مشتقة من الفهرس المحسوب لا نص واجهة ثابت.
  const ayanamsaDeg = zodiacModule.ayanamsaDeg(nowUtc)
  const sunLonDeg = sunEcl.lon * R2D
  const sunSiderealLonDeg = formatModule.normalizeDeg360(sunLonDeg - ayanamsaDeg)
  const sunZodiac = zodiacModule.zodiacSignInfo(sunSiderealLonDeg)
  const sunManzil = zodiacModule.manzilInfo(sunSiderealLonDeg)

  const sun = {
    ecliptic: { longitudeDeg: sunLonDeg, distanceAU: sunEcl.range },
    equatorial: { rightAscensionDeg: sunEq.ra * R2D, declinationDeg: sunEq.dec * R2D, distanceAU: sunEq.range },
    horizontal: sunHz,
    riseTransitSet: sunRTS,
    gnomonCm,
    shadowAtZawalCm,
    shadowNowCm,
    shadowAzimuthNowDeg,
    dayLengthHours: sunRTS.dayLengthHours,
    nightLengthHours: sunRTS.nightLengthHours,
    zodiac: {
      index: sunZodiac.signIndex,
      degreeInSign: sunZodiac.degreeInSign,
      nameArabic: zodiacModule.zodiacSignName(sunZodiac.signIndex, 'ar'),
      nameFrench: zodiacModule.zodiacSignName(sunZodiac.signIndex, 'fr')
    },
    manzil: {
      index: sunManzil.manzilIndex,
      degreeInManzil: sunManzil.degreeInManzil,
      nameArabic: zodiacModule.manzilName(sunManzil.manzilIndex, 'ar'),
      nameFrench: zodiacModule.manzilName(sunManzil.manzilIndex, 'fr')
    }
  }

  // ---------------- القمر ----------------
  const moonData = moonModule.moonEclipticAndEquatorial(jde)
  // تصحيح متوازي السمت الموضعي (parallax، فصل ٤٠ ميوس) ضروري دائما للإحداثيات *الأفقية* (لا
  // خيار هنا - انظر التعليق المفصّل في moon.js). الإحداثيات البروجية/الاستوائية المعروضة
  // (moon.ecliptic/moon.equatorial، وبالتبعية moon.zodiac/moon.manzil) تتبع بدلا عن ذلك اختيار
  // moonCoordFrame أعلاه (جيومركزي افتراضيا، كالعادة الفلكية/التقويمية؛ أو طوبوغرافي كما تُرى
  // فعلا من موقع المراقب) - وتبقى الشروق/العبور/الغروب (moonRTS) والطور/العمر/المطال (moonPhase)
  // جيومركزية دائما بصرف النظر عن هذا الاختيار (لا معنى لتطويبها، ولمطابقة الشمس التي تُحسب
  // جيومركزية دوما أيضا - انظر نفس التعليق في moon.js).
  const moonTopoEq = moonModule.topocentricEquatorial(jdUT, moonData.eq, moonData.parallax, latDeg, lonEastDeg)
  const moonHz = moonModule.horizontalFromEquatorial(jdUT, moonTopoEq, latDeg, lonEastDeg)
  const moonRTS = moonModule.moonRiseTransitSet(localParts.year, localParts.month, localParts.day, observerTime, latDeg, lonEastDeg)
  const moonPhase = moonModule.moonPhaseInfo(jde, sunEq, moonData.eq, moonData.range)
  const nextNewMoonLocal = timeutilModule.localPartsFromUTC(moonPhase.nextNewMoonUTCDate, observerTime)

  const moonIsTopocentric = moonCoordFrame === 'topocentric'
  const moonEqUsed = moonIsTopocentric ? moonTopoEq : moonData.eq
  const moonEclUsed = moonIsTopocentric
    ? moonModule.topocentricEcliptic(moonTopoEq, moonData.trueObliquity)
    : moonData.ecl

  const moonLonDeg = moonEclUsed.lon * R2D
  const moonSiderealLonDeg = formatModule.normalizeDeg360(moonLonDeg - ayanamsaDeg)
  const moonZodiac = zodiacModule.zodiacSignInfo(moonSiderealLonDeg)
  const moonManzil = zodiacModule.manzilInfo(moonSiderealLonDeg)

  const moon = {
    coordFrame: moonCoordFrame,
    ecliptic: { longitudeDeg: moonLonDeg, latitudeDeg: moonEclUsed.lat * R2D, distanceKm: moonData.range },
    equatorial: { rightAscensionDeg: moonEqUsed.ra * R2D, declinationDeg: moonEqUsed.dec * R2D },
    horizontal: moonHz,
    riseTransitSet: moonRTS,
    elongationDeg: moonPhase.elongationDeg,
    ageDays: moonPhase.ageDays,
    illuminatedFraction: moonPhase.illuminatedFraction,
    phaseNameArabic: moonPhase.phaseNameArabic,
    phaseNameFrench: moonPhase.phaseNameFrench,
    distanceKm: moonData.range,
    nextNewMoon: { utcDate: moonPhase.nextNewMoonUTCDate, local: nextNewMoonLocal },
    zodiac: {
      index: moonZodiac.signIndex,
      degreeInSign: moonZodiac.degreeInSign,
      nameArabic: zodiacModule.zodiacSignName(moonZodiac.signIndex, 'ar'),
      nameFrench: zodiacModule.zodiacSignName(moonZodiac.signIndex, 'fr')
    },
    manzil: {
      index: moonManzil.manzilIndex,
      degreeInManzil: moonManzil.degreeInManzil,
      nameArabic: zodiacModule.manzilName(moonManzil.manzilIndex, 'ar'),
      nameFrench: zodiacModule.manzilName(moonManzil.manzilIndex, 'fr')
    }
  }

  // ---------------- الوقت النجمي ----------------
  const sidereal = siderealModule.computeSiderealTimes(nowUtc, lonEastDeg)

  // ---------------- مواقيت الصلاة ----------------
  const prayerTimes = prayerModule.computePrayerTimes(
    localParts.year, localParts.month, localParts.day, observerTime, latDeg, lonEastDeg, prayerSettings
  )

  // ---------------- القبلة ----------------
  // سمت القبلة: دالة في الموقع فقط (لا في الزمن)، فيُحسب مرة واحدة هنا؛ لحظتا محاذاة الشمس/الظل
  // لهذا السمت تُحسبان بين شروق الشمس وغروبها الفعليين (sunRTS أعلاه) - انظر qibla.js.
  const qiblaAzimuthDeg = qiblaModule.qiblaAzimuthDeg(latDeg, lonEastDeg)
  const qiblaAlignment = qiblaModule.qiblaAlignmentTimes(sunRTS.riseDate, sunRTS.setDate, latDeg, lonEastDeg, qiblaAzimuthDeg)
  const qibla = {
    azimuthDeg: qiblaAzimuthDeg,
    directionNameArabic: qiblaModule.qiblaDirectionNameArabic(qiblaAzimuthDeg),
    directionNameFrench: qiblaModule.qiblaDirectionNameFrench(qiblaAzimuthDeg),
    sunAltitudeAtFacingDeg: qiblaModule.sunAltitudeAtDate(qiblaAlignment.sunTowardQiblaDate, latDeg, lonEastDeg),
    sunTowardQiblaDate: qiblaAlignment.sunTowardQiblaDate,
    shadowTowardQiblaDate: qiblaAlignment.shadowTowardQiblaDate
  }

  return { time, sun, moon, sidereal, prayerTimes, qibla, location }
}

export default { computeAll, DEFAULT_LOCATION }
