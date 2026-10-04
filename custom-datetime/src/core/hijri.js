/**
 * src/core/hijri.js
 * التقويم الهجري الحسابي الجدولي (المعروف بـ"الحساب الكويتي" / tabular Islamic civil calendar):
 * دورة ثلاثون سنة هجرية، منها 11 سنة كبيسة (355 يوما) والباقي بسيطة (354 يوما)،
 * والأشهر الفردية 30 يوما والزوجية 29 يوما، إلا الشهر 12 في السنة الكبيسة فـ30 يوما.
 *
 * نقطة البداية (الدورة الميلادية=1 محرم 1هـ) تقع عند رقم اليوم الجولياني المدني (civil JDN) = 1948440
 * (جمعة 16 يوليو 622م يوليانية) - وهو الأساس المتفَق عليه لهذا التقويم الحسابي تحديدا (بخلاف تقويم
 * أم القرى الذي يعتمد جداول رسمية مختلفة، وقد يتقدم أو يتأخر عن هذا الحساب بيوم تقريبا).
 *
 * تم التحقق من هذا الأساس تجريبيا مقابل تقويم أم القرى عند عدة تواريخ معروفة (انظر tests/).
 */

import julian from './astro/src/julian.js'

export const HIJRI_EPOCH_CIVIL_JDN = 1948440

export function isHijriLeapYear (y) {
  return ((11 * y + 14) % 30) < 11
}

export function hijriMonthLength (y, m) {
  if (m === 12 && isHijriLeapYear(y)) return 30
  return (m % 2 === 1) ? 30 : 29
}

export function hijriYearLength (y) {
  return isHijriLeapYear(y) ? 355 : 354
}

/** يحوّل تاريخا هجريا (سنة، شهر 1-12، يوم) إلى رقم يوم جولياني مدني (عدد صحيح) */
export function hijriToCivilJDN (y, m, d) {
  let days = 0
  if (y >= 1) {
    for (let yy = 1; yy < y; yy++) days += hijriYearLength(yy)
  } else {
    for (let yy = y; yy < 1; yy++) days -= hijriYearLength(yy)
  }
  for (let mm = 1; mm < m; mm++) days += hijriMonthLength(y, mm)
  days += (d - 1)
  return HIJRI_EPOCH_CIVIL_JDN + days
}

/** يحوّل رقم يوم جولياني مدني (عدد صحيح) إلى تاريخ هجري {y, m, d} */
export function civilJDNToHijri (jdn) {
  let days = Math.round(jdn) - HIJRI_EPOCH_CIVIL_JDN
  let y = 1
  if (days >= 0) {
    while (days >= hijriYearLength(y)) { days -= hijriYearLength(y); y++ }
  } else {
    y = 0
    while (days < 0) { y--; days += hijriYearLength(y) }
  }
  let m = 1
  while (days >= hijriMonthLength(y, m)) { days -= hijriMonthLength(y, m); m++ }
  return { year: y, month: m, day: days + 1 }
}

/** رقم يوم جولياني مدني (عدد صحيح) لتاريخ ميلادي بسيط (بلا وقت) y-m-d */
export function civilJDNFromGregorian (y, m, d) {
  return Math.round(julian.CalendarGregorianToJD(y, m, d))
}

export function gregorianFromCivilJDN (jdn) {
  const g = julian.JDToCalendarGregorian(Math.round(jdn))
  return { year: g.year, month: g.month, day: Math.round(g.day) }
}

/**
 * يُرجع التاريخ الهجري المقابل لليوم المحلي (سنة/شهر/يوم ميلادي محلي - وليس بالضرورة UTC)
 * الذي يقع فيه تاريخ/وقت معيّن. يُستعمل اليوم المحلي (لا UTC) لأن بداية اليوم الهجري
 * تقليديا مرتبطة بغروب الشمس محليا، والأقرب لذلك عمليا هو اعتماد اليوم المدني المحلي للمراقب.
 * @param {number} localYear
 * @param {number} localMonth1to12
 * @param {number} localDay
 */
export function hijriFromLocalGregorianDate (localYear, localMonth1to12, localDay) {
  const jdn = civilJDNFromGregorian(localYear, localMonth1to12, localDay)
  const h = civilJDNToHijri(jdn)
  return h
}

export default {
  HIJRI_EPOCH_CIVIL_JDN,
  isHijriLeapYear,
  hijriMonthLength,
  hijriYearLength,
  hijriToCivilJDN,
  civilJDNToHijri,
  civilJDNFromGregorian,
  gregorianFromCivilJDN,
  hijriFromLocalGregorianDate
}
