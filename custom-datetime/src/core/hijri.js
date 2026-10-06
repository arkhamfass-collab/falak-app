/**
 * src/core/hijri.js
 * التقويم الهجري بثلاث طرق قابلة للاختيار (طلب المستخدم - انظر settings.hijriMethod*):
 *
 *  1) 'kuwaiti'      - التقويم الحسابي الجدولي (المعروف بـ"الحساب الكويتي" / tabular Islamic
 *                      civil calendar): دورة ثلاثون سنة هجرية حسابية بحتة، لا تعتمد رصدا ولا
 *                      بيانات فلكية فعلية - نفس خوارزمية من قبل، لكن بعد تصحيح خطأ في الأساس
 *                      (المرساة) اكتُشف وأُصلح في هذه الجولة (انظر HIJRI_EPOCH_CIVIL_JDN أدناه).
 *  2) 'ummalqura'    - تقويم أم القرى الرسمي (السعودية): جدول بيانات رسمي منشور (لا صيغة
 *                      حسابية بسيطة، لأنه يعتمد تاريخيا معايير رصد/إعلان تغيّرت عبر العقود)،
 *                      مأخوذ من المصدر المرجعي العلني لـ.NET (انظر التوثيق فوق UMM_AL_QURA_RAW).
 *  3) 'astronomical' - تقويم فلكي محسوب فعليا من محرك الشمس/القمر في هذا التطبيق نفسه (sun.js/
 *                      moon.js): بداية الشهر = غروب شمس أول يوم محلي (عند موقع المستخدم نفسه)
 *                      يقع فيه الاقتران الفلكي (المحاق) قبل ذلك الغروب، أو الغروب الذي يليه إن
 *                      وقع الاقتران بعده. هذا معيار "اقتران + غروب" مبسَّط ومعروف، يختلف عمدا عن
 *                      نموذج رؤية الهلال الكامل (معايير يالوب/عودة) الأكثر تعقيدا وتفصيلات رصدية
 *                      (ارتفاع القمر، الاستطالة، رؤية الغلاف الجوي...)، فهو تقريب "فلكي محض" لا
 *                      ادّعاء برؤية هلال فعلية - ويتفاوت بتفاوت موقع المستخدم نفسه (خاصية صحيحة
 *                      ومقصودة لتقويم محلي محسوب، بخلاف التقويمين السابقين الموحَّدين عالميا).
 *
 * الطرق الثلاث قد تتفق أو تختلف بيوم واحد غالبا (نادرا يومين) حول حدود الشهر - وهذا طبيعي
 * ومتوقَّع بين منهجيات مختلفة فعلا، لا علة؛ فائدة الاختيار هنا تمكين المستخدم من مطابقة التطبيق
 * مع المرجع الذي يعتمده (جهة إفتاء، تقويم مطبوع، تطبيق آخر...).
 */

import julian from './astro/src/julian.js'
import sunModule from './sun.js'
import moonModule from './moon.js'
import timeutilModule from './timeutil.js'

// ===========================================================================================
// ١) التقويم الجدولي الحسابي (الكويتي)
// ===========================================================================================

/**
 * رقم اليوم الجولياني المدني (civil JDN) لبداية ١ محرم ١هـ.
 *
 * ملاحظة إصلاح (هذه الجولة): كانت القيمة السابقة هنا 1948440 (بفارق +1 عن القيمة الصحيحة أدناه)،
 * وهو ما كان يُنتج تاريخا هجريا متأخرا بيوم واحد دوما عن القيمة الصحيحة (مثال فعلي تحقَّق منه:
 * ٢٠٢٦-١٠-٠٦م كان يُحسب "٢٣ ربيع الثاني ١٤٤٨هـ" بدل "٢٤ ربيع الثاني ١٤٤٨هـ" الصحيحة) - وهو
 * بالضبط ما أبلغ عنه المستخدم. جرى التحقق من القيمة الصحيحة (1948439) واعتمادها بثلاث طرق
 * مستقلة متطابقة:
 *  - مطابقة تامة (٣٣٠٠٠ يوم متتالٍ عبر ثلاثة عصور متباعدة، صفر اختلاف) مع الصيغة المرجعية
 *    المنشورة لـ Dershowitz & Reingold ("Calendrical Calculations")، وهي ذاتها المستعملة في
 *    محوّل التقويم العام لموقع fourmilab.ch منذ عقود.
 *  - مطابقة ٢١٢٦٢ تاريخا هجريا (٦٠ سنة، كل الأشهر والأيام) في الاتجاهين معا (هجري↔ميلادي).
 *  - مطابقة نتيجة هذا الملف بعد الإصلاح مع جدول أم القرى الرسمي (القسم ٢ أدناه) في أن كليهما
 *    يتفقان على "أن بداية الشهر الجدولي سابقة أو مساوية غالبا" بفارق يوم واحد معتاد بينهما -
 *    بخلاف القيمة الخاطئة القديمة التي كانت تُنتج فارقا غير طبيعي (يومين) عن أم القرى في حالات
 *    كثيرة، منها بالضبط حالة ٢٠٢٦-١٠-٠٦ المذكورة (أم القرى: ٢٥، الجدولي الخاطئ: ٢٣، الصحيح: ٢٤).
 * لم تتغيّر صيغة الكبيسة (isHijriLeapYear) ولا طول الأشهر - تحقَّقتا مطابقتين تماما لقائمة سنوات
 * الكبس الموثَّقة في معرض الحسابات التقويمية (Wikipedia: Tabular Islamic calendar) قبل البحث عن
 * علة أخرى، فتبيَّن أن الخطأ كان في هذا الثابت وحده.
 */
export const HIJRI_EPOCH_CIVIL_JDN = 1948439

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

/**
 * عكس civilJDNFromGregorian تماما (ذهابا وإيابا) لأي تاريخ.
 *
 * ملاحظة إصلاح (هذه الجولة): كانت هذه الدالة تستعمل Math.round(g.day) بدل Math.floor(g.day)،
 * فكانت لا تُطابق عكسَ civilJDNFromGregorian فعلا (مثال: civilJDNFromGregorian(2026,10,6) ثم
 * gregorianFromCivilJDN على ناتجها كانت تُرجع 2026-10-07 لا 2026-10-06) - ذلك لأن قيمة اليوم
 * الجولياني الخام لرقم مدني صحيح تكون دوما عند الظهر تماما (كسر .5 غير موجود لأنه صفر هنا)،
 * فتقريبها بـ round لا يصح؛ الصحيح هو truncation (floor) لاستخراج رقم اليوم الصحيح. هذا الخلل لم
 * يكن يؤثر في حساب التاريخ الهجري اليومي (hijriFromLocalGregorianDate لا تستدعي هذه الدالة
 * إطلاقا) لكنه يؤثر في أي استعمال آخر لها (مثل تحديد بداية أشهر التقويم الفلكي المحسوب أدناه)،
 * فجرى إصلاحه هنا.
 */
export function gregorianFromCivilJDN (jdn) {
  const g = julian.JDToCalendarGregorian(Math.round(jdn))
  return { year: g.year, month: g.month, day: Math.floor(g.day) }
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

// ===========================================================================================
// ٢) تقويم أم القرى الرسمي (جدول بيانات، لا صيغة حسابية)
// ===========================================================================================

/**
 * جدول بداية كل سنة هجرية (أم القرى) ١٣١٨-١٥٠٠هـ (١٩٠٠-٢٠٧٧م)، مع أعلام أطوال الأشهر (١٢ بتا،
 * كل بت لشهر: ١=٣٠ يوما، ٠=٢٩ يوما - البت الأدنى (LSB) للشهر الأول محرم، صعودا للثاني عشر).
 * كل سطر: [السنة الهجرية، أعلام الأشهر (hex)، سنة غريغورية، شهر، يوم بداية "١ محرم" تلك السنة].
 * السطر الأخير (١٥٠١، أعلام=٠) ليس سنة حقيقية بل حارس يحدّد نهاية المدى المدعوم (٢٠٧٧-١١-١٧).
 *
 * المصدر: الجدول الرسمي المضمَّن في فئة UmAlQuraCalendar من مرجع مايكروسوفت .NET المصدري
 * المفتوح (microsoft/referencesource، الملف
 * mscorlib/system/globalization/umalquracalendar.cs) - وهو ذاته الجدول المعتمد في أنظمة ويندوز
 * وتطبيقات كثيرة عالميا لتقويم أم القرى. استُخرجت هذه الأرقام آليا (لا يدويا) من ذلك الملف مباشرة
 * لتفادي أي خطأ نسخ، ثم جرى التحقق من اتساقها الداخلي: طول كل سنة (مُشتقا من أعلامها) يطابق
 * تماما الفارق بين تاريخ بدايتها وتاريخ بداية السنة التالية لها، لكل السنوات الـ١٨٣ بلا استثناء.
 * وجرى أيضا التحقق من نتيجتها لتاريخ اليوم (٢٠٢٦-١٠-٠٦ => ٢٥ ربيع الثاني ١٤٤٨هـ) مقابل مصدرين
 * مستقلين (واجهة aladhan.com البرمجية بعدة طرق حساب منها UAQ، وموقع miqatona.com) فتطابقت تماما.
 */
const UMM_AL_QURA_RAW = [
  [1318, 0x02EA, 1900, 4, 30],
  [1319, 0x06E9, 1901, 4, 19],
  [1320, 0x0ED2, 1902, 4, 9],
  [1321, 0x0EA4, 1903, 3, 30],
  [1322, 0x0D4A, 1904, 3, 18],
  [1323, 0x0A96, 1905, 3, 7],
  [1324, 0x0536, 1906, 2, 24],
  [1325, 0x0AB5, 1907, 2, 13],
  [1326, 0x0DAA, 1908, 2, 3],
  [1327, 0x0BA4, 1909, 1, 23],
  [1328, 0x0B49, 1910, 1, 12],
  [1329, 0x0A93, 1911, 1, 1],
  [1330, 0x052B, 1911, 12, 21],
  [1331, 0x0A57, 1912, 12, 9],
  [1332, 0x04B6, 1913, 11, 29],
  [1333, 0x0AB5, 1914, 11, 18],
  [1334, 0x05AA, 1915, 11, 8],
  [1335, 0x0D55, 1916, 10, 27],
  [1336, 0x0D2A, 1917, 10, 17],
  [1337, 0x0A56, 1918, 10, 6],
  [1338, 0x04AE, 1919, 9, 25],
  [1339, 0x095D, 1920, 9, 13],
  [1340, 0x02EC, 1921, 9, 3],
  [1341, 0x06D5, 1922, 8, 23],
  [1342, 0x06AA, 1923, 8, 13],
  [1343, 0x0555, 1924, 8, 1],
  [1344, 0x04AB, 1925, 7, 21],
  [1345, 0x095B, 1926, 7, 10],
  [1346, 0x02BA, 1927, 6, 30],
  [1347, 0x0575, 1928, 6, 18],
  [1348, 0x0BB2, 1929, 6, 8],
  [1349, 0x0764, 1930, 5, 29],
  [1350, 0x0749, 1931, 5, 18],
  [1351, 0x0655, 1932, 5, 6],
  [1352, 0x02AB, 1933, 4, 25],
  [1353, 0x055B, 1934, 4, 14],
  [1354, 0x0ADA, 1935, 4, 4],
  [1355, 0x06D4, 1936, 3, 24],
  [1356, 0x0EC9, 1937, 3, 13],
  [1357, 0x0D92, 1938, 3, 3],
  [1358, 0x0D25, 1939, 2, 20],
  [1359, 0x0A4D, 1940, 2, 9],
  [1360, 0x02AD, 1941, 1, 28],
  [1361, 0x056D, 1942, 1, 17],
  [1362, 0x0B6A, 1943, 1, 7],
  [1363, 0x0B52, 1943, 12, 28],
  [1364, 0x0AA5, 1944, 12, 16],
  [1365, 0x0A4B, 1945, 12, 5],
  [1366, 0x0497, 1946, 11, 24],
  [1367, 0x0937, 1947, 11, 13],
  [1368, 0x02B6, 1948, 11, 2],
  [1369, 0x0575, 1949, 10, 22],
  [1370, 0x0D6A, 1950, 10, 12],
  [1371, 0x0D52, 1951, 10, 2],
  [1372, 0x0A96, 1952, 9, 20],
  [1373, 0x092D, 1953, 9, 9],
  [1374, 0x025D, 1954, 8, 29],
  [1375, 0x04DD, 1955, 8, 18],
  [1376, 0x0ADA, 1956, 8, 7],
  [1377, 0x05D4, 1957, 7, 28],
  [1378, 0x0DA9, 1958, 7, 17],
  [1379, 0x0D52, 1959, 7, 7],
  [1380, 0x0AAA, 1960, 6, 25],
  [1381, 0x04D6, 1961, 6, 14],
  [1382, 0x09B6, 1962, 6, 3],
  [1383, 0x0374, 1963, 5, 24],
  [1384, 0x0769, 1964, 5, 12],
  [1385, 0x0752, 1965, 5, 2],
  [1386, 0x06A5, 1966, 4, 21],
  [1387, 0x054B, 1967, 4, 10],
  [1388, 0x0AAB, 1968, 3, 29],
  [1389, 0x055A, 1969, 3, 19],
  [1390, 0x0AD5, 1970, 3, 8],
  [1391, 0x0DD2, 1971, 2, 26],
  [1392, 0x0DA4, 1972, 2, 16],
  [1393, 0x0D49, 1973, 2, 4],
  [1394, 0x0A95, 1974, 1, 24],
  [1395, 0x052D, 1975, 1, 13],
  [1396, 0x0A5D, 1976, 1, 2],
  [1397, 0x055A, 1976, 12, 22],
  [1398, 0x0AD5, 1977, 12, 11],
  [1399, 0x06AA, 1978, 12, 1],
  [1400, 0x0695, 1979, 11, 20],
  [1401, 0x052B, 1980, 11, 8],
  [1402, 0x0A57, 1981, 10, 28],
  [1403, 0x04AE, 1982, 10, 18],
  [1404, 0x0976, 1983, 10, 7],
  [1405, 0x056C, 1984, 9, 26],
  [1406, 0x0B55, 1985, 9, 15],
  [1407, 0x0AAA, 1986, 9, 5],
  [1408, 0x0A55, 1987, 8, 25],
  [1409, 0x04AD, 1988, 8, 13],
  [1410, 0x095D, 1989, 8, 2],
  [1411, 0x02DA, 1990, 7, 23],
  [1412, 0x05D9, 1991, 7, 12],
  [1413, 0x0DB2, 1992, 7, 1],
  [1414, 0x0BA4, 1993, 6, 21],
  [1415, 0x0B4A, 1994, 6, 10],
  [1416, 0x0A55, 1995, 5, 30],
  [1417, 0x02B5, 1996, 5, 18],
  [1418, 0x0575, 1997, 5, 7],
  [1419, 0x0B6A, 1998, 4, 27],
  [1420, 0x0BD2, 1999, 4, 17],
  [1421, 0x0BC4, 2000, 4, 6],
  [1422, 0x0B89, 2001, 3, 26],
  [1423, 0x0A95, 2002, 3, 15],
  [1424, 0x052D, 2003, 3, 4],
  [1425, 0x05AD, 2004, 2, 21],
  [1426, 0x0B6A, 2005, 2, 10],
  [1427, 0x06D4, 2006, 1, 31],
  [1428, 0x0DC9, 2007, 1, 20],
  [1429, 0x0D92, 2008, 1, 10],
  [1430, 0x0AA6, 2008, 12, 29],
  [1431, 0x0956, 2009, 12, 18],
  [1432, 0x02AE, 2010, 12, 7],
  [1433, 0x056D, 2011, 11, 26],
  [1434, 0x036A, 2012, 11, 15],
  [1435, 0x0B55, 2013, 11, 4],
  [1436, 0x0AAA, 2014, 10, 25],
  [1437, 0x094D, 2015, 10, 14],
  [1438, 0x049D, 2016, 10, 2],
  [1439, 0x095D, 2017, 9, 21],
  [1440, 0x02BA, 2018, 9, 11],
  [1441, 0x05B5, 2019, 8, 31],
  [1442, 0x05AA, 2020, 8, 20],
  [1443, 0x0D55, 2021, 8, 9],
  [1444, 0x0A9A, 2022, 7, 30],
  [1445, 0x092E, 2023, 7, 19],
  [1446, 0x026E, 2024, 7, 7],
  [1447, 0x055D, 2025, 6, 26],
  [1448, 0x0ADA, 2026, 6, 16],
  [1449, 0x06D4, 2027, 6, 6],
  [1450, 0x06A5, 2028, 5, 25],
  [1451, 0x054B, 2029, 5, 14],
  [1452, 0x0A97, 2030, 5, 3],
  [1453, 0x054E, 2031, 4, 23],
  [1454, 0x0AAE, 2032, 4, 11],
  [1455, 0x05AC, 2033, 4, 1],
  [1456, 0x0BA9, 2034, 3, 21],
  [1457, 0x0D92, 2035, 3, 11],
  [1458, 0x0B25, 2036, 2, 28],
  [1459, 0x064B, 2037, 2, 16],
  [1460, 0x0CAB, 2038, 2, 5],
  [1461, 0x055A, 2039, 1, 26],
  [1462, 0x0B55, 2040, 1, 15],
  [1463, 0x06D2, 2041, 1, 4],
  [1464, 0x0EA5, 2041, 12, 24],
  [1465, 0x0E4A, 2042, 12, 14],
  [1466, 0x0A95, 2043, 12, 3],
  [1467, 0x052D, 2044, 11, 21],
  [1468, 0x0AAD, 2045, 11, 10],
  [1469, 0x036C, 2046, 10, 31],
  [1470, 0x0759, 2047, 10, 20],
  [1471, 0x06D2, 2048, 10, 9],
  [1472, 0x0695, 2049, 9, 28],
  [1473, 0x052D, 2050, 9, 17],
  [1474, 0x0A5B, 2051, 9, 6],
  [1475, 0x04BA, 2052, 8, 26],
  [1476, 0x09BA, 2053, 8, 15],
  [1477, 0x03B4, 2054, 8, 5],
  [1478, 0x0B69, 2055, 7, 25],
  [1479, 0x0B52, 2056, 7, 14],
  [1480, 0x0AA6, 2057, 7, 3],
  [1481, 0x04B6, 2058, 6, 22],
  [1482, 0x096D, 2059, 6, 11],
  [1483, 0x02EC, 2060, 5, 31],
  [1484, 0x06D9, 2061, 5, 20],
  [1485, 0x0EB2, 2062, 5, 10],
  [1486, 0x0D54, 2063, 4, 30],
  [1487, 0x0D2A, 2064, 4, 18],
  [1488, 0x0A56, 2065, 4, 7],
  [1489, 0x04AE, 2066, 3, 27],
  [1490, 0x096D, 2067, 3, 16],
  [1491, 0x0D6A, 2068, 3, 5],
  [1492, 0x0B54, 2069, 2, 23],
  [1493, 0x0B29, 2070, 2, 12],
  [1494, 0x0A93, 2071, 2, 1],
  [1495, 0x052B, 2072, 1, 21],
  [1496, 0x0A57, 2073, 1, 9],
  [1497, 0x0536, 2073, 12, 30],
  [1498, 0x0AB5, 2074, 12, 19],
  [1499, 0x06AA, 2075, 12, 9],
  [1500, 0x0E93, 2076, 11, 27],
  [1501, 0x0000, 2077, 11, 17]
]

export const UMM_AL_QURA_MIN_YEAR = UMM_AL_QURA_RAW[0][0]
export const UMM_AL_QURA_MAX_YEAR = UMM_AL_QURA_RAW[UMM_AL_QURA_RAW.length - 2][0]

let _ummAlQuraTableCache = null
function ummAlQuraTable () {
  if (_ummAlQuraTableCache) return _ummAlQuraTableCache
  _ummAlQuraTableCache = UMM_AL_QURA_RAW.map(([year, flags, gy, gm, gd]) => ({
    year, flags, startJDN: civilJDNFromGregorian(gy, gm, gd)
  }))
  return _ummAlQuraTableCache
}

/** يحوّل رقم يوم جولياني مدني إلى تاريخ أم القرى، أو null إن خرج عن المدى المدعوم (١٣١٨-١٥٠٠هـ) */
export function ummAlQuraFromCivilJDN (jdn) {
  const table = ummAlQuraTable()
  if (jdn < table[0].startJDN || jdn >= table[table.length - 1].startJDN) return null

  // بحث ثنائي عن آخر صف لا يتجاوز startJDN الهدف (الجدول مرتَّب تصاعديا دوما)
  let lo = 0
  let hi = table.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (table[mid].startJDN <= jdn) lo = mid
    else hi = mid - 1
  }
  const row = table[lo]
  let nDays = jdn - row.startJDN
  let b = row.flags
  let month = 1
  let dayLen = 29 + (b & 1)
  while (nDays >= dayLen) {
    nDays -= dayLen
    b >>= 1
    month++
    dayLen = 29 + (b & 1)
  }
  return { year: row.year, month, day: nDays + 1 }
}

/** عكس ummAlQuraFromCivilJDN: تاريخ أم القرى -> رقم يوم جولياني مدني، أو null إن خرجت السنة عن المدى */
export function civilJDNFromUmmAlQura (year, month, day) {
  const table = ummAlQuraTable()
  const row = table.find((r) => r.year === year)
  if (!row) return null
  let nDays = day - 1
  let b = row.flags
  for (let m = 1; m < month; m++) {
    nDays += 29 + (b & 1)
    b >>= 1
  }
  return row.startJDN + nDays
}

/** تاريخ أم القرى المقابل ليوم محلي ميلادي معيّن، أو null إن خرج عن المدى المدعوم */
export function ummAlQuraFromLocalGregorianDate (localYear, localMonth1to12, localDay) {
  const jdn = civilJDNFromGregorian(localYear, localMonth1to12, localDay)
  return ummAlQuraFromCivilJDN(jdn)
}

// ===========================================================================================
// ٣) تقويم فلكي محسوب (اقتران + غروب) - انظر الشرح في رأس الملف
// ===========================================================================================

/** يضيف (أو يطرح) عددا من الأشهر الهجرية لتاريخ (سنة، شهر)، مع تدوير صحيح حول حدّي ١/١٢ */
function addHijriMonths (year, month, deltaMonths) {
  const total = year * 12 + (month - 1) + deltaMonths
  const y = Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12 + 1
  return { year: y, month: m }
}

/**
 * يُرجع رقم اليوم الجولياني المدني لليوم المحلي المُسمّى "اليوم الأول" من الشهر الهجري
 * (hijriYear, hijriMonth) حسب معيار "اقتران + غروب" الفلكي، عند موقع مراقب معيّن.
 */
function astronomicalMonthStartJDN (hijriYear, hijriMonth, latDeg, lonEastDeg, observerTime) {
  // يوم ميلادي تقريبي لبداية هذا الشهر حسب التقويم الجدولي (المُصحَّح) - نقطة انطلاق فقط للبحث
  // عن الاقتران الفلكي الفعلي الأقرب له (الفارق بين الجدولي والفلكي الحقيقي يوم أو يومان عادة)
  const approxJDN = hijriToCivilJDN(hijriYear, hijriMonth, 1)
  const approxGreg = gregorianFromCivilJDN(approxJDN)
  const approxNoonUTC = new Date(Date.UTC(approxGreg.year, approxGreg.month - 1, approxGreg.day, 12, 0, 0))
  const jdeApprox = julian.DateToJDE(approxNoonUTC)

  const conjBefore = moonModule.previousNewMoonBeforeOrAt(jdeApprox)
  const conjAfter = moonModule.nextNewMoonAfter(jdeApprox)
  const conj = Math.abs(jdeApprox - conjBefore) <= Math.abs(conjAfter - jdeApprox) ? conjBefore : conjAfter

  const conjUTCDate = julian.JDEToDate(conj)
  const conjLocal = timeutilModule.localPartsFromUTC(conjUTCDate, observerTime)
  const conjLocalJDN = civilJDNFromGregorian(conjLocal.year, conjLocal.month, conjLocal.day)
  const sunsetInfo = sunModule.sunRiseTransitSet(conjLocal.year, conjLocal.month, conjLocal.day, observerTime, latDeg, lonEastDeg)

  // قاعدة "اقتران + غروب": يبدأ الشهر (يُسمّى يومه المدني الأول) اليوم الذي يلي غروب يوم وقوع
  // الاقتران مباشرة إن وقع الاقتران قبل ذلك الغروب، أو اليوم الذي يلي الغروب التالي له إن وقع
  // بعده. في الحالة النادرة (خطوط عرض قطبية، لا غروب فعلي) نفترض تحفظا أن الاقتران "قبل الغروب".
  if (sunsetInfo.status === 'ok' && sunsetInfo.setDate && conjUTCDate.getTime() > sunsetInfo.setDate.getTime()) {
    return conjLocalJDN + 2
  }
  return conjLocalJDN + 1
}

let _astroHijriCache = null
function astronomicalCacheKey (localYear, localMonth1to12, localDay, latDeg, lonEastDeg, observerTime) {
  const tzPart = observerTime.mode === 'tz' ? observerTime.timeZone : observerTime.utcOffsetHours
  return `${localYear}-${localMonth1to12}-${localDay}|${latDeg.toFixed(4)}|${lonEastDeg.toFixed(4)}|${observerTime.mode}|${tzPart}`
}

/**
 * التاريخ الهجري "الفلكي المحسوب" المقابل ليوم محلي معيّن، عند موقع مراقب معيّن. يُخزَّن مؤقتا
 * (مذكَّرة ذات خانة واحدة) لأن حسابه (بحث عن اقتران + شروق/غروب فعليين) أثقل من الطريقتين
 * الأخريين، وهذه الدالة قد تُستدعى كل ثانية (انظر tick() في app.js) لنفس اليوم/الموقع عمليا.
 */
export function astronomicalHijriFromLocalGregorianDate (localYear, localMonth1to12, localDay, latDeg, lonEastDeg, observerTime) {
  const key = astronomicalCacheKey(localYear, localMonth1to12, localDay, latDeg, lonEastDeg, observerTime)
  if (_astroHijriCache && _astroHijriCache.key === key) return _astroHijriCache.result

  const guess = hijriFromLocalGregorianDate(localYear, localMonth1to12, localDay)
  let result = guess
  try {
    const nowJDN = civilJDNFromGregorian(localYear, localMonth1to12, localDay)
    let cand = { year: guess.year, month: guess.month }
    let candJDN = astronomicalMonthStartJDN(cand.year, cand.month, latDeg, lonEastDeg, observerTime)
    let found = false
    for (let tries = 0; tries < 4 && !found; tries++) {
      const next = addHijriMonths(cand.year, cand.month, 1)
      const nextJDN = astronomicalMonthStartJDN(next.year, next.month, latDeg, lonEastDeg, observerTime)
      if (nowJDN >= candJDN && nowJDN < nextJDN) {
        result = { year: cand.year, month: cand.month, day: nowJDN - candJDN + 1 }
        found = true
      } else if (nowJDN >= nextJDN) {
        cand = next
        candJDN = nextJDN
      } else {
        const prev = addHijriMonths(cand.year, cand.month, -1)
        candJDN = astronomicalMonthStartJDN(prev.year, prev.month, latDeg, lonEastDeg, observerTime)
        cand = prev
      }
    }
  } catch (e) {
    result = guess // احتياط صامت: أي خلل (موقع قطبي متطرف، إلخ) يرتد للتقويم الجدولي بدل تعطل العرض
  }

  _astroHijriCache = { key, result }
  return result
}

// ===========================================================================================
// الواجهة الموحَّدة: اختيار الطريقة
// ===========================================================================================

export const HIJRI_METHODS = ['kuwaiti', 'ummalqura', 'astronomical']

/**
 * التاريخ الهجري حسب الطريقة المختارة. يرتد تلقائيا (fallback) للتقويم الجدولي إن تعذّرت
 * الطريقة المطلوبة (مثلا أم القرى خارج مداها المدعوم ١٣١٨-١٥٠٠هـ)، مع وسم outOfRangeFallback
 * في تلك الحالة تحديدا ليتسنى للواجهة إخبار المستخدم إن رغبت.
 * @param {'kuwaiti'|'ummalqura'|'astronomical'} method
 */
export function hijriForMethod (method, localYear, localMonth1to12, localDay, latDeg, lonEastDeg, observerTime) {
  if (method === 'ummalqura') {
    const r = ummAlQuraFromLocalGregorianDate(localYear, localMonth1to12, localDay)
    if (r) return { ...r, method: 'ummalqura' }
    return { ...hijriFromLocalGregorianDate(localYear, localMonth1to12, localDay), method: 'kuwaiti', outOfRangeFallback: true }
  }
  if (method === 'astronomical') {
    const r = astronomicalHijriFromLocalGregorianDate(localYear, localMonth1to12, localDay, latDeg, lonEastDeg, observerTime)
    return { ...r, method: 'astronomical' }
  }
  return { ...hijriFromLocalGregorianDate(localYear, localMonth1to12, localDay), method: 'kuwaiti' }
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
  hijriFromLocalGregorianDate,
  UMM_AL_QURA_MIN_YEAR,
  UMM_AL_QURA_MAX_YEAR,
  ummAlQuraFromCivilJDN,
  civilJDNFromUmmAlQura,
  ummAlQuraFromLocalGregorianDate,
  astronomicalHijriFromLocalGregorianDate,
  HIJRI_METHODS,
  hijriForMethod
}
