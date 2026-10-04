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
 * عكس localPartsFromUTC: يبني لحظة UTC (كائن Date) من سنة/شهر/يوم/ساعة/دقيقة/ثانية محلية
 * كما يقرؤها المراقب، أيا كان شكل تمثيله (offset ثابت أو tz فعلية). خاص بميزة "تاريخ ووقت
 * محدد" (هذه النسخة فقط) التي تتيح حساب كل بيانات الشمس/القمر/الصلاة للحظة يختارها المستخدم
 * بدل الوقت الحالي - لمقارنتها ببرامج أخرى.
 *
 * في حالة 'tz' الفعلية نقدّر الفرق أولا بمعاملة الأجزاء المحلية كأنها UTC تقريبا (فرق تقريبي
 * لا يتجاوز خطأه نصف يوم أصلا، وعمليا أقرب من ذلك بكثير)، ثم نُعيد الحساب بالفرق الحقيقي عند
 * تلك اللحظة التقريبية، ونكرر مرة واحدة إضافية إن تغيّر الفرق (حدود انتقال التوقيت الصيفي) -
 * يكفي عمليا ولا حاجة لتكرار أكثر لأن التغيّر بين محاولتين متتاليتين لا يتجاوز ساعة واحدة.
 */
export function localPartsToUTCDate (year, month, day, hour, minute, second, observerTime) {
  if (observerTime.mode !== 'tz') {
    return localToUTCDateWithOffset(year, month, day, hour, minute, second, observerTime.utcOffsetHours)
  }
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const offset1 = utcOffsetHoursForTimeZone(approxUtc, observerTime.timeZone)
  const result1 = localToUTCDateWithOffset(year, month, day, hour, minute, second, offset1)
  const offset2 = utcOffsetHoursForTimeZone(result1, observerTime.timeZone)
  if (offset2 === offset1) return result1
  return localToUTCDateWithOffset(year, month, day, hour, minute, second, offset2)
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

export default {
  localToUTCDateWithOffset,
  utcOffsetHoursForTimeZone,
  localPartsFromUTC,
  currentUtcOffsetHours,
  localDecimalHour,
  utcCivilDayAnchorJD,
  localPartsToUTCDate
}
