/**
 * src/core/crescentVisibility.js
 * تحري الهلال: تقدير إمكانية رؤيته بمعيارين فلكيين رصديين معروفين -
 *   - يالوب (Yallop 1997, NAO Technical Note No. 69)
 *   - عودة (Odeh 2004/2006, Experimental Astronomy 18(1), 39-64)
 * مع مسح متعدد الأيام من مساء الاقتران إلى ثلاثة أيام بعد يوم الرؤية، وتحديد "يوم الفاتح"
 * (اليوم الذي يُفتتَح فيه الشهر الهجري الجديد).
 *
 * ========================= الفرق بين المعيارين =========================
 * كلا المعيارين يحوّلان أربع كميات هندسية مشتركة (ARCV قوس الرؤية، W عرض الهلال، ARCL قوس
 * النور، DAZ فرق السمت) إلى درجة واحدة تُصنَّف ضمن مناطق (A..F ليالوب، A..D لعودة). يتفقان
 * تماما في صيغة W، ويختلفان في نقطتين فقط:
 *  1) قوس الرؤية (ARCV) المستعمل: "جيومركزي" (ارتفاع القمر بلا تصحيح متوازي السمت) عند يالوب،
 *     و"طوبوغرافي" (بعد تصحيح متوازي السمت، كما يُرى فعلا من موقع المراقب) عند عودة.
 *  2) الحد الثابت في كثير الحدود التجريبي arcv_min(W) أدناه: 11.8371 ليالوب، 7.1651 لعودة
 *     (مصدر كل قيمة: ورقة عودة الأصلية نفسها، مع تحقق مستقل من مرجعين آخرين - انظر أدناه).
 *
 * q = (ARCV_geo − arcv_min(W, 11.8371)) / 10          [يالوب]
 * V = ARCV_topo − arcv_min(W, 7.1651)                 [عودة]
 * arcv_min(W, c) = c − 6.3226·W + 0.7319·W² − 0.1018·W³   (W بالدقائق القوسية)
 *
 * مناطق يالوب (حدّ أدنى صارم >، من ورقته وملاحظاته الفنية NAO 69):
 *   A: q>0.216 (رؤية سهلة بالعين)  B: q>-0.014 (رؤية بالعين بشروط مثالية)
 *   C: q>-0.16 (قد تحتاج مقرابا)   D: q>-0.232 (تحتاج مقرابا)
 *   E: q>-0.293 (لا تُرى حتى بمقراب جيد)   F: غير ذلك (تحت حد دانجون - لا يتكوّن الهلال فعليا)
 * مناطق عودة (حدّ أدنى ≥، من ورقته الأصلية مباشرة):
 *   A: V≥5.65 (رؤية بالعين)  B: V≥2 (رؤية بمعونة بصرية، وقد تُرى بالعين بشروط ممتازة)
 *   C: V≥-0.96 (رؤية بمعونة بصرية فقط)   D: غير ذلك (لا تُرى حتى بمعونة بصرية)
 *
 * ========================= لحظة تقييم المعيارين: "الوقت الأمثل" =========================
 * كلا المعيارين عُيِّرا تجريبيا (مقارنة بسجلات رصد فعلية) عند لحظة واحدة محدَّدة من المساء، لا
 * عند الغروب نفسه ولا عند أي لحظة أخرى عشوائية: "الوقت الأمثل" Tb = Ts + (4/9)(Tm−Ts)، حيث Ts
 * غروب الشمس وTm غروب القمر لنفس المساء (تُسع المسافة الزمنية بينهما لتُقارب أفضل لحظة رصد
 * عمليا قبل غروب القمر). هذا ما طلب المستخدم اعتماده لحساب نتيجتي يالوب وعودة (q/V والمنطقة)،
 * مع عرض قيمة هذا الوقت نفسها في المخرجات. أما الكميات الوصفية (أدناه) فتُعرض بدلا من ذلك عند
 * لحظتين أبسط يطلبهما المستخدم مباشرة: الغروب نفسه، ولحظة كون الشمس ٥° تحت الأفق (تقارب بداية
 * الشفق الفلكي، وتُعرض لحظتها أيضا) - فهاتان لحظتا "رصد عملي" مألوفتان، لا يتعارض عرضهما مع
 * تقييم معياري يالوب/عودة أنفسهما عند "الوقت الأمثل" الخاص بهما كما أوضح المستخدم صريحا.
 *
 * ========================= الأمور الستة: كاملة عند الغروب، مصغَّرة عند الشمس-٥° =========================
 * عند الغروب (snapshots.sunset) تُعرض الأمور الستة كاملة: العمر (ageHours، بالساعات منذ
 * الاقتران)، المكث (lagMinutes، بالدقائق من الغروب حتى غروب القمر)، الارتفاع (moonAltitudeDeg،
 * ارتفاع القمر الطوبوغرافي الحقيقي - "بلا انكسار جوي"، كما يتطلب كلا المعيارين)، الاستطالة
 * (elongationDeg = ARCL الطوبوغرافي، وهو بالضبط "الاستطالة" المعتمدة في أدبيات تحري الهلال، لا
 * الاستطالة الجيومركزية العامة المعروضة في تبويب القمر العادي)، نسبة النور (illuminatedFraction)،
 * وفرق السمت (dazDeg - انظر الفقرة التالية).
 * عند لحظة كون الشمس ٥° تحت الأفق (snapshots.sunMinus5) تُعرض بدلا من ذلك فقط ارتفاع *القمر*
 * (moonAltitudeDeg، طوبوغرافيا بلا انكسار - نفس تعريف الارتفاع عند الغروب) والاستطالة
 * (elongationDeg) عند هذه اللحظة الثانية تحديدا - تصحيح من المستخدم لطلبه الأول (إعادة الأمور
 * الستة كاملة هنا أيضا): لا حاجة لتكرار العمر/المكث/النور/فرق السمت عند لحظة ثانية قريبة من
 * الأولى بفارق دقائق لا يفيد عمليا تتبّعها لهذه الكميات بعينها، ويكفي ارتفاع القمر واستطالته
 * فقط (الكميتان اللتان يفيد تتبُّع تغيّرهما مع ازدياد الظلام تدريجيا). لحظة الشمس-٥° نفسها
 * (sun5Date) تبقى مُعروضة بصرف النظر، كما طلب المستخدم صريحا (مثل الوقت الأمثل Tb - انظر أعلاه).
 *
 * ========================= "المطال" (DAZ) =========================
 * استُفسر المستخدم عن معنى "المطال" في الطلب الأصلي، فأوضح أنه يقصد به فرق السمت بين الشمس
 * والقمر (ليعرف جهة الهلال عن موضع الغروب)، لا "قوس النور" (الاستطالة) كما افترضتُ أولا - وقد
 * أجاز حذفه لثقل حسابه الظاهر، إلا أنه يُحسب هنا مجانا تقريبا (نفس بيانات السمت المحسوبة أصلا
 * لكل من الشمس والقمر)، ومفيد حقا لتحديد الجهة، فجرى الاحتفاظ به كسادس كمية معروضة (باسم فرق
 * السمت/dazDeg، لا "المطال" تحديدا، لتفادي الالتباس اللغوي نفسه) - قرار اتُّخذ نيابة عن المستخدم
 * نظرا لتدني كلفته وفائدته الفعلية، ويُشار إليه عند التقرير للمستخدم ليطلب حذفه إن أراد.
 * dazDeg = سمت الشمس − سمت القمر (الطوبوغرافي)، مُضيَّقا لمدى ±180°. موجب يعني القمر إلى يسار
 * (شمال) موضع غروب الشمس للراصد المواجه للغرب في النصف الشمالي تقريبا (التفسير الدقيق يتبع
 * الموقع، فالقيمة الخام أدق من أي تفسير لفظي ثابت).
 *
 * ========================= "يوم الفاتح" (الأكثر تشددا: اتفاق المعيارين) =========================
 * طلب المستخدم أشد قاعدة ممكنة لتحديد يوم فتح الشهر عند اختلاف المعيارين: لا يُعدّ الهلال "مرئيا"
 * (فيُفتتَح الشهر) إلا إذا اتفق يالوب وعودة معا على الرؤية لنفس اليوم. أما "الرؤية" ضمن كل معيار
 * على حدة (حين يُطبَّق هذا الاتفاق) فتعني هنا المنطقتين A أو B من كليهما تحديدا (رؤية بالعين -
 * ولو بشروط مثالية/ممتازة - بخلاف C/D اللتين تحتاجان معونة بصرية صراحة) - وهذا اختيار اتُّخذ
 * نيابة عن المستخدم (لم يُسأل عنه تحديدا، والسؤال السابق كان عن التعارض *بين* المعيارين لا عن
 * حدّ "الرؤية" *داخل* كل معيار)، بُني على كَون وصف المنطقة B صريحا في كلا المعيارين بإمكان الرؤية
 * بالعين (لا بمعونة بصرية بالضرورة)، فتناظرا بذلك. يُفتتَح الشهر (يوم الفاتح) في اليوم المدني
 * التالي مباشرة ليوم الرؤية هذا (نفس قاعدة "اقتران+غروب" الفلكية المعتمدة أصلا في hijri.js).
 * أول يوم يحقق هذا الاتفاق يُسمّى "يوم الرؤية"، وتُكرَّر بياناته حرفيا (لا إعادة حساب) في الأيام
 * الثلاثة التالية له مباشرة، كما طلب المستخدم صريحا.
 *
 * ========================= المسافة الطوبوغرافية (لحساب نصف قطر القمر الظاهري W) =========================
 * عرض الهلال W يحتاج نصف القطر الظاهري *الطوبوغرافي* للقمر (كما يُرى فعليا من سطح الأرض، أكبر
 * قليلا من الجيومركزي حين يكون القمر مرتفعا، أصغر حين يكون منخفضا) - وهذا يحتاج مسافة طوبوغرافية
 * لا تُخرجها آلية الإحداثيات الاستوائية الطوبوغرافية الموجودة أصلا (moon.js، معادلات ميوس ٤٠.٢-
 * ٤٠.٤، تُخرج زاويتين فقط لا مسافة). استُخرجت هنا بقاعدة جيب التمام في مثلث (مركز الأرض - المراقب
 * - القمر): بمعرفة البعد الجيومركزي Δ (موثوق، من moonposition.js)، ونصف قطر الأرض Rₑ، والزاوية
 * θ عند مركز الأرض بين اتجاهي (مركز الأرض→المراقب) و(مركز الأرض→القمر) - وهذه الزاوية هي تحديدا
 * ٩٠°−الارتفاعِ الجيومركزي للقمر (لأن حساب الارتفاع الأفقي من الإحداثيات الاستوائية لا يعتمد إلا
 * على الاتجاه لا المسافة، فهو بالضبط ٩٠° ناقص هذه الزاوية θ بصرف النظر عن موضع "المراقب" الفعلي
 * على نفس الخط من مركز الأرض):
 *   Δ' = √(Rₑ² + Δ² − 2·Rₑ·Δ·sin(ارتفاع_جيومركزي))
 * تحقَّقت الصيغة بثلاث حالات حدِّية: عند ارتفاع=+٩٠° (القمر في سمت الرأس) تُعطي Δ'=Δ−Rₑ تماما
 * (المراقب أقرب للقمر بمقدار نصف قطر الأرض)، وعند −٩٠° (القمر في الحضيض الأسفل) تُعطي Δ'=Δ+Rₑ
 * (أبعد بنفس المقدار)، وعند ٠° (القمر عند الأفق) تُعطي Δ'=√(Rₑ²+Δ²) (قائم الزاوية تماما كما
 * تقتضيه الهندسة عند هذا الحدّ) - والثلاث صحيحة فتُثبت الصيغة.
 *
 * المرجعان الأساسيان لكل الصيغ أعلاه (مع تحقق تصالبي من مرجعين إضافيين وتطبيق مرجعي مفتوح
 * المصدر لنفس الحسابين): ورقة عودة الأصلية (astronomycenter.net)، وملاحظة RGO/NAO الفنية رقم ٦٩
 * ليالوب (ملخَّصة في عدة صفحات أكاديمية منشورة).
 */

import julian from './astro/src/julian.js'
import moonModule from './moon.js'
import sunModule from './sun.js'
import hijriModule from './hijri.js'
import timeutilModule from './timeutil.js'
import { normalizeDegSigned180 } from './format.js'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** نصف قطر الأرض الاستوائي بالكم - نفس القيمة المستعملة داخليا في astro/src/moonposition.js (parallax) */
const EARTH_RADIUS_KM = 6378.137
/** نصف قطر القمر الفعلي بالكم (نفس القيمة المعتمدة في مرجع moon-sighting-dart وغيره) */
const MOON_RADIUS_KM = 1737.4

// =============================================================================================
// الهندسة الأساسية المشتركة بين المعيارين
// =============================================================================================

/** المسافة الطوبوغرافية بين المراقب والقمر بالكم - انظر الاشتقاق والتحقق في رأس الملف */
export function topocentricDistanceKm (geocentricRangeKm, geocentricAltitudeDeg) {
  const altRad = geocentricAltitudeDeg * D2R
  const r = EARTH_RADIUS_KM
  const d = geocentricRangeKm
  const inner = r * r + d * d - 2 * r * d * Math.sin(altRad)
  return Math.sqrt(Math.max(inner, 0))
}

/** نصف القطر الظاهري الطوبوغرافي للقمر، بالدقائق القوسية */
export function topocentricSemiDiameterArcmin (topocentricDistKm) {
  return Math.atan(MOON_RADIUS_KM / topocentricDistKm) * R2D * 60
}

/** عرض الهلال W بالدقائق القوسية = نصف القطر الظاهري × (١ − جتا قوس النور) - صيغة واحدة للمعيارين */
export function crescentWidthArcmin (semiDiameterArcmin, arcOfLightDeg) {
  return semiDiameterArcmin * (1 - Math.cos(arcOfLightDeg * D2R))
}

/**
 * الهندسة الكاملة للهلال عند لحظة UTC ومكان مراقب معيّنين: كل الكميات الخام التي يُشتق منها
 * معيارا يالوب وعودة معا، بالإضافة إلى الارتفاع/السمت الخام والنسبة المضيئة - يُحسب كل ذلك
 * بمرور واحد بلا تكرار (كلا المعيارين يُبنيان على نفس الهندسة، إلا في اختيار ARCV جيومركزيا
 * أو طوبوغرافيا، والحد الثابت في arcv_min - انظر yallopQ/odehV أدناه).
 * الارتفاعان (القمر والشمس) هنا "بلا انكسار جوي" (airless) دوما - لأن horizontalFromEquatorial
 * في كل من moon.js وsun.js دوران هندسي بحت بلا تصحيح انكسار، كما يتطلب كلا المعيارين بالضبط.
 */
export function crescentGeometryAtUTC (utcDate, latDeg, lonEastDeg) {
  const jdUT = julian.DateToJD(utcDate)
  const jde = julian.DateToJDE(utcDate)

  const moonData = moonModule.moonEclipticAndEquatorial(jde)
  const sunData = sunModule.sunEclipticAndEquatorial(jde)

  const moonTopoEq = moonModule.topocentricEquatorial(jdUT, moonData.eq, moonData.parallax, latDeg, lonEastDeg)
  const moonHzGeo = moonModule.horizontalFromEquatorial(jdUT, moonData.eq, latDeg, lonEastDeg)
  const moonHzTopo = moonModule.horizontalFromEquatorial(jdUT, moonTopoEq, latDeg, lonEastDeg)
  const sunHz = sunModule.horizontalFromEquatorial(jdUT, sunData.eq, latDeg, lonEastDeg)

  // قوس الرؤية ARCV: جيومركزي (ليالوب) وطوبوغرافي (لعودة) - كلاهما بلا انكسار جوي
  const arcvGeoDeg = moonHzGeo.altitudeDeg - sunHz.altitudeDeg
  const arcvTopoDeg = moonHzTopo.altitudeDeg - sunHz.altitudeDeg

  // فرق السمت (الشمس − القمر الطوبوغرافي)، مُضيَّقا لمدى ±١٨٠°
  const dazDeg = normalizeDegSigned180(sunHz.azimuthDeg - moonHzTopo.azimuthDeg)

  // قوس النور ARCL: الاستطالة الظاهرية الطوبوغرافية (نفس القيمة تُستعمل في عرض الهلال W للمعيارين معا)
  const arclDeg = moonModule.angularSeparationDeg(moonTopoEq.ra, moonTopoEq.dec, sunData.eq.ra, sunData.eq.dec)

  const topoDistKm = topocentricDistanceKm(moonData.range, moonHzGeo.altitudeDeg)
  const sdArcmin = topocentricSemiDiameterArcmin(topoDistKm)
  const wArcmin = crescentWidthArcmin(sdArcmin, arclDeg)

  const phase = moonModule.moonPhaseInfo(jde, sunData.eq, moonData.eq, moonData.range)

  return {
    jde,
    arcvGeoDeg,
    arcvTopoDeg,
    dazDeg,
    arclDeg,
    wArcmin,
    sdArcmin,
    moonAltGeoDeg: moonHzGeo.altitudeDeg,
    moonAltTopoDeg: moonHzTopo.altitudeDeg,
    moonAzTopoDeg: moonHzTopo.azimuthDeg,
    sunAltDeg: sunHz.altitudeDeg,
    sunAzDeg: sunHz.azimuthDeg,
    illuminatedFraction: phase.illuminatedFraction
  }
}

// =============================================================================================
// معيار يالوب (Yallop 1997)
// =============================================================================================

/** كثير الحدود التجريبي للحد الأدنى من ARCV اللازم للرؤية، دالةً في عرض الهلال W (دقائق قوسية).
 * نفس الصيغة للمعيارين، يختلفان فقط في الحد الثابت (انظر yallopQ/odehV) */
function arcvMinimumPoly (wArcmin, constantTerm) {
  const w = wArcmin
  return constantTerm - 6.3226 * w + 0.7319 * w * w - 0.1018 * w * w * w
}

/** معلمة يالوب q = (ARCV_جيومركزي − الحد الأدنى(W)) / ١٠ */
export function yallopQ (arcvGeoDeg, wArcmin) {
  return (arcvGeoDeg - arcvMinimumPoly(wArcmin, 11.8371)) / 10
}

const YALLOP_ZONES = [['A', 0.216], ['B', -0.014], ['C', -0.16], ['D', -0.232], ['E', -0.293]]

/** يصنّف قيمة q إلى منطقة يالوب (A أسهل رؤية .. F تحت حد دانجون) */
export function yallopZoneFromQ (q) {
  for (const [zone, minQ] of YALLOP_ZONES) {
    if (q > minQ) return zone
  }
  return 'F'
}

/** "مرئي" حسب يالوب: المنطقتان A أو B فقط (رؤية بالعين، ولو بشروط مثالية) - انظر شرح "يوم الفاتح" أعلاه */
export function yallopVisible (zone) {
  return zone === 'A' || zone === 'B'
}

// =============================================================================================
// معيار عودة (Odeh 2004/2006)
// =============================================================================================

/** معلمة عودة V = ARCV_طوبوغرافي − الحد الأدنى(W) (بلا قسمة على ١٠، بخلاف q) */
export function odehV (arcvTopoDeg, wArcmin) {
  return arcvTopoDeg - arcvMinimumPoly(wArcmin, 7.1651)
}

const ODEH_ZONES = [['A', 5.65], ['B', 2], ['C', -0.96]]

/** يصنّف قيمة V إلى منطقة عودة (A رؤية بالعين .. D لا تُرى حتى بمعونة بصرية) */
export function odehZoneFromV (v) {
  for (const [zone, minV] of ODEH_ZONES) {
    if (v >= minV) return zone
  }
  return 'D'
}

/** "مرئي" حسب عودة: المنطقتان A أو B فقط (رؤية بالعين، ولو بشروط ممتازة) - انظر شرح "يوم الفاتح" أعلاه */
export function odehVisible (zone) {
  return zone === 'A' || zone === 'B'
}

// =============================================================================================
// الوقت الأمثل (Tb) ولحظات المسح اليومي
// =============================================================================================

/** الوقت الأمثل الذي عُيِّر عليه كلا المعيارين تجريبيا: Tb = Ts + (4/9)(Tm−Ts) */
export function bestTimeDate (sunsetDate, moonsetDate) {
  if (!sunsetDate || !moonsetDate) return null
  const lagMs = moonsetDate.getTime() - sunsetDate.getTime()
  return new Date(sunsetDate.getTime() + (4 / 9) * lagMs)
}

/**
 * اللحظة الوصفية الكاملة (عند الغروب تحديدا): الأمور الستة المطلوبة كلها - العمر، المكث
 * (موعد غروب القمر ناقص موعد الغروب، دقائق)، الارتفاع، الاستطالة (ARCL)، نسبة النور، وفرق
 * السمت ("المطال").
 */
function fullSnapshotData (utcDate, latDeg, lonEastDeg, conjJde, moonsetDate) {
  const geom = crescentGeometryAtUTC(utcDate, latDeg, lonEastDeg)
  return {
    utcDate,
    ageHours: (geom.jde - conjJde) * 24,
    lagMinutes: moonsetDate ? (moonsetDate.getTime() - utcDate.getTime()) / 60000 : null,
    moonAltitudeDeg: geom.moonAltTopoDeg,
    elongationDeg: geom.arclDeg,
    illuminatedFraction: geom.illuminatedFraction,
    dazDeg: geom.dazDeg
  }
}

/**
 * اللحظة الوصفية المصغَّرة (عند كون الشمس ٥° تحت الأفق): تصحيح من المستخدم - لا حاجة لإعادة
 * الأمور الستة هنا، بل يكفي ارتفاع *القمر* (طوبوغرافيا بلا انكسار) واستطالته عند هذه اللحظة
 * الثانية تحديدا؛ وقت هذه اللحظة نفسه (sun5Date) يُعرض في نتيجة اليوم كقيمة مستقلة بصرف النظر.
 */
function reducedSnapshotData (utcDate, latDeg, lonEastDeg) {
  const geom = crescentGeometryAtUTC(utcDate, latDeg, lonEastDeg)
  return {
    utcDate,
    moonAltitudeDeg: geom.moonAltTopoDeg,
    elongationDeg: geom.arclDeg
  }
}

/**
 * نتيجة يوم واحد من المسح: الغروب والشروق القمري والشمس-٥° والوقت الأمثل، اللحظتان الوصفيتان
 * (الغروب، الشمس-٥°)، ونتيجتا يالوب وعودة (عند الوقت الأمثل فقط).
 * @returns {status:'ok'|'noSunset'|'noMoonLag', ...}
 */
export function crescentSurveyDay (localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg, conjJde) {
  const sunRTS = sunModule.sunRiseTransitSet(localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg)
  if (sunRTS.status !== 'ok' || !sunRTS.setDate) {
    return {
      status: 'noSunset',
      sunsetDate: null,
      moonsetDate: null,
      sun5Date: null,
      bestTime: null,
      snapshots: { sunset: null, sunMinus5: null },
      yallop: null,
      odeh: null,
      bothVisible: false
    }
  }
  const sunsetDate = sunRTS.setDate

  const moonRTS = moonModule.moonRiseTransitSet(localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg)
  const moonsetDateRaw = (moonRTS.status === 'ok') ? moonRTS.setDate : null
  // لا معنى لمكث بعد الغروب إن غرب القمر قبل الشمس أو معها (لا نافذة رصد تلك الليلة أصلا)
  const moonsetDate = (moonsetDateRaw && moonsetDateRaw.getTime() > sunsetDate.getTime()) ? moonsetDateRaw : null

  const sun5 = sunModule.sunAngleCrossing(localYear, localMonth, localDay, observerTime, latDeg, lonEastDeg, -5)
  const sun5Date = (sun5.status === 'ok' && sun5.setDate) ? sun5.setDate : null

  const status = moonsetDate ? 'ok' : 'noMoonLag'
  const bestTime = moonsetDate ? bestTimeDate(sunsetDate, moonsetDate) : null

  const snapAtSunset = fullSnapshotData(sunsetDate, latDeg, lonEastDeg, conjJde, moonsetDate)
  const snapAtSun5 = sun5Date ? reducedSnapshotData(sun5Date, latDeg, lonEastDeg) : null

  let yallop = null
  let odeh = null
  if (bestTime) {
    const bestGeom = crescentGeometryAtUTC(bestTime, latDeg, lonEastDeg)
    const q = yallopQ(bestGeom.arcvGeoDeg, bestGeom.wArcmin)
    const yZone = yallopZoneFromQ(q)
    yallop = { q, zone: yZone, visible: yallopVisible(yZone), arcvDeg: bestGeom.arcvGeoDeg, wArcmin: bestGeom.wArcmin }

    const v = odehV(bestGeom.arcvTopoDeg, bestGeom.wArcmin)
    const oZone = odehZoneFromV(v)
    odeh = { v, zone: oZone, visible: odehVisible(oZone), arcvDeg: bestGeom.arcvTopoDeg, wArcmin: bestGeom.wArcmin }
  }

  return {
    status,
    sunsetDate,
    moonsetDate,
    sun5Date,
    bestTime,
    snapshots: { sunset: snapAtSunset, sunMinus5: snapAtSun5 },
    yallop,
    odeh,
    bothVisible: !!(yallop && odeh && yallop.visible && odeh.visible)
  }
}

// =============================================================================================
// المسح الكامل: من مساء الاقتران إلى ثلاثة أيام بعد يوم الرؤية
// =============================================================================================

/** عدد أقصى لأيام البحث عن "يوم الرؤية" قبل التوقف - سخي جدا عمليا (الهلال يصبح مرئيا حسب
 * كلا المعيارين عادة في اليوم الأول أو الثاني بعد الاقتران، نادرا الثالث؛ هامش أمان واسع
 * للحالات الجغرافية الشاذة كخطوط العرض العالية في فصول معيّنة) */
const MAX_SEARCH_DAYS = 10

/**
 * يُجري المسح الكامل لتحري الهلال حول أقرب اقتران جيومركزي لـnowUtc، عند موقع مراقب معيّن.
 * @param {{latDeg:number, lonEastDeg:number, observerTime:object}} location
 * @param {Date} [nowUtc]
 */
export function crescentSurvey (location, nowUtc = new Date()) {
  const { latDeg, lonEastDeg, observerTime } = location
  const jdeNow = julian.DateToJDE(nowUtc)

  const prevNM = moonModule.previousNewMoonBeforeOrAt(jdeNow)
  const nextNM = moonModule.nextNewMoonAfter(jdeNow)
  const conjJde = (Math.abs(jdeNow - prevNM) <= Math.abs(nextNM - jdeNow)) ? prevNM : nextNM

  const conjUTCDate = julian.JDEToDate(conjJde)
  const conjLocal = timeutilModule.localPartsFromUTC(conjUTCDate, observerTime)
  const conjLocalJDN = hijriModule.civilJDNFromGregorian(conjLocal.year, conjLocal.month, conjLocal.day)

  // يوم بداية المسح: أول غروب محلي يلي الاقتران فعليا (نفس قاعدة "اقتران+غروب" الفلكية في hijri.js) -
  // إن وقع الاقتران قبل غروب يومه المحلي فهذا اليوم نفسه بداية المسح، وإلا فاليوم التالي له.
  const sunsetOnConjDay = sunModule.sunRiseTransitSet(conjLocal.year, conjLocal.month, conjLocal.day, observerTime, latDeg, lonEastDeg)
  let startJDN = conjLocalJDN
  if (sunsetOnConjDay.status === 'ok' && sunsetOnConjDay.setDate && conjUTCDate.getTime() > sunsetOnConjDay.setDate.getTime()) {
    startJDN = conjLocalJDN + 1
  }

  const days = []
  let sightingIndex = -1

  for (let i = 0; i < MAX_SEARCH_DAYS && sightingIndex === -1; i++) {
    const jdn = startJDN + i
    const g = hijriModule.gregorianFromCivilJDN(jdn)
    const dayResult = crescentSurveyDay(g.year, g.month, g.day, observerTime, latDeg, lonEastDeg, conjJde)
    days.push({ civilJDN: jdn, gregorian: g, isFrozenRepeat: false, ...dayResult })
    if (dayResult.bothVisible) sightingIndex = i
  }

  const fatihDetermined = sightingIndex !== -1

  // تكرار بيانات يوم الرؤية حرفيا (لا إعادة حساب) في الأيام الثلاثة التالية له مباشرة - طلب المستخدم
  if (fatihDetermined) {
    const sightingDay = days[sightingIndex]
    for (let k = 1; k <= 3; k++) {
      const jdn = sightingDay.civilJDN + k
      const g = hijriModule.gregorianFromCivilJDN(jdn)
      days.push({ ...sightingDay, civilJDN: jdn, gregorian: g, isFrozenRepeat: true })
    }
  }

  const fatihJDN = fatihDetermined ? (days[sightingIndex].civilJDN + 1) : null
  const fatihGregorian = fatihJDN !== null ? hijriModule.gregorianFromCivilJDN(fatihJDN) : null

  return {
    conjunction: { jde: conjJde, utcDate: conjUTCDate, local: conjLocal },
    startJDN,
    days,
    sightingDayIndex: sightingIndex,
    fatihDetermined,
    fatihJDN,
    fatihGregorian
  }
}

export default {
  topocentricDistanceKm,
  topocentricSemiDiameterArcmin,
  crescentWidthArcmin,
  crescentGeometryAtUTC,
  yallopQ,
  yallopZoneFromQ,
  yallopVisible,
  odehV,
  odehZoneFromV,
  odehVisible,
  bestTimeDate,
  crescentSurveyDay,
  crescentSurvey
}
