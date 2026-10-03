/**
 * src/ui/app.js
 * نقطة انطلاق الواجهة: الحالة (الموقع، إعدادات الصلاة، القراءة الآلية)، حفظها محليا،
 * حلقة التحديث الثانية، تبديل التبويبات، نافذة الإعدادات، وربط القارئ الصوتي.
 */
import engine from '../core/engine.js'
import timeutil from '../core/timeutil.js'
import reader from '../core/reader.js'
import render from './render.js'

const STORAGE_KEY = 'falakAppSettings_v1'

const DEFAULT_STATE = {
  locMode: 'manual', // 'auto' | 'manual' - نبدأ يدويا بموقع افتراضي حتى يختار المستخدم تلقائيا
  autoCoords: null, // {lat, lon} من آخر تحديد تلقائي ناجح
  autoTimeZone: null,
  manualLat: 21.3891,
  manualLon: 39.8579,
  tzMode: 'offset', // 'tz' | 'offset'
  timeZone: 'Asia/Riyadh',
  utcOffsetHours: 3,
  gnomonCm: 60,
  fajrAngleDeg: -18,
  asrFactor: 1,
  ishaMode: 'offsetAfterMaghrib', // 'offsetAfterMaghrib' | 'angle'
  ishaOffsetMinutes: 90,
  ishaAngleDeg: -18,
  autoReadEnabled: true,
  voiceName: null, // null = تلقائي (أول صوت عربي يجده المتصفح) - أو اسم صوت محدد اختاره المستخدم
  speechRate: 0.95
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
    ishaAngleDeg: Number(state.ishaAngleDeg)
  }
}

function localPartsFn (utcDate) {
  return timeutil.localPartsFromUTC(utcDate, currentObserverTime())
}

// ------------------------- حلقة التحديث -------------------------

let lastResult = null

function tick () {
  const location = currentLocation()
  const r = engine.computeAll(location, new Date(), currentPrayerSettings())
  lastResult = r
  render.renderAll(document, r, localPartsFn)
  render.renderPrayerHints(document, currentPrayerSettings())
  updateLocationSummary()
}

function updateLocationSummary () {
  const loc = currentLocation()
  const el = document.getElementById('locationSummary')
  if (!el) return
  const latTxt = Math.abs(loc.latDeg).toFixed(2) + (loc.latDeg >= 0 ? '°ش' : '°ج')
  const lonTxt = Math.abs(loc.lonEastDeg).toFixed(2) + (loc.lonEastDeg >= 0 ? '°شرق' : '°غرب')
  const tzTxt = state.tzMode === 'tz' ? state.timeZone : `UTC${loc.observerTime.utcOffsetHours >= 0 ? '+' : ''}${loc.observerTime.utcOffsetHours}`
  el.textContent = `${latTxt} ${lonTxt} — ${tzTxt}`
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

// بعض الأجهزة تضيف أصواتا عربية لاحقا (الحدث غير متزامن) - نعيد ملء القائمة كلما تغيّرت
function populateVoiceSelect () {
  const sel = document.getElementById('inVoice')
  if (!sel || typeof window === 'undefined' || !window.speechSynthesis) return
  const allVoices = window.speechSynthesis.getVoices()
  const arabicVoices = allVoices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ar'))
  const prevValue = sel.value || state.voiceName || ''
  sel.innerHTML = ''
  const autoOpt = document.createElement('option')
  autoOpt.value = ''
  autoOpt.textContent = 'تلقائي (أول صوت عربي يوفّره الجهاز)'
  sel.appendChild(autoOpt)
  for (const v of arabicVoices) {
    const opt = document.createElement('option')
    opt.value = v.name
    opt.textContent = `${v.name} (${v.lang})`
    sel.appendChild(opt)
  }
  if (arabicVoices.length === 0) {
    const noneOpt = document.createElement('option')
    noneOpt.value = ''
    noneOpt.textContent = 'لم يُعثر على صوت عربي مثبَّت على هذا الجهاز'
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
  statusEl.textContent = 'جارٍ تجربة الصوت...'
  reader.speakArabic('هذا اختبار لجودة النطق: الساعة الآن الثالثة والنصف مساء.', { voiceNameHint: voiceName, rate })
    .then(() => { statusEl.textContent = 'تمت التجربة.' })
    .catch(() => { statusEl.textContent = 'تعذّر النطق الصوتي في هذا المتصفح.' })
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

function fillSettingsFormFromState () {
  document.querySelector(`input[name="locMode"][value="${state.locMode}"]`).checked = true
  document.getElementById('inLat').value = state.manualLat
  document.getElementById('inLon').value = state.manualLon
  document.querySelector(`input[name="tzMode"][value="${state.tzMode}"]`).checked = true
  document.getElementById('inTzOffset').value = state.utcOffsetHours
  document.getElementById('inGnomon').value = state.gnomonCm
  document.getElementById('inFajrAngle').value = state.fajrAngleDeg
  document.getElementById('inAsrFactor').value = String(state.asrFactor)
  document.querySelector(`input[name="ishaMode"][value="${state.ishaMode}"]`).checked = true
  document.getElementById('inIshaOffset').value = state.ishaOffsetMinutes
  document.getElementById('inIshaAngle').value = state.ishaAngleDeg
  document.getElementById('inVoice').value = state.voiceName || ''
  document.getElementById('inRate').value = state.speechRate
  ;['inLat', 'inLon', 'inTzOffset', 'inFajrAngle', 'inIshaAngle'].forEach(syncSignButton)
  updateSettingsVisibility()
  if (document.getElementById('inTz').value !== state.timeZone) {
    const sel = document.getElementById('inTz')
    if ([...sel.options].some((o) => o.value === state.timeZone)) sel.value = state.timeZone
  }
}

function updateSettingsVisibility () {
  const locMode = document.querySelector('input[name="locMode"]:checked').value
  document.getElementById('locAutoBlock').classList.toggle('hidden', locMode !== 'auto')
  document.getElementById('locManualBlock').classList.toggle('hidden', locMode !== 'manual')

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
  state.locMode = document.querySelector('input[name="locMode"]:checked').value
  state.manualLat = numOr(document.getElementById('inLat').value, state.manualLat)
  state.manualLon = numOr(document.getElementById('inLon').value, state.manualLon)
  state.tzMode = document.querySelector('input[name="tzMode"]:checked').value
  state.timeZone = document.getElementById('inTz').value
  state.utcOffsetHours = numOr(document.getElementById('inTzOffset').value, state.utcOffsetHours)
  state.gnomonCm = numOr(document.getElementById('inGnomon').value, state.gnomonCm)
  state.fajrAngleDeg = numOr(document.getElementById('inFajrAngle').value, state.fajrAngleDeg)
  state.asrFactor = numOr(document.getElementById('inAsrFactor').value, state.asrFactor)
  state.ishaMode = document.querySelector('input[name="ishaMode"]:checked').value
  state.ishaOffsetMinutes = numOr(document.getElementById('inIshaOffset').value, state.ishaOffsetMinutes)
  state.ishaAngleDeg = numOr(document.getElementById('inIshaAngle').value, state.ishaAngleDeg)
  state.voiceName = document.getElementById('inVoice').value || null
  state.speechRate = numOr(document.getElementById('inRate').value, state.speechRate)
  saveState()
  closeSettingsModal()
  tick()
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

function applyDetectedPosition (pos, resultEl) {
  state.locMode = 'auto' // نجاح التحديد يعني الالتزام بالوضع التلقائي فعليا
  state.autoCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
  try { state.autoTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone } catch (e) { state.autoTimeZone = null }
  if (state.autoTimeZone) { state.tzMode = 'tz'; state.timeZone = state.autoTimeZone }
  resultEl.textContent = `تم التحديد: ${state.autoCoords.lat.toFixed(4)}°, ${state.autoCoords.lon.toFixed(4)}°` +
    (state.autoTimeZone ? ` — المنطقة الزمنية: ${state.autoTimeZone}` : '')
  // لازم نُعيد مزامنة كل حقول النموذج مع الحالة الآن (بعد تحديث locMode أعلاه) - وإلا فسيقرأ
  // زر "حفظ" قيما قديمة من النموذج (وضعا يدويا سابقا مثلا) ويطمس التحديد التلقائي الذي تم للتو
  fillSettingsFormFromState()
  saveState()
  tick()
}

// رسالة تشخيصية بحسب رمز الخطأ (1=رفض الإذن، 2=تعذّر تحديد الموضع، 3=انتهاء الوقت) -
// انظر: GeolocationPositionError. هذا يفرّق بين سبب "رفض صريح" (يحتاج تدخلا من المستخدم في إعدادات
// النظام/المتصفح) وسبب "تقني مؤقت" (قد تنجح معه محاولة ثانية بدقة أقل، فتُعرض فقط بانتظار تلك المحاولة).
function geolocationErrorMessage (err) {
  const code = err && err.code
  if (code === 1) {
    return 'تم رفض إذن الموقع. تحقّقوا من: أيقونة القفل/الموقع 🔒 بجانب شريط العنوان، ثم من صلاحية ' +
      '"الموقع" الممنوحة للمتصفح نفسه من إعدادات نظام الجهاز (أندرويد: الإعدادات ← التطبيقات ← المتصفح ← ' +
      'الأذونات ← الموقع)، وأن خدمة الموقع في النظام مفعّلة عموما. ثم أعيدوا المحاولة، أو استعملوا الإدخال اليدوي.'
  }
  if (code === 3) return 'انتهى الوقت المسموح دون نتيجة (يحدث غالبا في الأماكن المغلقة). نعاود المحاولة بدقة أقل...'
  if (code === 2) return 'تعذّر تحديد الموقع حاليا (الموضع غير متوفر). نعاود المحاولة...'
  return 'تعذّر تحديد الموقع (' + (err && err.message ? err.message : 'خطأ غير معروف') + '). يمكنكم استعمال الإدخال اليدوي.'
}

function detectLocation () {
  const resultEl = document.getElementById('autoLocResult')
  if (!('geolocation' in navigator)) {
    resultEl.textContent = 'خدمة تحديد الموقع غير متوفرة في هذا المتصفح. استعملوا الإدخال اليدوي.'
    return
  }
  resultEl.textContent = 'جارٍ تحديد الموقع...'

  let settled = false // لحماية من استدعاء مزدوج (نتيجة حقيقية متأخرة + الحارس الزمني أدناه)

  // حارس زمني يدوي يغطي كل تسلسل المحاولتين (١٢ث + ٢٠ث + فارق أمان): بعض المتصفحات/بيئات العرض
  // (مثل صفحة مُستضافة ضمن معاينة أو إطار iframe لا يفوّض صلاحية الموقع له) لا تستدعي دالتي النجاح
  // أو الخطأ مطلقا إن تعذّر حتى عرض طلب الإذن - فتبقى الرسالة "جارٍ التحديد..." عالقة إلى الأبد دون
  // أي تغذية راجعة. هذا الحارس يكسر ذلك الجمود ويوجّه صريحا نحو الإدخال اليدوي.
  const watchdog = setTimeout(() => {
    if (settled) return
    settled = true
    resultEl.textContent = 'لم يستجب المتصفح لطلب الموقع لا بنجاح ولا برفض صريح — يُحتمل أن تحديد الموقع ' +
      'غير مسموح به في بيئة العرض هذه (مثلا صفحة مفتوحة ضمن معاينة مُضمَّنة). جرّبوا فتح الرابط في نافذة ' +
      'متصفح مستقلة كاملة، وتأكدوا من تفعيل خدمة الموقع للمتصفح من إعدادات النظام، أو استعملوا الإدخال اليدوي أدناه.'
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
  return { voiceNameHint: state.voiceName || undefined, rate: Number(state.speechRate) || 0.95 }
}

function speakNow () {
  if (!lastResult) return
  const statusEl = document.getElementById('readerStatus')
  const text = reader.buildNarrationScript(lastResult, localPartsFn)
  statusEl.textContent = 'جارٍ القراءة...'
  reader.speakArabic(text, currentSpeechOptions())
    .then(() => { statusEl.textContent = 'تمت القراءة.' })
    .catch((e) => { statusEl.textContent = 'تعذّر النطق الصوتي في هذا المتصفح.' })
}

function startAutoReading () {
  if (stopHourlyReadings) return
  stopHourlyReadings = reader.scheduleHourlyReadings(
    () => reader.buildNarrationScript(lastResult, localPartsFn),
    (text) => reader.speakArabic(text, currentSpeechOptions()).catch(() => {})
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

  document.querySelectorAll('input[name="locMode"], input[name="tzMode"], input[name="ishaMode"]').forEach((el) => {
    el.addEventListener('change', updateSettingsVisibility)
  })

  document.getElementById('btnDetectLocation').addEventListener('click', detectLocation)
  ;['inLat', 'inLon', 'inTzOffset', 'inFajrAngle', 'inIshaAngle'].forEach((id) => {
    wireSignedDecimalInput(id)
    wireSignToggle(id)
  })

  document.getElementById('btnTestVoice').addEventListener('click', testVoiceNow)

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
