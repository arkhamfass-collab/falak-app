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
import { utcCivilDayAnchorJD, localMidnightJD } from './timeutil.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI
const earth = new Planet(earthData)

/** نصف قطر القمر الفعلي بالكم - نفس القيمة المعتمدة في crescentVisibility.js (MOON_RADIUS_KM
 * هناك)؛ مكرَّرة هنا بدل استيرادها من ذلك الملف لتفادي استيراد دائري (crescentVisibility.js
 * نفسه يستورد moon.js). ثابت فيزيائي عالمي لا يختلف بين الملفين. */
const MOON_RADIUS_KM = 1737.4

/** الإحداثيات البروجية (الظاهرية) والاستوائية (الظاهرية) للقمر عند لحظة TT (jde) معيّنة */
export function moonEclipticAndEquatorial (jde) {
  const geo = moonposition.position(jde) // {lon, lat, range} بلا تصحيح الرؤوس (nutation)
  const [dpsi, deps] = nutation.nutation(jde)
  const trueObliquity = nutation.meanObliquity(jde) + deps
  const lonApparent = geo.lon + dpsi
  const ecl = { lon: lonApparent, lat: geo.lat, range: geo.range }
  const eq = new coordLib.Ecliptic(lonApparent, geo.lat).toEquatorial(trueObliquity)
  const parallax = moonposition.parallax(geo.range)
  // trueObliquity (الميل الكلي الحقيقي) يُرجَع هنا أيضا لإعادة استعماله في topocentricEcliptic
  // أدناه (تحويل الإحداثيات الطوبوغرافية نفسها إلى بروجية) بلا إعادة حساب nutation من جديد.
  return { ecl, eq: { ra: eq.ra, dec: eq.dec }, range: geo.range, parallax, trueObliquity }
}

/** نصف القطر الظاهري *الجيومركزي* للقمر، بالدقائق القوسية - من المسافة الجيومركزية مباشرة (بلا
 * تصحيح متوازي السمت). هذا هو المقدار "التقويمي" المعتاد في الأزياج والتقاويم الفلكية (كاختلاف
 * المنظر الأفقي تماما) - بخلاف نصف القطر *الطوبوغرافي* الذي تحسبه crescentVisibility.js خصيصا
 * لتحري الهلال (topocentricSemiDiameterArcmin)، والذي يتغيّر قليلا بارتفاع القمر الفعلي في
 * السماء عند موقع مراقب بعينه. */
export function geocentricSemiDiameterArcmin (geocentricRangeKm) {
  return Math.atan(MOON_RADIUS_KM / geocentricRangeKm) * R2D * 60
}

/**
 * يحوّل الإحداثيات الاستوائية *الطوبوغرافية* (من topocentricEquatorial أعلاه) إلى إحداثيات
 * بروجية طوبوغرافية (طول/عرض كما تُرى فعلا من موقع المراقب، لا من مركز الأرض) - دوران بزاوية
 * الميل الكلي فقط (R2D أدناه)، فهو نفس تحويل استوائي←بروجي المعتاد تماما (لا علاقة له بالمسافة
 * أو بمتوازي السمت) سواء طُبِّق على إحداثيات جيومركزية أو طوبوغرافية. يُستعمل هذا حين يختار
 * المستخدم من الإعدادات عرض "طول/عرض القمر" طوبوغرافيا بدل الجيومركزي الافتراضي (انظر
 * moonCoordFrame في engine.js) - لمطابقة ما تعرضه برامج الرصد كـSky Safari، على حساب الخروج عن
 * الاصطلاح الفلكي/التقويمي المعتاد (جيومركزي) المستعمل في بقية التطبيق.
 * @param {{ra:number, dec:number}} topoEq - الإحداثيات الاستوائية الطوبوغرافية (راديان)
 * @param {number} trueObliquity - الميل الكلي الحقيقي عند نفس اللحظة (من moonEclipticAndEquatorial)
 * @returns {{lon:number, lat:number}} الطول/العرض البروجيان الطوبوغرافيان (راديان)
 */
export function topocentricEcliptic (topoEq, trueObliquity) {
  const e = new coordLib.Equatorial(topoEq.ra, topoEq.dec).toEcliptic(trueObliquity)
  return { lon: e.lon, lat: e.lat }
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

// نفس قيمة الانكسار القياسي عند الأفق (٣٤ دقيقة قوسية) المستعملة أصلا داخل riseLib.stdh0Lunar
// للتقدير الأولي أدناه - يُعاد استعمالها هنا حرفيا (لا تُكرَّر كرقم مستقل) لضمان الاتساق الكامل.
const MEAN_REFRACTION_DEG = riseLib.meanRefraction * R2D

/**
 * الارتفاع الطوبوغرافي الحقيقي للقمر (بالدرجات) عند لحظة UT بعينها - حساب مباشر كامل بلا أي
 * استيفاء تقريبي بين أيام متباعدة: الموضع الاستوائي الجيومركزي عند jde المطابقة تماما لهذه اللحظة
 * نفسها (moonEclipticAndEquatorial)، محوَّلا طوبوغرافيا (topocentricEquatorial - الفصل ٤٠، تصحيح
 * متوازي السمت الكامل لا تقريب stdh0Lunar المعتمد على متوسط النسبة)، ثم أفقيا
 * (horizontalFromEquatorial). حد الشروق/الغروب (threshold) هنا هو الانكسار القياسي + نصف القطر
 * الظاهري الفعلي عند هذه اللحظة بعينها (من المسافة الجيومركزية نفسها، عبر geocentricSemiDiameterArcmin
 * الموجودة أصلا أعلاه - فرقها عن الطوبوغرافي ثانوي جدا عند الأفق تحديدا، بخلاف السمت حيث يتباعدان
 * بقدر نصف قطر الأرض كاملا)، لا نسبة متوسطة ثابتة (٠٫٧٢٧٥ في stdh0Lunar) قد تختلف قليلا عن الفعلي.
 */
function exactTopocentricAltitudeDeg (jdUT, deltaTsec, latDeg, lonEastDeg) {
  const jde = jdUT + deltaTsec / 86400
  const m = moonEclipticAndEquatorial(jde)
  const topoEq = topocentricEquatorial(jdUT, m.eq, m.parallax, latDeg, lonEastDeg)
  const hz = horizontalFromEquatorial(jdUT, topoEq, latDeg, lonEastDeg)
  const thresholdDeg = -(MEAN_REFRACTION_DEG + geocentricSemiDiameterArcmin(m.range) / 60)
  return { altitudeDeg: hz.altitudeDeg, hourAngleDeg: hz.hourAngleDeg, thresholdDeg }
}

const NEWTON_STEP_DAYS = 60 / 86400 // دقيقة واحدة: فرق محدود للاشتقاق العددي (derivative) في كل تكرار
const NEWTON_MAX_ITER = 8
const NEWTON_CONVERGED_SEC = 0.05

/**
 * علة ثالثة في حساب الشروق/العبور/الغروب (مختلفة كليا عن علتي riseSetUtil.js الموثَّقتين هناك
 * بالتفصيل): حركة القمر السريعة جدا (نحو ١٣° يوميا بالمطلع المستقيم - أسرع من الشمس بعشرين مرة
 * تقريبا) تتجاوز ما تفترضه خوارزمية ميوس الأساسية للفصل ١٥ كما تُطبَّق في riseLib.times (استيفاء
 * تربيعي بين ٣ أيام متباعدة + تصحيح واحد فقط بلا أي تكرار) - الطريقة نفسها التي تُعطي للشمس دقة
 * تقارب الثانية (حركتها البطيئة جدا تجعل الاستيفاء التربيعي دقيقا كافيا من تصحيح واحد) تُخطئ
 * للقمر عادة بضع دقائق، وقد تتجاوز ١٠ دقائق عند خطوط العرض المرتفعة (حيث يقطع القمر الأفق بزاوية
 * منبسطة، فيطول الزمن المقابل لكل خطأ زاوي قليل في الموضع المُستوفى تقريبيا).
 * التحقق العملي المباشر (بلاغ المستخدم: فاس توري، السنغال، ٢٠٢٦-١١-١٠، ٢٠٢٦-١١-١٠): ميوس الأساسية
 * أعطت شروقا ٠٦:٥٧:٢٥ (بتوقيت المستخدم) بينما الحقيقة المرصودة (ومطابقة تطبيقات أخرى كـSkySafari/
 * skymap) ٠٧:٠١:٠٨ - فرق ٢٢٤ ثانية تقريبا؛ تأكَّد هذا بحساب مستقل كليا (بايسكشن/bisection على
 * exactTopocentricAltitudeDeg أعلاه مباشرة، بلا أي استيفاء) أن الحقيقة ٠٧:٠١:٠٩ (فرق ثانية واحدة
 * فقط عن المرصود، ضمن حدود دقة الرصد البشري) - مؤكِّدا أن نموذج موضع القمر نفسه (ميوس المختصرة
 * لحركة القمر، الفصل ٤٧، في moonposition.js) سليم تماما بلا أي علة، والعلة فقط في الاستيفاء
 * التقريبي أحادي المرحلة لخوارزمية ميوس ١٥ (غير مُصمَّمة أصلا لجرم بهذه السرعة الزاوية). فُحص
 * الخطأ أيضا عند عدة مواقع وتواريخ أخرى (شمالا حتى ريكيافيك ٦٤°، جنوبا حتى ويلينغتون، فصول
 * متعددة) فظهر مطابقا في كل الحالات: ١٥٠-٨٥٠ ثانية تقريبا، أسوأ عند خطوط العرض المرتفعة تحديدا
 * كما سبق توقعه، وليس خاصا بموقع المستخدم أو تاريخه - علة عامة في حساب الشروق/العبور/الغروب كله.
 * الإصلاح: تكرير نيوتن-رافسون (Newton-Raphson) ابتداءً من تقدير riseSetUtil.safeTimes نفسه (يبقى
 * بداية جيدة موثوقة، ويبقى اكتشافه حالة "لا شروق/غروب اليوم" - errorAboveHorizon/errorBelowHorizon
 * عبر hourAngle في rise.js - دون أي تغيير، فهذا الإصلاح يُصحِّح دقة التقدير الناتج فقط لا منطق
 * اختيار اليوم/الفرع المناسب أصلا). عند كل تكرار: يُحسب الارتفاع الطوبوغرافي الحقيقي (بلا استيفاء)
 * عند التقدير الحالي ونظير قريب منه (+دقيقة واحدة)، فيُستنتج الميل (derivative) عدديا، ويُصحَّح
 * التقدير بخطوة نيوتن كاملة؛ يتكرر ذلك حتى التقارب (<٠٫٠٥ ثانية) أو حتى NEWTON_MAX_ITER كحد أقصى.
 * التحقق العملي (راجع test_moonrise_newton_fix.mjs): تطابق تام (<٠٫٠٠١ ثانية) مع حقيقة البايسكشن
 * المستقلة في كل حالة فُحصت (١٢ موقعا/تاريخا متنوعا، نصفي الكرة، فصول مختلفة، حتى خط عرض ٦٤°)،
 * بأقصى ٦ تكرارات فعلية (ريكيافيك - أقصى حالة فُحصت)، فتُرك NEWTON_MAX_ITER=8 هامشَ أمان إضافيا.
 */
function refineHorizonCrossingJdUT (initialJdUT, deltaTsec, latDeg, lonEastDeg) {
  let t = initialJdUT
  for (let i = 0; i < NEWTON_MAX_ITER; i++) {
    const a = exactTopocentricAltitudeDeg(t, deltaTsec, latDeg, lonEastDeg)
    const f0 = a.altitudeDeg - a.thresholdDeg
    const b = exactTopocentricAltitudeDeg(t + NEWTON_STEP_DAYS, deltaTsec, latDeg, lonEastDeg)
    const f1 = b.altitudeDeg - b.thresholdDeg
    const slope = (f1 - f0) / NEWTON_STEP_DAYS // درجة/يوم
    if (slope === 0) break
    const dt = -f0 / slope
    t += dt
    if (Math.abs(dt) * 86400 < NEWTON_CONVERGED_SEC) break
  }
  return t
}

/** نظيرة refineHorizonCrossingJdUT للعبور: العبور يساوي بالتعريف الفلكي لحظة الزاوية الساعية H=٠
 * تماما (لا بحث عن أقصى ارتفاع - أدق تعريفا وأسهل تكرارا)؛ وH دالة شبه خطية في الزمن (معدل دوران
 * الأرض تقريبا، يكاد لا يتغيّر بحركة القمر البطيئة نسبيا في المطلع المستقيم خلال دقيقة واحدة)،
 * فيتقارب نيوتن عليها بسرعة مماثلة أو أفضل من الشروق/الغروب. راجع تعليق refineHorizonCrossingJdUT
 * أعلاه لتفصيل العلة والتحقق العملي الكامل، وهو واحد لكل من الدالتين معا (نفس السبب والإصلاح). */
function refineTransitJdUT (initialJdUT, deltaTsec, latDeg, lonEastDeg) {
  let t = initialJdUT
  for (let i = 0; i < NEWTON_MAX_ITER; i++) {
    const a = exactTopocentricAltitudeDeg(t, deltaTsec, latDeg, lonEastDeg)
    const b = exactTopocentricAltitudeDeg(t + NEWTON_STEP_DAYS, deltaTsec, latDeg, lonEastDeg)
    const slope = (b.hourAngleDeg - a.hourAngleDeg) / NEWTON_STEP_DAYS
    if (slope === 0) break
    const dt = -a.hourAngleDeg / slope
    t += dt
    if (Math.abs(dt) * 86400 < NEWTON_CONVERGED_SEC) break
  }
  return t
}

/**
 * علة رابعة، الأخطر أثرا من علة الدقة المُصحَّحة أعلاه (نيوتن-رافسون) ومن علتي riseSetUtil.js
 * الموثَّقتين هناك: "اختيار اليوم الخطأ". المسار القديم أدناه (ميوس + تصحيح/تطويق + نيوتن) يُهيّئ
 * حسابه حول utcCivilDayAnchorJD - مرساة "يوم UTC الذي يحوي ظهر المراقب المحلي" - لا منتصف ليله
 * المحلي الحقيقي؛ الفرق بينهما يبلغ |utcOffsetHours| ساعة تماما (راجع توثيق
 * timeutil.localMidnightJD للتفصيل والسبب). فحين تسقط لحظة الشروق/الزوال/الغروب الفعلية ضمن
 * الساعات "المفقودة" من تلك النافذة المُزاحة (شائع لفروق توقيت كبيرة)، يُعاد عبور من يوم مجاور
 * بدل اليوم المطلوب نفسه، رغم وجود عبور صحيح من اليوم المطلوب أصلا. قياس تجريبي واسع (عيّنات
 * عشوائية متنوعة): نحو ٢٥٪ من الحالات مُصابة بهذه العلة - مستقلة كليا عن علة الدقة، ولا تُصلَح
 * بتكرير نيوتن وحده (فهو يُصحِّح فقط دقة أي تقدير أولي، لا اليوم/الفرع الذي يُصحِّحه أصلا).
 *
 * الإصلاح: يبقى المسار القديم أدناه بلا أي تغيير (يُحدِّد حالة "لا شروق/غروب اليوم" القطبية عبر
 * errorAboveHorizon/errorBelowHorizon كما كان، ويُستعمل أيضا احتياطا حين لا يُعثر على عبور صحيح
 * من نوع معيّن ضمن اليوم المحلي الحقيقي نفسه - حالة نادرة طبيعية بسبب دورة القمر ~٢٤س٥٠د، لا علة
 * بذاتها)؛ ثم يُضاف بعده بحث مباشر (riseSetUtil.findDayCrossings) ضمن نافذة اليوم المحلي الحقيقي
 * [timeutil.localMidnightJD, +1) بالضبط - فيُستبدَل كل من الشروق/الزوال/الغروب بنتيجة هذا البحث
 * المباشر كلما وُجد عبور صحيح به (الحالة الغالبة، ~٩٨٪)، ويبقى تقدير المسار القديم كما هو فقط
 * حين لا يُوجد (الحالة النادرة أعلاه). التحقق العملي الكامل: راجع سجل العمل
 * (measure_day_mismatch.mjs قبل/بعد، classify_mismatches.mjs، compare_crescent_before_after.mjs).
 */
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
    const riseJdUT = refineHorizonCrossingJdUT(jd0 + rs.rise / 86400, deltaTsec, latDeg, lonEastDeg)
    const setJdUT = refineHorizonCrossingJdUT(jd0 + rs.set / 86400, deltaTsec, latDeg, lonEastDeg)
    const transitJdUT = refineTransitJdUT(jd0 + rs.transit / 86400, deltaTsec, latDeg, lonEastDeg)
    out.riseDate = julian.JDToDate(riseJdUT)
    out.transitDate = julian.JDToDate(transitJdUT)
    out.setDate = julian.JDToDate(setJdUT)
  } catch (e) {
    out.status = (e && e.code === -1) ? 'alwaysAbove' : 'alwaysBelow'
    return out // قطبيا - لا معنى للبحث المباشر ضمن يوم محلي واحد، نُرجع كما كان تماما
  }

  const localMidnight = localMidnightJD(localYear, localMonth, localDay, observerTime)
  const sample = (jdUT) => {
    const a = exactTopocentricAltitudeDeg(jdUT, deltaTsec, latDeg, lonEastDeg)
    return { err: a.altitudeDeg - a.thresholdDeg, H: a.hourAngleDeg }
  }
  const found = riseSetUtil.findDayCrossings(localMidnight, sample)
  if (found.rises.length > 0) out.riseDate = julian.JDToDate(found.rises[0])
  if (found.sets.length > 0) out.setDate = julian.JDToDate(found.sets[0])
  if (found.transits.length > 0) out.transitDate = julian.JDToDate(found.transits[0])

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
  geocentricSemiDiameterArcmin,
  topocentricEquatorial,
  topocentricEcliptic,
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
