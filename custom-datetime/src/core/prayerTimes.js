/**
 * src/core/prayerTimes.js
 * أوقات الصلاة الخمس: الفجر، الشروق، الظهر، العصر، المغرب، العشاء.
 *
 * طريقة الحساب (حسب اختيار المستخدم):
 *  - الفجر  : عبور الشمس صباحا ارتفاعا = fajrAngleDeg (الافتراضي -18°)
 *  - الشروق : الشروق الفعلي (ارتفاع معياري يشمل الانكسار ونصف قطر القرص، من sun.sunRiseTransitSet)
 *  - الظهر  : لحظة الزوال الفعلية (عبور الشمس خط زوال المراقب)
 *  - العصر  : صيغة الفقهاء/ميوس القياسية  h_asr = atan(1/(asrFactor + tan(|lat - dec|)))
 *             حيث |lat-dec| تُستخرج من ارتفاع الزوال مباشرة (transitAltitude = 90 - |lat-dec|)
 *             asrFactor = 1 لمذهب الجمهور (الشافعية/المالكية/الحنابلة) أو 2 للحنفية
 *  - المغرب : الغروب الفعلي
 *  - العشاء : حسب الإعداد الحالي = المغرب + ishaOffsetMinutes دقيقة (90 دقيقة)، لا بزاوية ارتفاع
 *
 * كل هذه الإعدادات قابلة للتبديل عبر معامل settings (كما وُعِد المستخدم: قابلة للتعديل من
 * داخل التطبيق لاحقا)، بما يشمل التبديل لاحقا لطريقة العشاء بالزاوية الفلكية إن رغب المستخدم.
 */

import sun from './sun.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export const DEFAULT_PRAYER_SETTINGS = {
  fajrAngleDeg: -18, // اختيار المستخدم
  asrFactor: 1, // 1 = الجمهور (الشافعية/المالكية/الحنابلة)، 2 = الحنفية
  ishaMode: 'offsetAfterMaghrib', // 'offsetAfterMaghrib' | 'angle'
  ishaOffsetMinutes: 90, // اختيار المستخدم: عشاء = مغرب + 90 دقيقة
  ishaAngleDeg: -18, // تُستعمل فقط إذا ishaMode === 'angle' (مرونة لتبديل الطريقة مستقبلا)
  ihtiyatMinutes: 0 // هامش احتياط اختياري (دقائق)؛ 0 الآن = حساب فلكي خالص بلا هامش
}

export const PRAYER_NAMES_AR = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء'
}

/**
 * يحسب أوقات الصلاة الخمس (+الشروق) ليوم محلي معيّن عند موقع المراقب.
 * @param {number} localYear
 * @param {number} localMonth1to12
 * @param {number} localDay
 * @param {{mode:'offset',utcOffsetHours:number}|{mode:'tz',timeZone:string}} observerTime
 * @param {number} latDeg - عرض المراقب (شمالا موجب)
 * @param {number} lonEastDeg - طول المراقب (شرقا موجب)
 * @param {Partial<typeof DEFAULT_PRAYER_SETTINGS>} [settings]
 * @returns {{
 *   fajr:Date|null, sunrise:Date|null, dhuhr:Date|null, asr:Date|null,
 *   maghrib:Date|null, isha:Date|null,
 *   status:{fajr:string, sunMain:string, asr:string, isha:string}
 * }}
 */
export function computePrayerTimes (localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, settings = {}) {
  const s = { ...DEFAULT_PRAYER_SETTINGS, ...settings }
  const ihtiyatMs = (s.ihtiyatMinutes || 0) * 60000

  // الشروق/الزوال(الظهر)/الغروب الفعلية + ارتفاع الزوال (يُستعمل لاستخراج العصر أدناه)
  const main = sun.sunRiseTransitSet(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg)

  // الفجر: عبور صباحي لارتفاع fajrAngleDeg
  const fajrCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.fajrAngleDeg)

  // العصر: نحسب h_asr من |lat-dec| المُستخرجة من ارتفاع الزوال، ثم نجد عبورها المسائي (بعد الزوال)
  let asrDate = null
  let asrStatus = main.status
  if (main.status === 'ok') {
    const absLatDecDeg = 90 - main.transitAltitudeDeg
    const hAsrDeg = Math.atan(1 / (s.asrFactor + Math.tan(absLatDecDeg * D2R))) * R2D
    const asrCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, hAsrDeg)
    asrDate = asrCrossing.setDate // بعد الزوال = العبور المسائي (الهابط) لهذا الارتفاع
    asrStatus = asrCrossing.status
  }

  const maghribDate = main.setDate

  // العشاء
  let ishaDate = null
  let ishaStatus = main.status
  if (s.ishaMode === 'angle') {
    const ishaCrossing = sun.sunAngleCrossing(localYear, localMonth1to12, localDay, observerTime, latDeg, lonEastDeg, s.ishaAngleDeg)
    ishaDate = ishaCrossing.setDate ? new Date(ishaCrossing.setDate.getTime() + ihtiyatMs) : null
    ishaStatus = ishaCrossing.status
  } else if (maghribDate) {
    // الإزاحة الثابتة (90 دقيقة) تمثل هامشا كافيا بذاتها، فلا نضيف إليها ihtiyat إضافيا
    ishaDate = new Date(maghribDate.getTime() + s.ishaOffsetMinutes * 60000)
    ishaStatus = 'ok'
  }

  return {
    fajr: fajrCrossing.riseDate ? new Date(fajrCrossing.riseDate.getTime() - ihtiyatMs) : null,
    sunrise: main.riseDate,
    dhuhr: main.transitDate ? new Date(main.transitDate.getTime() + ihtiyatMs) : null,
    asr: asrDate,
    maghrib: maghribDate,
    isha: ishaDate,
    status: {
      fajr: fajrCrossing.status,
      sunMain: main.status,
      asr: asrStatus,
      isha: ishaStatus
    }
  }
}

export default { computePrayerTimes, DEFAULT_PRAYER_SETTINGS, PRAYER_NAMES_AR }
