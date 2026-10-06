/**
 * sw.js — عامل خدمة بسيط وآمن.
 *
 * الغرض: (أ) تخزين غلاف التطبيق محليا ليعمل دون اتصال، و(ب) تسجيل عامل خدمة فعلي - شرط
 * تعتمده بعض المتصفحات لإتاحة خيار "تثبيت" الصفحة كتطبيق مستقل.
 *
 * لا يتدخل في أي طلب لمصدر خارجي (خطوط جوجل مثلا) - تلك الطلبات تذهب للشبكة مباشرة كالعادة.
 * وإن تعذّر أي شيء هنا (حتى التسجيل نفسه) يستمر التطبيق في العمل بشكل طبيعي تماما بلا كاش.
 */
// اسم كاش مستقل كليا عن النسخة الأولى (../sw.js): عامل الخدمة هنا مسجَّل بنطاق مختلف
// (custom-datetime/) لكن Cache Storage، كـlocalStorage، مرتبط بالأصل (origin) لا بمسار
// عامل الخدمة - فلو تشارك الاسم مع النسخة الأولى لأصبح الكاش حرفيا كائنا واحدا مشتركا بين
// النسختين (انظر نفس الملاحظة بخصوص STORAGE_KEY في src/ui/app.js).
// رُفع رقم الإصدار إلى v8 (تراكميا منذ v6) مع إضافتين:
//  (v7) نافذة زمنية قابلة للضبط من الإعدادات للقراءة الآلية كل نصف ساعة (مثلا 6 صباحا - منتصف
//       الليل) - تبقى صامتة تلقائيا خارجها بدل القراءة ليلا ونهارا، وزر "قراءة الآن" يعمل دوما
//       بصرف النظر عنها.
//  (v8) تقويم هجري بثلاث طرق قابلة للاختيار من الإعدادات بدل طريقة واحدة مفروضة: الكويتي
//       (حسابي جدولي، بعد إصلاح خطأ في نقطة الأساس كان يُؤخِّر التاريخ المعروض يوما كاملا عن
//       الصحيح)، أم القرى الرسمي (جدول بيانات رسمي معتمد في السعودية)، والفلكي المحسوب (اقتران
//       القمر الفعلي + غروب الشمس عند موقع المستخدم). يضمن رفع رقم الإصدار أن من ثبّت هذه النسخة
//       فعلا يحصل فورا على كل هذه الإصلاحات والميزات بدل الاستمرار في تشغيل نسخة مخزَّنة قديمة.
const CACHE_NAME = 'falak-app-custom-datetime-shell-v8'

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
