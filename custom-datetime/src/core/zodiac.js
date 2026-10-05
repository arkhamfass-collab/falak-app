/**
 * src/core/zodiac.js
 * البروج الشمسية الاثنا عشر، ومنازل القمر الثمانية والعشرون - يُصنَّف كلاهما من الطول البروجي
 * (longitudeDeg) لأي جسم (الشمس أو القمر سواء)، فهما هندسيا تصنيفان لنفس الكمية (موضع الجسم
 * على دائرة البروج) بتجزيئين مختلفين، لا حسابان فلكيان مستقلان.
 *
 * الاصطلاح المعتمَد (بتأكيد صريح من المستخدم):
 *  - البروج: التقسيم الفلكي المعتاد، ١٢ برجا متساويا (٣٠° لكل برج) من نقطة الاعتدال الربيعي
 *    (الحمل عند ٠°)، وهذا معيار لا خلاف حوله.
 *  - المنازل: ٢٨ منزلة متساوية (٣٦٠°/٢٨ = ١٢°٥١′٢٥.٧″ لكل منزلة) تبدأ من نفس نقطة صفر الحمل -
 *    وهي الصيغة المبسطة الشائعة في الحسابات الفلكية المعاصرة (لا الصيغة التاريخية القديمة التي
 *    تُحدِّد كل منزلة بنجم حقيقي وحدودها غير متساوية وتتأثر بالتقدم السنوي/precession).
 */

import { normalizeDeg360 } from './format.js'

const SIGN_WIDTH_DEG = 30
const MANZIL_WIDTH_DEG = 360 / 28

export const ZODIAC_SIGNS_AR = [
  'الحمل', 'الثور', 'الجوزاء', 'السرطان', 'الأسد', 'العذراء',
  'الميزان', 'العقرب', 'القوس', 'الجدي', 'الدلو', 'الحوت'
]

export const ZODIAC_SIGNS_FR = [
  'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
  'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
]

/** الأسماء التقليدية لمنازل القمر الثمانية والعشرين، بترتيبها من صفر الحمل */
export const MANAZIL_AR = [
  'الشرطين', 'البطين', 'الثريا', 'الدبران', 'الهقعة', 'الهنعة', 'الذراع',
  'النثرة', 'الطرف', 'الجبهة', 'الزبرة', 'الصرفة', 'العواء', 'السماك',
  'الغفر', 'الزبانى', 'الإكليل', 'القلب', 'الشولة', 'النعائم', 'البلدة',
  'سعد الذابح', 'سعد بلع', 'سعد السعود', 'سعد الأخبية',
  'الفرغ المقدم', 'الفرغ المؤخر', 'الرشاء'
]

/** مقابل حرفي (تقريب شائع بالحروف اللاتينية، على نسق أسماء الأشهر الهجرية الفرنسية في format.js) */
export const MANAZIL_FR = [
  'Ach-Charatayn', 'Al-Butayn', 'Ath-Thourayya', 'Ad-Dabaran', 'Al-Haq’ah', 'Al-Han’ah', 'Adh-Dhira’',
  'An-Nathrah', 'At-Tarf', 'Al-Jabhah', 'Az-Zoubrah', 'As-Sarfah', 'Al-’Awwa', 'As-Simak',
  'Al-Ghafr', 'Az-Zoubana', 'Al-Iklil', 'Al-Qalb', 'Ach-Chawlah', 'An-Na’a’im', 'Al-Baldah',
  "Sa'd adh-Dhabih", "Sa'd Boula’", "Sa'd as-Sou’oud", "Sa'd al-Akhbiyah",
  'Al-Fargh al-Mouqaddam', 'Al-Fargh al-Mou’akhkhar', 'Ar-Richa'
]

/**
 * يصنّف طولا بروجيا (بالدرجات، أي مدى) إلى برج ودرجته ضمنه.
 * @param {number} longitudeDeg
 * @returns {{signIndex:number, degreeInSign:number}} signIndex: 0..11 (0=الحمل)، degreeInSign: 0..30
 */
export function zodiacSignInfo (longitudeDeg) {
  const lon = normalizeDeg360(longitudeDeg)
  const signIndex = Math.min(11, Math.floor(lon / SIGN_WIDTH_DEG))
  const degreeInSign = lon - signIndex * SIGN_WIDTH_DEG
  return { signIndex, degreeInSign }
}

/**
 * يصنّف طولا بروجيا إلى منزلة ودرجتها ضمنها.
 * @param {number} longitudeDeg
 * @returns {{manzilIndex:number, degreeInManzil:number}} manzilIndex: 0..27، degreeInManzil: 0..(360/28)
 */
export function manzilInfo (longitudeDeg) {
  const lon = normalizeDeg360(longitudeDeg)
  const manzilIndex = Math.min(27, Math.floor(lon / MANZIL_WIDTH_DEG))
  const degreeInManzil = lon - manzilIndex * MANZIL_WIDTH_DEG
  return { manzilIndex, degreeInManzil }
}

export function zodiacSignName (signIndex, lang = 'ar') {
  return lang === 'fr' ? ZODIAC_SIGNS_FR[signIndex] : ZODIAC_SIGNS_AR[signIndex]
}

export function manzilName (manzilIndex, lang = 'ar') {
  return lang === 'fr' ? MANAZIL_FR[manzilIndex] : MANAZIL_AR[manzilIndex]
}

/**
 * "الأيانامسا" (الفرق بين الطول البروجي التقويمي الحالي ونظيره النجمي الحقيقي نسبةً لموضع
 * النجوم الثابتة فعليا) - هذا أساس التمييز الذي طلبه المستخدم بين "البرج التقديري" (التقويمي،
 * من نقطة الاعتدال المتحركة - zodiacSignInfo/manzilInfo أعلاه حين تُستدعيان بالطول البروجي كما
 * هو) و"البرج التحقيقي" (النجمي، من موضع الشمس/القمر الفعلي وسط الأبراج الحقيقية - تُستدعيان
 * بالطول البروجي بعد طرح ayanamsaDeg منه). السبب الفلكي: تقدُّم الاعتدالين (precession) يُزحزح
 * نقطة الاعتدال الربيعي عن النجوم الثابتة بنحو ١° كل ٧٢ سنة تقريبا - تأكَّد هذا المعدل من
 * مصدرين مستقلّين تماما: جمعية الفلك بالقطيف (qasweb.org/articles/433) بصيغة "درجة كل ٧٢
 * سنة"، ومعدل أيانامسا "Lahiri" الهندي التقليدي "٥٠ ثانية قوسية سنويا" - وهما متطابقان حسابيا
 * (٥٠×٧٢=٣٦٠٠ ثانية = ١°)، فاعتُمد Lahiri قيمةً مرجعية هنا إذ لم يُعثر (بعد بحث لم يكفِ) على
 * اصطلاح عربي/فلكي-شرعي مقنَّن مستقل لنقطة الصفر النجمية.
 *
 * القيمة المرجعية: ٢٤°١٣′١٩″ في ٢٠٢٦/١/١ (المصدر: jagannathhora.com/lahiri-ayanamsa-value)
 * بمعدل +٥٠ ثانية قوسية/سنة. هذا تقدير بحثي بانتظار تأكيد المستخدم بقراءة مرجعه الخاص ("الهادي
 * الناطق") في لحظة محدَّدة، إذ قد يستعمل نقطة صفر نجمية مختلفة قليلا عن Lahiri - يسهل تعديل
 * الثابتين أدناه فور توفر قراءة مرجعية دقيقة، بلا أي تغيير آخر في بقية الكود.
 * @param {Date} utcDate
 * @returns {number} الأيانامسا بالدرجات عند هذه اللحظة
 */
const AYANAMSA_REF_UTC_MS = Date.UTC(2026, 0, 1, 0, 0, 0)
const AYANAMSA_REF_DEG = 24 + 13 / 60 + 19 / 3600
const AYANAMSA_RATE_DEG_PER_YEAR = 50 / 3600

export function ayanamsaDeg (utcDate) {
  const yearsSinceRef = (utcDate.getTime() - AYANAMSA_REF_UTC_MS) / (365.25 * 24 * 3600 * 1000)
  return AYANAMSA_REF_DEG + AYANAMSA_RATE_DEG_PER_YEAR * yearsSinceRef
}

export default {
  ZODIAC_SIGNS_AR, ZODIAC_SIGNS_FR, MANAZIL_AR, MANAZIL_FR,
  zodiacSignInfo, manzilInfo, zodiacSignName, manzilName, ayanamsaDeg
}
