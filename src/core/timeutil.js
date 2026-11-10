/**
 * src/core/timeutil.js
 * أدوات التوقيت: بناء لحظات UTC من تاريخ/وقت محلي، وتحديد "اليوم المدني العالمي (UTC)"
 * المرجعي المناسب لحسابات الشروق/الزوال/الغروب، وتنسيق أي لحظة UTC بالتوقيت المحلي للمراقب.
 *
 * المراقب يُمثَّل هنا بأحد شكلين:
 *  - {mode:'offset', utcOffsetHours: number}  -> فرق ثابت عن UTC (كما يُدخله المستخدم يدويا)
 *  - {mode:'tz', timeZone: string}            -> منطقة زمنية فعلية (IANA) تُعالج التوقيت الصيفي تلقائيا
 */

import julian from './astro/src/julian.js'

/** يبني تاريخ UTC (كائن Date) من سنة/شهر/يوم/ساعة محلية وفرق توقيت ثابت بالساعات */
export function localToUTCDateWithOffset (year, month, day, hour, minute, second, utcOffsetHours) {
  const millis = Date.UTC(year, month - 1, day, hour, minute, second) - utcOffsetHours * 3600 * 1000
  return new Date(millis)
}

/** الفرق الفعلي بالساعات بين UTC ومنطقة زمنية IANA عند لحظة UTC معيّنة (يراعي التوقيت الصيفي) */
export function utcOffsetHoursForTimeZone (utcDate, timeZone) {
  // نولّد نص التاريخ بنفس اللحظة في المنطقتين (UTC والمنطقة المطلوبة) ونحسب الفرق بالدقائق
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  const parts = dtf.formatToParts(utcDate).reduce((o, p) => { o[p.type] = p.value; return o }, {})
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  )
  return (asUTC - utcDate.getTime()) / 3600000
}

/**
 * يُرجع {year, month, day, hour, minute, second} كما تُرى في منطقة/فرق توقيت المراقب،
 * لأجل لحظة UTC مُعطاة.
 */
export function localPartsFromUTC (utcDate, observerTime) {
  if (observerTime.mode === 'tz') {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: observerTime.timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    const parts = dtf.formatToParts(utcDate).reduce((o, p) => { o[p.type] = p.value; return o }, {})
    return {
      year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
      hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second)
    }
  }
  const offsetMs = observerTime.utcOffsetHours * 3600 * 1000
  const shifted = new Date(utcDate.getTime() + offsetMs)
  return {
    year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes(), second: shifted.getUTCSeconds()
  }
}

/** فرق UTC الحالي بالساعات (موجب شرقا) لتمثيل المراقب، أيا كان شكله */
export function currentUtcOffsetHours (utcDate, observerTime) {
  if (observerTime.mode === 'tz') return utcOffsetHoursForTimeZone(utcDate, observerTime.timeZone)
  return observerTime.utcOffsetHours
}

/** عدد الساعات العشرية المحلية (0..24) للحظة UTC معيّنة - مفيد للعرض السريع */
export function localDecimalHour (utcDate, observerTime) {
  const p = localPartsFromUTC(utcDate, observerTime)
  return p.hour + p.minute / 60 + p.second / 3600
}

/**
 * يحدد "مرساة اليوم المدني العالمي (UTC)" المناسبة لحسابات الشروق/الزوال/الغروب "اليوم"
 * بالنسبة لمراقب معيّن: نأخذ ظهر المراقب المحلي (منتصف يومه تقريبا) ونحوّله UTC، ثم نحدد
 * اليوم المدني العالمي (منتصف الليل UTC إلى منتصف الليل UTC) الذي يقع فيه - بعيدا عن أي
 * التباس قد يحدث عند حدود منتصف الليل المحلي.
 * @returns {number} jd0 - اليوم الجولياني عند 0 سا توقيت عالمي لذلك اليوم المدني (ينتهي بـ .5)
 */
export function utcCivilDayAnchorJD (localYear, localMonth1to12, localDay, observerTime) {
  // نبني "ظهر اليوم المحلي" تقريبيا؛ لأجل هذا نحتاج فرق التوقيت وقت الظهر نفسه (قد يختلف صيفا/شتاء
  // في حالة المنطقة الزمنية الحقيقية)، فنقدّره أولا بفرق تقريبي ثم نصححه إن لزم.
  let approxOffset = observerTime.mode === 'tz'
    ? utcOffsetHoursForTimeZone(new Date(Date.UTC(localYear, localMonth1to12 - 1, localDay, 12, 0, 0)), observerTime.timeZone)
    : observerTime.utcOffsetHours
  const noonUTCMillis = Date.UTC(localYear, localMonth1to12 - 1, localDay, 12, 0, 0) - approxOffset * 3600 * 1000
  const noonUTCDate = new Date(noonUTCMillis)
  const jdLocalNoon = julian.DateToJD(noonUTCDate)
  return Math.floor(jdLocalNoon - 0.5) + 0.5
}

/**
 * اللحظة العالمية (UTC) المطابقة *تماما* لمنتصف الليل المحلي (00:00:00) لليوم المطلوب - بخلاف
 * utcCivilDayAnchorJD أعلاه التي تُطوِّق اللحظة إلى أقرب حد "يوم UTC" كامل حول *ظهر* المراقب
 * (لغرض مختلف: تهيئة جدول استيفاء ميوس التقريبي القديم للشروق/الزوال/الغروب). هذه الدالة تُرجع
 * اللحظة الحقيقية بلا أي تطويق أو تقريب لحدود يوم UTC، لتُستعمل كبداية نافذة بحث مباشرة عن
 * عبورات اليوم المحلي الحقيقي (انظر riseSetUtil.findDayCrossings).
 *
 * علة مُثبَتة تجريبيا بسبب الخلط بين الدالتين: الفرق بين utcCivilDayAnchorJD وهذه الدالة يبلغ
 * |utcOffsetHours| ساعة تماما (مثلا ٧ ساعات كاملة عند فرق توقيت -٧) - لأن "يوم UTC الذي يحوي
 * ظهر المراقب المحلي" يختلف عن "يوم UTC الذي يحوي منتصف ليله المحلي" كلما كان فرق التوقيت غير
 * صفري (اليوم المحلي يمتد بالضرورة عبر يومي UTC متجاورين لأي فرق توقيت ≠ ٠). استعمال
 * utcCivilDayAnchorJD (أو نتائجه) كنافذة بحث "لليوم المحلي" مباشرة - كما كانت الحال في
 * sun.js/moon.js قبل هذا الإصلاح - ينتج عنه اختيار عبور شروق/زوال/غروب من يوم مجاور خطأً في نحو
 * ربع الحالات تجريبيا (قياس مُفصَّل: measure_sun_day_mismatch.mjs وmeasure_day_mismatch.mjs في
 * سجل العمل)، رغم وجود عبور صحيح من اليوم المطلوب نفسه، كلما سقطت لحظة العبور الفعلية في الساعات
 * "المفقودة" من النافذة المُزاحة. هذه الدالة (مع findDayCrossings) هي الإصلاح الجذري لذلك.
 */
export function localMidnightJD (localYear, localMonth1to12, localDay, observerTime) {
  // نفس تقريب التوقيت الصيفي (DST) المعتمد فعلا في utcCivilDayAnchorJD أعلاه، لكن عند منتصف
  // الليل (ساعة ٠) لا الظهر (ساعة ١٢) - قد يختلف بساعة واحدة فقط خلال الساعات القليلة المحيطة
  // بلحظة انتقال التوقيت الصيفي نفسها لمنطقة زمنية حقيقية (أثر مقبول، مطابق تماما لنفس التقريب
  // المعتمد أصلا هناك لمنتصف النهار).
  const approxOffset = observerTime.mode === 'tz'
    ? utcOffsetHoursForTimeZone(new Date(Date.UTC(localYear, localMonth1to12 - 1, localDay, 0, 0, 0)), observerTime.timeZone)
    : observerTime.utcOffsetHours
  const midnightUTCMillis = Date.UTC(localYear, localMonth1to12 - 1, localDay, 0, 0, 0) - approxOffset * 3600 * 1000
  return julian.DateToJD(new Date(midnightUTCMillis))
}

export default {
  localToUTCDateWithOffset,
  utcOffsetHoursForTimeZone,
  localPartsFromUTC,
  currentUtcOffsetHours,
  localDecimalHour,
  utcCivilDayAnchorJD,
  localMidnightJD
}
