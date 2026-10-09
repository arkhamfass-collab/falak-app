/**
 * src/ui/app.js
 * نقطة انطلاق الواجهة: الحالة (اللغة، الموقع، إعدادات الصلاة، القراءة الآلية)، حفظها محليا،
 * حلقة التحديث الثانية، تبديل التبويبات، نافذة الإعدادات، وربط القارئ الصوتي.
 */
import engine from '../core/engine.js'
import timeutil from '../core/timeutil.js'
import reader from '../core/reader.js'
import i18n from '../core/i18n.js'
import render from './render.js'

// مفتاح تخزين مستقل كليا عن النسخة الأولى (../../index.html): كلا النسختين تُستضافان على نفس
// الأصل (origin) الواحد في GitHub Pages (فرق المسار فقط)، وlocalStorage يُقسَّم حسب الأصل لا
// المسار - فلو تشاركتا نفس المفتاح لتداخلت تسوية كل منهما مع الأخرى (تغيير اللغة هنا مثلا كان
// سيُغيّرها في النسخة الأولى أيضا بصمت). كل نسخة مستقلة فعلا بفضل هذا الفرق فقط.
const STORAGE_KEY = 'falakAppSettings_customDateTime_v1'

const DEFAULT_STATE = {
  language: 'ar', // 'ar' | 'fr' - لغة الواجهة والقراءة الصوتية (العربية افتراضيا، راجع i18n.js)
  locMode: 'manual', // 'auto' | 'manual' - نبدأ يدويا بموقع افتراضي حتى يختار المستخدم تلقائيا
  autoCoords: null, // {lat, lon} من آخر تحديد تلقائي ناجح للموقع الجغرافي فقط (لا علاقة له بالمنطقة الزمنية - انظر detectLocation أدناه)
  autoTimeZone: null, // آخر منطقة زمنية اكتشفها الجهاز (لعرضها كمعلومة فقط - لا تُطبَّق تلقائيا أبدا، راجع applyDetectedPosition)
  manualLat: 21.3891,
  manualLon: 39.8579,
  tzMode: 'offset', // 'tz' | 'offset' - مستقل كليا عن locMode (يُضبط يدويا دائما، تلبية لطلب فصل الاثنين)
  timeZone: 'Asia/Riyadh',
  utcOffsetHours: 3,
  gnomonCm: 60,
  fajrAngleDeg: -18,
  asrFactor: 1,
  ishaMode: 'offsetAfterMaghrib', // 'offsetAfterMaghrib' | 'angle'
  ishaOffsetMinutes: 90,
  ishaAngleDeg: -18,
  isfarAlaAngleDeg: -6,
  naflAltitudeDeg: 4,
  maghribTamkinMinutes: 2, // هامش تمكين الغروب (دقائق تُضاف بعد الغروب الفلكي قبل إعلان دخول المغرب) - يطال العشاء بالتبعية (في وضع offsetAfterMaghrib) لا "الثلث الأخير من الليل"، انظر الشرح في prayerTimes.js
  hijriCalendarMethod: 'kuwaiti', // 'kuwaiti' | 'ummalqura' | 'astronomical' - انظر hijri.js لشرح الطرق الثلاث
  moonCoordFrame: 'geocentric', // 'geocentric' | 'topocentric' - إطار إحداثيات القمر البروجية/الاستوائية المعروضة (انظر الشرح في engine.js/moon.js)؛ لا يطال الشمس (منظرها الأفقي مهمل أصلا) ولا الأفقي/الشروق-الغروب/الطور للقمر نفسه
  adhanEnabled: true, // يرن تلقائيا عند دخول كل صلاة من الخمس - مستقل كليا عن نافذة القراءة الآلية أدناه
  adhanChoice: 'makkah', // 'makkah' | 'egypt' | 'quds' - انظر ADHAN_SOURCES أدناه
  tahajjudEnabled: true, // تنبيه سادس (بنفس صوت الأذان المختار) قبل أذان الفجر بـtahajjudOffsetMinutes
  tahajjudOffsetMinutes: 60,
  autoReadEnabled: true,
  autoReadStartTime: '06:00', // بداية نافذة القراءة الآلية كل نصف ساعة - 'HH:MM' بالتوقيت المحلي المضبوط
  autoReadEndTime: '00:00', // نهايتها - إن تساوى الوقتان فلا قيد (قراءة طوال اليوم)؛ راجع isWithinAutoReadWindow
  voiceName: null, // null = تلقائي (أول صوت بلغة الواجهة الحالية يجده المتصفح) - أو اسم صوت محدد اختاره المستخدم
  speechRate: 0.95,
  // خاص بهذه النسخة فقط: إمكانية تجميد الحساب على تاريخ/وقت محدد (يدخله المستخدم كتوقيت محلي
  // يُفسَّر حسب المنطقة الزمنية المضبوطة أعلاه) بدل الوقت الحالي - لمقارنة النتائج ببرامج أخرى.
  dateTimeMode: 'now', // 'now' | 'custom'
  customDate: null // {year,month,day,hour,minute,second} - يُهيَّأ بالوقت الحالي عند أول فتح لقسم الإعدادات إن بقي null
}

let state = { ...DEFAULT_STATE }
let stopHourlyReadings = null

// ------------------------- التخزين المحلي (بحذر؛ قد لا يتوفر) -------------------------

function loadState () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch (e) {
    // لا شيء - نبقى على الإعدادات الافتراضية (قد تكون localStorage غير متوفرة في بيئة الاستضافة)
  }
}

function saveState () {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    // تجاهل بهدوء
  }
}

// ------------------------- بناء الموقع لمحرك الحساب -------------------------

function currentObserverTime () {
  if (state.tzMode === 'tz') return { mode: 'tz', timeZone: state.timeZone }
  return { mode: 'offset', utcOffsetHours: Number(state.utcOffsetHours) }
}

function currentLocation () {
  let latDeg, lonEastDeg
  if (state.locMode === 'auto' && state.autoCoords) {
    latDeg = state.autoCoords.lat
    lonEastDeg = state.autoCoords.lon
  } else {
    latDeg = Number(state.manualLat)
    lonEastDeg = Number(state.manualLon)
  }
  return { latDeg, lonEastDeg, observerTime: currentObserverTime(), gnomonCm: Number(state.gnomonCm) }
}

function currentPrayerSettings () {
  return {
    fajrAngleDeg: Number(state.fajrAngleDeg),
    asrFactor: Number(state.asrFactor),
    ishaMode: state.ishaMode,
    ishaOffsetMinutes: Number(state.ishaOffsetMinutes),
    ishaAngleDeg: Number(state.ishaAngleDeg),
    isfarAlaAngleDeg: Number(state.isfarAlaAngleDeg),
    naflAltitudeDeg: Number(state.naflAltitudeDeg),
    maghribTamkinMinutes: Number(state.maghribTamkinMinutes)
  }
}

function localPartsFn (utcDate) {
  return timeutil.localPartsFromUTC(utcDate, currentObserverTime())
}

/** أجزاء التاريخ/الوقت المحلي الحالية فعليا - تُستعمل لتهيئة حقول "تاريخ ووقت محدد" بقيمة
 * معقولة (الوقت الحالي) في أول مرة يفتح المستخدم القسم، بدل تركها فارغة ومربكة. */
function nowLocalParts () {
  return timeutil.localPartsFromUTC(new Date(), currentObserverTime())
}

/** اللحظة (UTC) المستعملة فعليا لكل الحسابات: الوقت الحقيقي الآن، أو - خاص بهذه النسخة - لحظة
 * ثابتة اختارها المستخدم (مفسَّرة كتوقيت محلي حسب المنطقة الزمنية المضبوطة)، ليثبت العرض
 * عليها بلا تقدّم آلي، فيتمكّن من قراءتها ومقارنتها ببرامج أخرى بلا تسابق مع الساعة. */
function currentNowUtc () {
  if (state.dateTimeMode === 'custom' && state.customDate) {
    const c = state.customDate
    return timeutil.localPartsToUTCDate(c.year, c.month, c.day, c.hour, c.minute, c.second, currentObserverTime())
  }
  return new Date()
}

// ------------------------- الأذان -------------------------
// طلب المستخدم: أذان فعلي (لا نطق آلي) عند دخول كل وقت من الصلوات الخمس، باختيار من ثلاثة
// تسجيلات معروفة (مكة/مصر/القدس)، زائدا تنبيها سادسا قبل الفجر لصلاة التهجد - يعمل هذا دائما
// بصرف النظر عن نافذة القراءة الآلية (تلك خاصة بالنطق كل نصف ساعة فقط لا بالأذان، فقد يحتاج
// المستخدم أذان الفجر والتهجد تحديدا في عمق الليل، وهو تماما ما تُسكِته تلك النافذة لو طُبِّقت
// هنا خطأ) - ويعمل فقط ما دامت الصفحة مفتوحة فعليا (قيد المتصفحات، لا علة في هذا التطبيق).
//
// خاص بهذه النسخة (custom-datetime): لا يُستدعى هذا التحقق أصلا إلا حين dateTimeMode === 'now'
// (انظر موضع الاستدعاء في tick أدناه) - لأنه في وضع "تاريخ ووقت محدد" تكون مواقيت الصلاة
// المعروضة محسوبة للتاريخ المُجمَّد المختار، لا لتاريخ اليوم الفعلي، فمقارنتها بـDate.now()
// الحقيقي (الذي يستمر بالتقدم الفعلي بصرف النظر عن التجميد) ستكون مقارنة لا معنى لها، وقد تُصدر
// أذانا مفاجئا في لحظة عشوائية لا صلة لها بالتاريخ المعروض على الشاشة.
const ADHAN_SOURCES = {
  makkah: 'public/adhan/makkah.mp3',
  egypt: 'public/adhan/egypt.mp3',
  quds: 'public/adhan/quds.mp3'
}

let adhanAudioEl = null
function playAdhanChoice (choice) {
  const src = ADHAN_SOURCES[choice] || ADHAN_SOURCES.makkah
  try {
    if (adhanAudioEl) adhanAudioEl.pause()
    adhanAudioEl = new Audio(src)
    adhanAudioEl.play().catch(() => {}) // تجاهل صامت إن منعه المتصفح (مثلا بلا أي تفاعل سابق مع الصفحة)
  } catch (e) {}
}

// سجل بآخر يوم محلي (نص "سنة-شهر-يوم") أُذِّن/نُبِّه فيه لكل مناسبة من الستّ - ست مفاتيح ثابتة
// فقط، لا ينمو أبدا - يمنع تكرار نفس الأذان أكثر من مرة في اليوم نفسه (tick تعمل كل ثانية).
// التسامح الزمني (ADHAN_FIRE_TOLERANCE_MS) يتعامل مع حالة نادرة (تعليق المتصفح للتبويب فعليا
// ثم استئنافه بعد فوات وقت الأذان بأكثر من قليل) بتسجيل "أُذِّن" دون تشغيل فعلي، فلا يُفاجأ
// المستخدم بأذان متأخر ساعات، ولا يتكرر لاحقا بصمت أيضا.
const ADHAN_FIRE_TOLERANCE_MS = 4 * 60 * 1000
const lastFiredAdhanDay = {}

function maybeTriggerAdhan (key, triggerDate, todayStr) {
  if (!triggerDate || lastFiredAdhanDay[key] === todayStr) return
  const deltaMs = Date.now() - triggerDate.getTime()
  if (deltaMs < 0) return // لم يحن الوقت بعد
  lastFiredAdhanDay[key] = todayStr // تُسجَّل فورا (ناجحا كان التشغيل أو متأخرا) - مرة واحدة يوميا
  if (deltaMs <= ADHAN_FIRE_TOLERANCE_MS) playAdhanChoice(state.adhanChoice)
}

function checkAdhanTriggers (r) {
  if (!state.adhanEnabled && !state.tahajjudEnabled) return
  const lp = r.time.local
  const todayStr = `${lp.year}-${lp.month}-${lp.day}`
  const p = r.prayerTimes
  if (state.adhanEnabled) {
    maybeTriggerAdhan('fajr', p.fajr, todayStr)
    maybeTriggerAdhan('dhuhr', p.dhuhr, todayStr)
    maybeTriggerAdhan('asr', p.asr, todayStr)
    maybeTriggerAdhan('maghrib', p.maghrib, todayStr)
    maybeTriggerAdhan('isha', p.isha, todayStr)
  }
  if (state.tahajjudEnabled && p.fajr) {
    const tahajjudDate = new Date(p.fajr.getTime() - state.tahajjudOffsetMinutes * 60000)
    maybeTriggerAdhan('tahajjud', tahajjudDate, todayStr)
  }
}

// ------------------------- حلقة التحديث -------------------------

let lastResult = null

function tick () {
  const location = currentLocation()
  const r = engine.computeAll(location, currentNowUtc(), currentPrayerSettings(), state.hijriCalendarMethod, state.moonCoordFrame)
  lastResult = r
  render.renderAll(document, r, localPartsFn, state.language)
  render.renderPrayerHints(document, currentPrayerSettings(), state.language)
  updateLocationSummary()
  updateCustomTimeBadge(r)
  if (state.dateTimeMode !== 'custom') checkAdhanTriggers(r) // انظر الشرح أعلاه - لا معنى له في الوضع المُجمَّد
}

/** شارة تذكير في الترويسة: تظهر فقط في وضع "تاريخ ووقت محدد" لتوضيح أن المعروض ثابت على لحظة
 * بعينها لا يتحدّث مع الساعة الحقيقية - مهم جدا هنا تحديدا لأن الساعة المعروضة نفسها قد تبدو
 * عادية فيُظَن خطأ أنها تسير مباشرة. */
function updateCustomTimeBadge (r) {
  const el = document.getElementById('customTimeBadge')
  if (!el) return
  const isCustom = state.dateTimeMode === 'custom'
  el.classList.toggle('hidden', !isCustom)
  if (!isCustom) return
  const p = r.time.local
  const dt = `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`
  el.textContent = i18n.t('datetime.badgeCustom', state.language, { datetime: dt })
}

function updateLocationSummary () {
  const loc = currentLocation()
  const el = document.getElementById('locationSummary')
  if (!el) return
  const lang = state.language
  const northLetter = i18n.t('compass.north', lang)
  const southLetter = i18n.t('compass.south', lang)
  const eastLetter = i18n.t('compass.east', lang)
  const westLetter = i18n.t('compass.west', lang)
  const latTxt = Math.abs(loc.latDeg).toFixed(2) + '°' + (loc.latDeg >= 0 ? northLetter : southLetter)
  const lonTxt = Math.abs(loc.lonEastDeg).toFixed(2) + '°' + (loc.lonEastDeg >= 0 ? eastLetter : westLetter)
  const tzTxt = state.tzMode === 'tz' ? state.timeZone : `UTC${loc.observerTime.utcOffsetHours >= 0 ? '+' : ''}${loc.observerTime.utcOffsetHours}`
  el.textContent = `${latTxt} ${lonTxt} — ${tzTxt}`
}

// ------------------------- اللغة -------------------------

function applyLanguage (lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = i18n.dirForLang(lang)
  document.title = i18n.t('app.title', lang)
  render.applyStaticLanguage(document, lang)
  populateVoiceSelect()
}

function setLanguage (lang) {
  if (lang !== 'ar' && lang !== 'fr') return
  state.language = lang
  saveState()
  applyLanguage(lang)
  tick()
}

// ------------------------- التبويبات -------------------------

function wireTabs () {
  const buttons = Array.from(document.querySelectorAll('.tab-btn'))
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false') })
      btn.classList.add('active')
      btn.setAttribute('aria-selected', 'true')
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'))
      document.getElementById(btn.dataset.tab).classList.add('active')
    })
  })
}

// ------------------------- قائمة المناطق الزمنية -------------------------

const FALLBACK_TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Baghdad',
  'Asia/Amman', 'Asia/Beirut', 'Asia/Damascus', 'Asia/Jerusalem', 'Africa/Cairo', 'Africa/Khartoum',
  'Africa/Tripoli', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca', 'Asia/Istanbul',
  'Asia/Tehran', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Jakarta', 'Asia/Kuala_Lumpur',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Kolkata',
  'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'UTC'
]

function populateTimezoneSelect () {
  const sel = document.getElementById('inTz')
  let list = FALLBACK_TIMEZONES
  try {
    if (typeof Intl.supportedValuesOf === 'function') list = Intl.supportedValuesOf('timeZone')
  } catch (e) { /* استعمال القائمة الاحتياطية */ }
  sel.innerHTML = ''
  for (const tz of list) {
    const opt = document.createElement('option')
    opt.value = tz
    opt.textContent = tz
    sel.appendChild(opt)
  }
  let deviceTz = null
  try { deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch (e) { /* تجاهل */ }
  sel.value = (state.timeZone && list.includes(state.timeZone)) ? state.timeZone : (deviceTz && list.includes(deviceTz) ? deviceTz : 'UTC')
}

// ------------------------- اختيار صوت القارئ -------------------------

// بعض الأجهزة تضيف أصواتا لاحقا (الحدث غير متزامن) - نعيد ملء القائمة كلما تغيّرت، ونرشّح
// بحسب لغة الواجهة الحالية (عربي أو فرنسي) لا بحسب افتراض ثابت - وإلا ظل صوت عربي يُقترح أثناء
// تصفّح الفرنسية (أو العكس) رغم أنه لا يمكنه نطقها بشكل صحيح.
function populateVoiceSelect () {
  const sel = document.getElementById('inVoice')
  if (!sel || typeof window === 'undefined' || !window.speechSynthesis) return
  const langPrefix = state.language === 'fr' ? 'fr' : 'ar'
  const allVoices = window.speechSynthesis.getVoices()
  const matchingVoices = allVoices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix))
  const prevValue = sel.value || state.voiceName || ''
  sel.innerHTML = ''
  const autoOpt = document.createElement('option')
  autoOpt.value = ''
  autoOpt.textContent = i18n.t('settings.voiceAutoOption', state.language)
  sel.appendChild(autoOpt)
  for (const v of matchingVoices) {
    const opt = document.createElement('option')
    opt.value = v.name
    opt.textContent = `${v.name} (${v.lang})`
    sel.appendChild(opt)
  }
  if (matchingVoices.length === 0) {
    const noneOpt = document.createElement('option')
    noneOpt.value = ''
    noneOpt.textContent = i18n.t('settings.voiceNoneFound', state.language)
    noneOpt.disabled = true
    sel.appendChild(noneOpt)
  }
  if ([...sel.options].some((o) => o.value === prevValue)) sel.value = prevValue
}

if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.addEventListener === 'function') {
  window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelect)
}

function testVoiceNow () {
  const statusEl = document.getElementById('readerStatus')
  const voiceName = document.getElementById('inVoice').value || null
  const rate = numOr(document.getElementById('inRate').value, 0.95)
  statusEl.textContent = i18n.t('status.testingVoice', state.language)
  reader.speak(i18n.t('settings.voiceTestSentence', state.language), {
    lang: state.language === 'fr' ? 'fr-FR' : 'ar-SA',
    voiceNameHint: voiceName,
    rate
  })
    .then(() => { statusEl.textContent = i18n.t('status.testDone', state.language) })
    .catch(() => { statusEl.textContent = i18n.t('status.speechFailed', state.language) })
}

function testAdhanNow () {
  const choice = document.querySelector('input[name="adhanChoice"]:checked').value
  playAdhanChoice(choice)
}

// ------------------------- نافذة الإعدادات -------------------------

function openSettingsModal () {
  document.getElementById('settingsModal').classList.remove('hidden')
  fillSettingsFormFromState()
  populateVoiceSelect()
}
function closeSettingsModal () {
  document.getElementById('settingsModal').classList.add('hidden')
}

function pad2 (n) { return String(n).padStart(2, '0') }

function fillSettingsFormFromState () {
  document.querySelector(`input[name="uiLang"][value="${state.language}"]`).checked = true

  // تاريخ/وقت مخصص: إن لم يسبق للمستخدم ضبط قيمة (customDate لا تزال null) نهيّئها بالوقت
  // الحالي فعلا، حتى لا تظهر الحقول فارغة أو بتاريخ 1970 الافتراضي عند أول تفعيل للوضع.
  if (!state.customDate) state.customDate = nowLocalParts()
  document.querySelector(`input[name="dateTimeMode"][value="${state.dateTimeMode}"]`).checked = true
  const c = state.customDate
  document.getElementById('inCustomDate').value = `${c.year}-${pad2(c.month)}-${pad2(c.day)}`
  document.getElementById('inCustomTime').value = `${pad2(c.hour)}:${pad2(c.minute)}:${pad2(c.second)}`

  document.querySelector(`input[name="locMode"][value="${state.locMode}"]`).checked = true
  document.getElementById('inLat').value = state.manualLat
  document.getElementById('inLon').value = state.manualLon
  document.querySelector(`input[name="tzMode"][value="${state.tzMode}"]`).checked = true
  document.getElementById('inTzOffset').value = state.utcOffsetHours
  document.getElementById('inGnomon').value = state.gnomonCm
  document.querySelector(`input[name="hijriMethod"][value="${state.hijriCalendarMethod}"]`).checked = true
  document.querySelector(`input[name="moonCoordFrame"][value="${state.moonCoordFrame}"]`).checked = true
  document.getElementById('inFajrAngle').value = state.fajrAngleDeg
  document.getElementById('inAsrFactor').value = String(state.asrFactor)
  document.querySelector(`input[name="ishaMode"][value="${state.ishaMode}"]`).checked = true
  document.getElementById('inIshaOffset').value = state.ishaOffsetMinutes
  document.getElementById('inIshaAngle').value = state.ishaAngleDeg
  document.getElementById('inIsfarAngle').value = state.isfarAlaAngleDeg
  document.getElementById('inNaflAltitude').value = state.naflAltitudeDeg
  document.getElementById('inMaghribTamkin').value = state.maghribTamkinMinutes
  document.getElementById('inAdhanEnabled').checked = state.adhanEnabled
  document.querySelector(`input[name="adhanChoice"][value="${state.adhanChoice}"]`).checked = true
  document.getElementById('inTahajjudEnabled').checked = state.tahajjudEnabled
  document.getElementById('inTahajjudOffset').value = state.tahajjudOffsetMinutes
  document.getElementById('inVoice').value = state.voiceName || ''
  document.getElementById('inRate').value = state.speechRate
  document.getElementById('inAutoReadStart').value = state.autoReadStartTime
  document.getElementById('inAutoReadEnd').value = state.autoReadEndTime
  ;['inLat', 'inLon', 'inTzOffset', 'inFajrAngle', 'inIshaAngle', 'inIsfarAngle'].forEach(syncSignButton)
  updateSettingsVisibility()
  if (document.getElementById('inTz').value !== state.timeZone) {
    const sel = document.getElementById('inTz')
    if ([...sel.options].some((o) => o.value === state.timeZone)) sel.value = state.timeZone
  }
}

function updateSettingsVisibility () {
  const dateTimeMode = document.querySelector('input[name="dateTimeMode"]:checked').value
  document.getElementById('customDateTimeRow').classList.toggle('hidden', dateTimeMode !== 'custom')

  const locMode = document.querySelector('input[name="locMode"]:checked').value
  document.getElementById('locAutoBlock').classList.toggle('hidden', locMode !== 'auto')
  document.getElementById('locManualBlock').classList.toggle('hidden', locMode !== 'manual')

  // قسم المنطقة الزمنية مستقل كليا عن locMode أعلاه (لا يُخفى أبدا بسببه) - يظهر فقط حقل
  // الاسم أو حقل الإزاحة بحسب tzMode، تماما كما كان الحال سابقا، لكن القسم نفسه الآن ثابت الظهور.
  const tzMode = document.querySelector('input[name="tzMode"]:checked').value
  document.getElementById('tzSelectRow').classList.toggle('hidden', tzMode !== 'tz')
  document.getElementById('tzOffsetRow').classList.toggle('hidden', tzMode !== 'offset')

  const ishaMode = document.querySelector('input[name="ishaMode"]:checked').value
  document.getElementById('ishaOffsetRow').classList.toggle('hidden', ishaMode !== 'offsetAfterMaghrib')
  document.getElementById('ishaAngleRow').classList.toggle('hidden', ishaMode !== 'angle')
}

// قراءة رقمية آمنة: ترجع fallback (صفر افتراضيا) إن كان النص فارغا أو غير صالح (مثلا "-" بمفردها
// بقيت في الحقل لحظة الحفظ) بدل أن يتسرب NaN إلى محرك الحساب فيُفسد كل العرض بعد ذلك بصمت
function numOr (value, fallback = 0) {
  const s = String(value).trim()
  if (s === '' || s === '-' || s === '.') return fallback // نص فارغ أو غير مكتمل - لا نحوّله صفرا بصمت
  const n = Number(s)
  return Number.isFinite(n) ? n : fallback
}

function saveSettingsFromForm () {
  const newLang = document.querySelector('input[name="uiLang"]:checked').value
  state.dateTimeMode = document.querySelector('input[name="dateTimeMode"]:checked').value
  const customDateVal = document.getElementById('inCustomDate').value
  const customTimeVal = document.getElementById('inCustomTime').value
  if (customDateVal && customTimeVal) {
    const [y, mo, d] = customDateVal.split('-').map(Number)
    const [h, mi, s] = customTimeVal.split(':').map(Number)
    state.customDate = { year: y, month: mo, day: d, hour: h, minute: mi, second: s || 0 }
  } // وإن كان أحد الحقلين فارغا نُبقي القيمة السابقة لـ customDate كما هي بلا تغيير
  state.locMode = document.querySelector('input[name="locMode"]:checked').value
  state.manualLat = numOr(document.getElementById('inLat').value, state.manualLat)
  state.manualLon = numOr(document.getElementById('inLon').value, state.manualLon)
  state.tzMode = document.querySelector('input[name="tzMode"]:checked').value
  state.timeZone = document.getElementById('inTz').value
  state.utcOffsetHours = numOr(document.getElementById('inTzOffset').value, state.utcOffsetHours)
  state.gnomonCm = numOr(document.getElementById('inGnomon').value, state.gnomonCm)
  state.hijriCalendarMethod = document.querySelector('input[name="hijriMethod"]:checked').value
  state.moonCoordFrame = document.querySelector('input[name="moonCoordFrame"]:checked').value
  state.fajrAngleDeg = numOr(document.getElementById('inFajrAngle').value, state.fajrAngleDeg)
  state.asrFactor = numOr(document.getElementById('inAsrFactor').value, state.asrFactor)
  state.ishaMode = document.querySelector('input[name="ishaMode"]:checked').value
  state.ishaOffsetMinutes = numOr(document.getElementById('inIshaOffset').value, state.ishaOffsetMinutes)
  state.ishaAngleDeg = numOr(document.getElementById('inIshaAngle').value, state.ishaAngleDeg)
  state.isfarAlaAngleDeg = numOr(document.getElementById('inIsfarAngle').value, state.isfarAlaAngleDeg)
  state.naflAltitudeDeg = numOr(document.getElementById('inNaflAltitude').value, state.naflAltitudeDeg)
  state.maghribTamkinMinutes = numOr(document.getElementById('inMaghribTamkin').value, state.maghribTamkinMinutes)
  state.adhanEnabled = document.getElementById('inAdhanEnabled').checked
  state.adhanChoice = document.querySelector('input[name="adhanChoice"]:checked').value
  state.tahajjudEnabled = document.getElementById('inTahajjudEnabled').checked
  state.tahajjudOffsetMinutes = numOr(document.getElementById('inTahajjudOffset').value, state.tahajjudOffsetMinutes)
  state.voiceName = document.getElementById('inVoice').value || null
  state.speechRate = numOr(document.getElementById('inRate').value, state.speechRate)
  state.autoReadStartTime = document.getElementById('inAutoReadStart').value || state.autoReadStartTime
  state.autoReadEndTime = document.getElementById('inAutoReadEnd').value || state.autoReadEndTime
  saveState()
  closeSettingsModal()
  if (newLang !== state.language) setLanguage(newLang) // يطبّق الترجمة ويُعيد العرض بنفسه
  else tick()
}

// حقل نصي لعدد عشري قد يكون سالبا (خطوط الطول/العرض، الإزاحة الزمنية، زوايا الفجر/العشاء):
// نستعمل type="text" بدل type="number" لأن لوحة المفاتيح الرقمية التي يعرضها أندرويد لحقول
// type="number" غالبا لا تحتوي على مفتاح "-" أصلا (مشكلة معروفة وواسعة الانتشار في متصفحات
// الهاتف) فيستحيل عمليا إدخال قيمة سالبة من الهاتف رغم أنها مقبولة تماما برمجيا. هنا نُبقي
// الحقل نصا حرا ونُنظّف فقط الرموز غير المسموحة أثناء الكتابة (رقم سالب واحد في المقدمة على
// الأكثر، ونقطة عشرية واحدة) - بلا رفض الحالات الوسيطة غير المكتملة مثل "-" بمفردها لحظيا.
function wireSignedDecimalInput (id) {
  const el = document.getElementById(id)
  if (!el) return
  el.addEventListener('input', () => {
    const before = el.value
    const caretFromEnd = before.length - (el.selectionEnd ?? before.length)
    const neg = before.trim().startsWith('-')
    let digitsAndDot = before.replace(/[^0-9.]/g, '')
    const firstDot = digitsAndDot.indexOf('.')
    if (firstDot !== -1) {
      digitsAndDot = digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, '')
    }
    const after = (neg ? '-' : '') + digitsAndDot
    if (after !== before) {
      el.value = after
      const pos = Math.max(0, after.length - caretFromEnd)
      el.setSelectionRange(pos, pos)
    }
    syncSignButton(id)
  })
}

// زر "±" مستقل كليا عن لوحة مفاتيح الجهاز: بعض لوحات مفاتيح أندرويد (تبعا للنظام والتطبيق
// المثبَّت - Gboard أو غيره) لا تعرض مفتاح "-" أصلا لحقول type="number" ولا حتى لحقول نصية
// بـinputmode="decimal"/pattern تتضمنه - وهذا قرار داخلي في تطبيق لوحة المفاتيح نفسه خارج
// عن أي ضبط HTML/CSS ممكن من الصفحة، فلا يوجد حل برمجي يضمن ظهوره على كل جهاز. هذا الزر
// يبدّل العلامة بنقرة واحدة بلا أي اعتماد على الكتابة - فيعمل على كل الأجهزة دون استثناء.
function signButtonFor (id) {
  return document.querySelector(`button.sign-toggle[data-for="${id}"]`)
}

function syncSignButton (id) {
  const input = document.getElementById(id)
  const btn = signButtonFor(id)
  if (!input || !btn) return
  const negative = input.value.trim().startsWith('-')
  btn.textContent = negative ? '−' : '+'
  btn.classList.toggle('negative', negative)
}

function wireSignToggle (id) {
  const btn = signButtonFor(id)
  const input = document.getElementById(id)
  if (!btn || !input) return
  btn.addEventListener('click', () => {
    const v = input.value.trim()
    input.value = v.startsWith('-') ? v.slice(1) : ('-' + v)
    syncSignButton(id)
    input.focus()
  })
  syncSignButton(id)
}

// نجاح تحديد الموقع الجغرافي يحدّث الإحداثيات (ويُفعّل الوضع التلقائي للموقع) فقط - ولا يمسّ
// المنطقة الزمنية مطلقا (لا state.tzMode ولا state.timeZone ولا state.utcOffsetHours) بناء على
// طلب صريح لفصل الاثنين: "تحديد منطقة الزمنية يدويا بينما يمكن تحديد منطقة الجغرافية تلقائيا".
// نكتشف منطقة الجهاز الزمنية المحتملة لعرضها كمعلومة مفيدة فقط (قد تساعد المستخدم على ضبطها
// يدويا بنفسه في قسم "المنطقة الزمنية" المستقل) لكن لا نطبّقها أبدا من تلقاء أنفسنا.
function applyDetectedPosition (pos, resultEl) {
  const lang = state.language
  state.locMode = 'auto' // نجاح التحديد يعني الالتزام بالوضع التلقائي للموقع الجغرافي فقط
  state.autoCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
  let detectedTz = null
  try { detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch (e) { detectedTz = null }
  state.autoTimeZone = detectedTz // معلومة محفوظة للعرض فقط - راجع التعليق أعلاه
  let msg = i18n.t('geo.successTemplate', lang, { lat: state.autoCoords.lat.toFixed(4), lon: state.autoCoords.lon.toFixed(4) })
  if (detectedTz) msg += i18n.t('geo.detectedTzNote', lang, { tz: detectedTz })
  resultEl.textContent = msg
  // لازم نُعيد مزامنة كل حقول النموذج مع الحالة الآن (بعد تحديث locMode أعلاه) - وإلا فسيقرأ
  // زر "حفظ" قيما قديمة من النموذج (وضعا يدويا سابقا مثلا) ويطمس التحديد التلقائي الذي تم للتو.
  // ملاحظة: هذا لا يمسّ حقول المنطقة الزمنية في النموذج أصلا - فهي لم تتغيّر في state لتبدأ.
  fillSettingsFormFromState()
  saveState()
  tick()
}

// رسالة تشخيصية بحسب رمز الخطأ (1=رفض الإذن، 2=تعذّر تحديد الموضع، 3=انتهاء الوقت) -
// انظر: GeolocationPositionError. هذا يفرّق بين سبب "رفض صريح" (يحتاج تدخلا من المستخدم في إعدادات
// النظام/المتصفح) وسبب "تقني مؤقت" (قد تنجح معه محاولة ثانية بدقة أقل، فتُعرض فقط بانتظار تلك المحاولة).
function geolocationErrorMessage (err) {
  const lang = state.language
  const code = err && err.code
  if (code === 1) return i18n.t('geo.errorDenied', lang)
  if (code === 3) return i18n.t('geo.errorTimeout', lang)
  if (code === 2) return i18n.t('geo.errorUnavailable', lang)
  return i18n.t('geo.errorGeneric', lang, { message: (err && err.message) ? err.message : i18n.t('geo.errorUnknown', lang) })
}

function detectLocation () {
  const resultEl = document.getElementById('autoLocResult')
  const lang = state.language
  if (!('geolocation' in navigator)) {
    resultEl.textContent = i18n.t('geo.notSupported', lang)
    return
  }
  resultEl.textContent = i18n.t('geo.locating', lang)

  let settled = false // لحماية من استدعاء مزدوج (نتيجة حقيقية متأخرة + الحارس الزمني أدناه)

  // حارس زمني يدوي يغطي كل تسلسل المحاولتين (١٢ث + ٢٠ث + فارق أمان): بعض المتصفحات/بيئات العرض
  // (مثل صفحة مُستضافة ضمن معاينة أو إطار iframe لا يفوّض صلاحية الموقع له) لا تستدعي دالتي النجاح
  // أو الخطأ مطلقا إن تعذّر حتى عرض طلب الإذن - فتبقى الرسالة "جارٍ التحديد..." عالقة إلى الأبد دون
  // أي تغذية راجعة. هذا الحارس يكسر ذلك الجمود ويوجّه صريحا نحو الإدخال اليدوي.
  const watchdog = setTimeout(() => {
    if (settled) return
    settled = true
    resultEl.textContent = i18n.t('geo.watchdogTimeout', state.language)
  }, 35000)

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      applyDetectedPosition(pos, resultEl)
    },
    (err) => {
      if (settled) return
      // عند انتهاء الوقت أو تعذّر الموضع (لا عند رفض الإذن صراحة) نجرّب مرة ثانية بدقة أقل ومهلة أطول
      // ونسمح بنتيجة مخبّأة أقدم - غالبا ما تنجح هذه المحاولة حتى لو فشلت المحاولة شديدة الدقة أولا
      if (err && (err.code === 2 || err.code === 3)) {
        resultEl.textContent = geolocationErrorMessage(err)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (settled) return
            settled = true
            clearTimeout(watchdog)
            applyDetectedPosition(pos, resultEl)
          },
          (err2) => {
            if (settled) return
            settled = true
            clearTimeout(watchdog)
            resultEl.textContent = geolocationErrorMessage(err2)
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
        )
      } else {
        settled = true
        clearTimeout(watchdog)
        resultEl.textContent = geolocationErrorMessage(err)
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  )
}

// تسجيل عامل خدمة (Service Worker) دفاعي: مطلوب في بعض المتصفحات كشرط لإمكانية "تثبيت" الصفحة
// كتطبيق مستقل. التسجيل هنا بلا أي تأثير على وظائف التطبيق: إن فشل (مثلا لأن بيئة استضافة الصفحة
// تحظره) يستمر كل شيء آخر في العمل بشكل طبيعي تماما - لذلك نتجاهل أي خطأ بصمت.
function registerServiceWorker () {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('sw.js').catch(() => {})
}

// ------------------------- القارئ الصوتي -------------------------

function currentSpeechOptions () {
  return {
    lang: state.language === 'fr' ? 'fr-FR' : 'ar-SA',
    voiceNameHint: state.voiceName || undefined,
    rate: Number(state.speechRate) || 0.95
  }
}

function speakNow () {
  if (!lastResult) return
  const statusEl = document.getElementById('readerStatus')
  const text = reader.buildNarrationScript(lastResult, localPartsFn, state.language)
  statusEl.textContent = i18n.t('status.reading', state.language)
  reader.speak(text, currentSpeechOptions())
    .then(() => { statusEl.textContent = i18n.t('status.readDone', state.language) })
    .catch((e) => { statusEl.textContent = i18n.t('status.speechFailed', state.language) })
}

// نافذة تفعيل القراءة الآلية كل نصف ساعة (طلب المستخدم: مثلا من ٠٦:٠٠ إلى منتصف الليل فقط) -
// لا تؤثر إطلاقا على زر "قراءة الآن" (speakNow)، فهو يعمل دائما بصرف النظر عن هذه النافذة.
function minutesSinceMidnight (hhmm) {
  if (typeof hhmm !== 'string') return 0
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return 0
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const min = Math.min(59, Math.max(0, Number(m[2])))
  return h * 60 + min
}

function isWithinAutoReadWindow () {
  const startMin = minutesSinceMidnight(state.autoReadStartTime)
  const endMin = minutesSinceMidnight(state.autoReadEndTime)
  if (startMin === endMin) return true // الوقتان متساويان = إلغاء القيد، قراءة طوال اليوم
  const nowParts = localPartsFn(new Date())
  const nowMin = nowParts.hour * 60 + nowParts.minute
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin
  // نافذة تعبر منتصف الليل (مثلا ٠٦:٠٠ → ٠٠:٠٠): نشطة ٠٦:٠٠-٢٣:٥٩، صامتة ٠٠:٠٠-٠٥:٥٩
  return nowMin >= startMin || nowMin < endMin
}

function startAutoReading () {
  if (stopHourlyReadings) return
  stopHourlyReadings = reader.scheduleHourlyReadings(
    () => reader.buildNarrationScript(lastResult, localPartsFn, state.language),
    (text) => {
      if (!isWithinAutoReadWindow()) return Promise.resolve()
      return reader.speak(text, currentSpeechOptions()).catch(() => {})
    }
  )
}
function stopAutoReading () {
  if (stopHourlyReadings) { stopHourlyReadings(); stopHourlyReadings = null }
}

// ------------------------- الإقلاع -------------------------

function wireEvents () {
  wireTabs()

  document.getElementById('btnSettings').addEventListener('click', openSettingsModal)
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettingsModal)
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettingsFromForm)
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') closeSettingsModal()
  })

  document.querySelectorAll('input[name="locMode"], input[name="tzMode"], input[name="ishaMode"], input[name="dateTimeMode"]').forEach((el) => {
    el.addEventListener('change', updateSettingsVisibility)
  })

  // تبديل اللغة فوري (لا ينتظر زر "حفظ") - فهو تفضيل عرض بحت بلا أي أثر حسابي، ويتوقع المستخدم
  // رؤية أثره مباشرة كبقية مبدّلات اللغة المعتادة.
  document.querySelectorAll('input[name="uiLang"]').forEach((el) => {
    el.addEventListener('change', (e) => setLanguage(e.target.value))
  })

  document.getElementById('btnDetectLocation').addEventListener('click', detectLocation)
  ;['inLat', 'inLon', 'inTzOffset', 'inFajrAngle', 'inIshaAngle', 'inIsfarAngle'].forEach((id) => {
    wireSignedDecimalInput(id)
    wireSignToggle(id)
  })

  document.getElementById('btnTestVoice').addEventListener('click', testVoiceNow)
  document.getElementById('btnTestAdhan').addEventListener('click', testAdhanNow)

  document.getElementById('btnSpeakNow').addEventListener('click', speakNow)
  document.getElementById('chkAutoRead').addEventListener('change', (e) => {
    state.autoReadEnabled = e.target.checked
    saveState()
    if (e.target.checked) startAutoReading(); else stopAutoReading()
  })
}

function init () {
  registerServiceWorker()
  loadState()
  applyLanguage(state.language)
  populateTimezoneSelect()
  wireEvents()
  document.getElementById('chkAutoRead').checked = state.autoReadEnabled
  tick()
  setInterval(tick, 1000)
  if (state.autoReadEnabled) startAutoReading()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
