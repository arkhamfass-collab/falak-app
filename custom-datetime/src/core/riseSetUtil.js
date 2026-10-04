/**
 * src/core/riseSetUtil.js
 * غلاف دفاعي حول riseLib.times() (مكتبة astronomia، فصل ميوس 15 - الشروق والعبور والغروب).
 *
 * علة مُثبَتة تجريبيا (انظر /tmp أو سجل العمل): في بعض الحالات تُقفز قيمة "العبور" المُصحَّحة
 * التي تُعيدها times() بمقدار يوم كامل تقريبا (86400 ثانية) عن القيمة الصحيحة، بسبب أن تصحيح
 * الزاوية الداخلي (الفرق بين الزاوية الساعية الخام ومضاعفاتها) لا يُطوَّق (wrap) إلى أقرب
 * مكافئ قبل استعماله كتصحيح صغير على التقدير التقريبي (approxTimes) - فحين يقع الحساب الخام
 * على "دورة" مجاورة (±360° = ±86400 ثانية)، تنزاح نتيجة العبور يوما كاملا رغم أن وقتها
 * (الساعة والدقيقة) داخل اليوم يكون صحيحا تماما. التحقق العملي (مكة، 2026-04-01) أظهر:
 *   rise diff ≈ -7.2s  (تصحيح طبيعي)
 *   set  diff ≈ +12.4s (تصحيح طبيعي)
 *   transit diff ≈ -86406.8s  (= -86400 - 6.8s؛ أي تصحيح طبيعي -6.8s + قفزة زائفة يوم كامل)
 *
 * الإصلاح هنا لا يُعدِّل الملف الموروث (نُفضّل عدم لمس كود موثّق مُتحقَّق منه مصدره)، بل يُطوِّق
 * ناتج times() إلى أقرب مكافئ لناتج approxTimes() (الذي يُضمَن ضمن [0, 86400) دائما) لكل من
 * الشروق والعبور والغروب على حدة - فيُلغى أي انزياح بمضاعفات يوم كامل مع الحفاظ الكامل على دقة
 * تصحيح ميوس الطبيعية (ثوان إلى دقائق قليلة).
 */

import riseLib from './astro/src/rise.js'

const SECS_PER_DAY = 86400

/** يُعيد قيمة مكافئة لـvalue (بفرق مضاعف صحيح لـperiod) وهي الأقرب إلى anchor */
function nearestEquivalent (value, anchor, period = SECS_PER_DAY) {
  const diff = value - anchor
  const wrapped = diff - period * Math.round(diff / period)
  return anchor + wrapped
}

/**
 * نظير آمن لـriseLib.times (نفس التوقيع والمُعاملات والنتيجة ونفس الاستثناءات المرفوعة
 * errorAboveHorizon/errorBelowHorizon عند عدم وجود عبور فعلي) - انظر توثيق rise.js.
 */
export function safeTimes (p, deltaTsec, h0, Th0, ra3, dec3) {
  const approx = riseLib.approxTimes(p, h0, Th0, ra3[1], dec3[1])
  const refined = riseLib.times(p, deltaTsec, h0, Th0, ra3, dec3)
  return {
    rise: nearestEquivalent(refined.rise, approx.rise),
    transit: nearestEquivalent(refined.transit, approx.transit),
    set: nearestEquivalent(refined.set, approx.set)
  }
}

export default { safeTimes }
