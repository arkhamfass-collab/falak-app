/**
 * sw.js — عامل خدمة بسيط وآمن.
 *
 * الغرض: (أ) تخزين غلاف التطبيق محليا ليعمل دون اتصال، و(ب) تسجيل عامل خدمة فعلي - شرط
 * تعتمده بعض المتصفحات لإتاحة خيار "تثبيت" الصفحة كتطبيق مستقل.
 *
 * لا يتدخل في أي طلب لمصدر خارجي (خطوط جوجل مثلا) - تلك الطلبات تذهب للشبكة مباشرة كالعادة.
 * وإن تعذّر أي شيء هنا (حتى التسجيل نفسه) يستمر التطبيق في العمل بشكل طبيعي تماما بلا كاش.
 */
// رُفع رقم الإصدار (v5→v6) مع: اعتماد البرج/المنزلة "الحقيقيين" (تصحيح نجمي/sidereal بدل
// التقويمي الصرف)، إعادة ترتيب حقول البرج/المنزلة (الدرجة قبل الاسم) ومواقيت الصلاة (دمج
// الأوقات الإضافية الأربعة مع الستة الأصلية في تسلسل زمني واحد)، وإضافة جهة القبلة وارتفاع
// الشمس عند استقبالها في تبويب القبلة - يضمن أن من ثبّت نسخة سابقة فعلا يحصل على غلاف
// مُحدَّث نظيف (تُحذف كل مداخل v5 القديمة في activate أدناه) بدل الاستمرار في تصفّح نسخة
// مخبّأة قديمة بلا هذه التغييرات إلى ما لا نهاية.
const CACHE_NAME = 'falak-app-shell-v6'

const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/ui/styles.css',
  'src/ui/app.js',
  'src/ui/render.js',
  'src/core/engine.js',
  'src/core/format.js',
  'src/core/i18n.js',
  'src/core/hijri.js',
  'src/core/moon.js',
  'src/core/prayerTimes.js',
  'src/core/qibla.js',
  'src/core/reader.js',
  'src/core/riseSetUtil.js',
  'src/core/siderealTimes.js',
  'src/core/sun.js',
  'src/core/timeutil.js',
  'src/core/zodiac.js',
  'public/icon.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // لا نعطّل التثبيت إن تعذّر تخزين بعض الملفات مسبقا (مسارات نسبية مختلفة بين الاستضافات)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch (e) { return }
  if (url.origin !== self.location.origin) return // نترك الموارد الخارجية (الخطوط مثلا) للشبكة مباشرة

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {})
        }
        return res
      }).catch(() => cached)
    })
  )
})
