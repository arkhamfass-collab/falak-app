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

export default {
  ZODIAC_SIGNS_AR, ZODIAC_SIGNS_FR, MANAZIL_AR, MANAZIL_FR,
  zodiacSignInfo, manzilInfo, zodiacSignName, manzilName
}
