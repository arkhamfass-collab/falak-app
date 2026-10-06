/**
 * src/core/i18n.js
 * طبقة ترجمة الواجهة: قاموس عربي/فرنسي لكل النصوص الثابتة في index.html (عبر data-i18n
 * وdata-i18n-attr)، بالإضافة إلى العبارات التي تُبنى ديناميكيا في render.js/app.js (عناوين
 * الأقسام، رسائل تحديد الموقع، خيارات الأصوات...) بحيث تبقى الترجمتان في مكان واحد.
 *
 * التصميم: اللغة طبقة عرض بحتة - محرك الحساب (engine.js وما تحته) يبقى كما هو، يُرجع قيما
 * خاما وأسماء بكلتا اللغتين حيث يلزم (مثل phaseNameArabic/phaseNameFrench) - هذا الملف
 * مسؤول فقط عن النصوص الثابتة والقوالب، لا عن أي حساب فلكي أو شرعي.
 */

export const DEFAULT_LANG = 'ar'
export const SUPPORTED_LANGS = ['ar', 'fr']

export const STRINGS = {
  ar: {
    // عنوان مميَّز عن النسخة الأولى (لفظ "(تاريخ مخصص)" إضافي) حتى يسهل تمييز تبويبي المتصفح/
    // أيقونتي PWA عن بعضهما عند تثبيت النسختين معا على نفس الجهاز.
    'app.title': 'الحاسبة الفلكية الشرعية (تاريخ مخصص)',
    'header.locationTitle': 'الموقع الحالي',
    'header.settingsTitle': 'الإعدادات',

    // شارة الترويسة التي تظهر فقط في وضع "تاريخ ووقت محدد" (راجع app.js → updateCustomTimeBadge)
    'datetime.badgeCustom': '⏸ محسوبة عند: {datetime} — ثابتة، لا تتحدّث مع الساعة الحقيقية',

    'tabs.time': 'الصلاة والوقت',
    'tabs.sun': 'الشمس',
    'tabs.moon': 'القمر',
    'tabs.sidereal': 'الوقت النجمي',
    'tabs.qibla': 'القبلة',

    'prayer.panelTitle': 'مواقيت الصلاة',
    'prayer.fajr': 'الفجر',
    'prayer.sunrise': 'الشروق',
    'prayer.dhuhr': 'الظهر',
    'prayer.asr': 'العصر',
    'prayer.maghrib': 'المغرب',
    'prayer.isha': 'العشاء',
    'prayer.hint': 'طريقة الحساب: فجر بزاوية {fajrAngle}، عصر بمذهب {asrMethod}، عشاء بعد المغرب بـ{ishaInfo} دقيقة. يمكن تعديل هذه القيم من الإعدادات ⚙.',
    'prayer.hintIshaAngleSuffix': '° (بزاوية)',
    'prayer.asrJumhurShort': 'الجمهور',
    'prayer.asrHanafiShort': 'الحنفية',
    'prayer.asrOptionJumhur': 'الجمهور (الشافعية/المالكية/الحنابلة)',
    'prayer.asrOptionHanafi': 'الحنفية',

    'prayer.extraGroupTitle': 'أوقات شرعية إضافية',
    'prayer.lastThirdLabel': 'بداية الثلث الأخير من الليل',
    'prayer.isfarAlaLabel': 'الإسفار الأعلى',
    'prayer.naflLabel': 'وقت حل النافلة',
    'prayer.asrMukhtarEndLabel': 'نهاية الوقت المختار للعصر',
    'prayer.extraNotTodayFallback': 'لم يقع اليوم عند موقعكم',
    'prayer.extraHint': 'الليلة الشرعية: من الغروب إلى طلوع الفجر. الإسفار الأعلى: ارتفاع الشمس ‑٦°. حل النافلة: ارتفاعها +٤° ("قيد رمح"). نهاية المختار للعصر: الظل = ظل الزوال + ضِعف طول العود. يمكن تعديل زاويتي الإسفار والنافلة من الإعدادات ⚙.',

    'common.eclLon': 'الطول البروجي',
    'common.distFromEarth': 'البعد عن الأرض',
    'common.eqGroupTitle': 'الإحداثيات الاستوائية',
    'common.ra': 'المطلع المستقيم',
    'common.dec': 'الميل',
    'common.hzGroupTitle': 'الإحداثيات الأفقية (الآن)',
    'common.altitude': 'الارتفاع',
    'common.azimuth': 'السمت',
    'common.hourAngle': 'الزاوية الساعية',
    'common.rise': 'الشروق',
    'common.set': 'الغروب',
    'common.transit': 'الزوال',
    'common.zodiacGroupTitle': 'البرج والمنزلة',
    'common.zodiacSignLabel': 'البرج',
    'common.degreeInSignLabel': 'الدرجة في البرج',
    'common.manzilLabel': 'المنزلة',
    'common.degreeInManzilLabel': 'الدرجة في المنزلة',

    'sun.panelTitle': 'بيانات الشمس',
    'sun.eclGroupTitle': 'الإحداثيات البروجية (السماوية)',
    'sun.rtsGroupTitle': 'الشروق والزوال والغروب',
    'sun.shadowGroupTitle': 'الظل (لعود ارتفاعه {gnomon} سم)',
    'sun.shadowZawalLabel': 'ظل الزوال',
    'sun.shadowNowLabel': 'ظل الوقت الحالي',
    'sun.shadowAzimuthNowLabel': 'سمت الظل الآن',
    'sun.shadowNowFallback': 'الشمس تحت الأفق',
    'sun.dayNightGroupTitle': 'طول النهار والليل',
    'sun.dayLenLabel': 'طول النهار',
    'sun.nightLenLabel': 'طول الليل',
    'sun.auSuffix': ' و.ف',
    'sun.cmSuffix': ' سم',

    'moon.panelTitle': 'بيانات القمر',
    'moon.eclGroupTitle': 'الإحداثيات البروجية',
    'moon.eclLatLabel': 'العرض البروجي',
    'moon.rtsGroupTitle': 'الشروق والعبور والغروب',
    'moon.transit': 'العبور',
    'moon.miscGroupTitle': 'المطال والعمر والبعد والطور',
    'moon.elongLabel': 'المطال (عن الشمس)',
    'moon.ageLabel': 'العمر',
    'moon.phaseLabel': 'الطور الحالي',
    'moon.illumLabel': 'نسبة الإضاءة',
    'moon.nextNewGroupTitle': 'الاقتران القادم (المحاق)',
    'moon.nextNewUtcLabel': 'بالتوقيت العالمي UTC',
    'moon.nextNewLocalLabel': 'بالتوقيت المحلي',
    'moon.daySuffix': ' يوما',
    'moon.kmSuffix': ' كم',

    'sidereal.panelTitle': 'الوقت النجمي',
    'sidereal.gst0Label': 'GST0 — الوقت النجمي بغرينتش عند 0 سا عالمي',
    'sidereal.gstLabel': 'GST — الوقت النجمي بغرينتش الآن',
    'sidereal.lstLabel': 'LST — الوقت النجمي المحلي',
    'sidereal.hint': 'GST0 يُحسب عند منتصف الليل بالتوقيت العالمي لليوم الحالي، وGST هو امتداده الدائر مع الزمن الآن بغرينتش، وLST هو GST مضافا إليه خط طول موقعكم شرقا (بالساعات).',

    'qibla.panelTitle': 'اتجاه القبلة',
    'qibla.azimuthGroupTitle': 'سمت القبلة من موقعكم',
    'qibla.azimuthLabel': 'سمت القبلة',
    'qibla.directionLabel': 'جهة القبلة',
    'qibla.alignmentGroupTitle': 'محاذاة الشمس أو الظل للقبلة اليوم',
    'qibla.altitudeAtFacingLabel': 'ارتفاع الشمس عند الاستقبال',
    'qibla.sunTowardLabel': 'وقت اتجاه الشمس نحو القبلة',
    'qibla.shadowTowardLabel': 'وقت اتجاه الظل نحو القبلة',
    'qibla.notTodayFallback': 'لا يحدث اليوم عند موقعكم',
    'qibla.hint': 'سمت القبلة محسوب بالصيغة الكروية الدقيقة (دائرة عظمى)، لا بخط مستقيم على خريطة مسطَّحة. محاذاة الظل تعني أن ظل أي عمود عمودي يشير تماما نحو القبلة في تلك اللحظة؛ ومحاذاة الشمس تعني أنها هي نفسها في اتجاه القبلة تماما. قد لا تقع إحداهما أو كلتاهما في بعض الأيام بحسب خط العرض والفصل.',

    'footer.speakNow': '🔊 قراءة الآن',
    'footer.autoRead': 'القراءة الآلية كل نصف ساعة',

    'settings.title': 'الإعدادات',
    'settings.languageHeading': 'اللغة',
    'settings.locationHeading': 'الموقع الجغرافي',
    'settings.locModeAuto': 'تحديد تلقائي',
    'settings.locModeManual': 'إدخال يدوي',
    'settings.detectLocationBtn': '📍 تحديد الموقع تلقائيا',
    'settings.latLabel': 'خط العرض (شمالا +، جنوبا -)',
    'settings.lonLabel': 'خط الطول (شرقا +، غربا -)',
    'settings.tzHeading': 'المنطقة الزمنية',
    'settings.tzIndependenceHint': 'تُضبط المنطقة الزمنية دائما يدويا هنا، بشكل مستقل تماما عن تحديد الموقع الجغرافي (تلقائيا كان أو يدويا) أعلاه.',
    'settings.tzModeTz': 'منطقة زمنية (تراعي التوقيت الصيفي تلقائيا)',
    'settings.tzModeOffset': 'إزاحة ثابتة عن UTC',
    'settings.tzSelectLabel': 'المنطقة الزمنية',
    'settings.tzOffsetLabel': 'الإزاحة عن UTC بالساعات',

    'settings.dateTimeHeading': 'التاريخ والوقت',
    'settings.dateTimeHint': 'اختاروا "الوقت الحالي" للحساب المستمر مع الساعة كالمعتاد، أو "تاريخ ووقت محدد" لتجميد كل الحسابات في هذه الصفحة على لحظة بعينها - تُفسَّر حسب المنطقة الزمنية المضبوطة أعلاه - لمقارنة النتائج ببرامج فلكية أو مواقيت أخرى.',
    'settings.dateTimeModeNow': 'الوقت الحالي (مستمر)',
    'settings.dateTimeModeCustom': 'تاريخ ووقت محدد (ثابت)',
    'settings.customDateLabel': 'التاريخ (بالتوقيت المحلي المضبوط أعلاه)',
    'settings.customTimeLabel': 'الوقت (بالتوقيت المحلي المضبوط أعلاه)',

    'settings.gnomonLabel': 'طول عود الظل (سم)',
    'settings.hijriHeading': 'التقويم الهجري',
    'settings.hijriMethodKuwaiti': 'التقويم الكويتي (حسابي جدولي)',
    'settings.hijriMethodUmmAlQura': 'تقويم أم القرى (الرسمي في السعودية)',
    'settings.hijriMethodAstronomical': 'تقويم فلكي محسوب (اقتران + غروب)',
    'settings.hijriMethodHint': 'التقويم الكويتي حسابي جدولي تقليدي بالتناوب بين شهور 30 و29 يوما، ولا يعتمد على رصد فلكي فعلي. تقويم أم القرى هو التقويم الرسمي المعتمد في المملكة العربية السعودية (متوفر فقط بين عامي 1318 و1500هـ، وخارج هذا المدى يُستخدم التقويم الكويتي تلقائيا بدلا عنه). التقويم الفلكي المحسوب يحسب بداية كل شهر فعليا بناء على لحظة الاقتران الفلكي للقمر وغروب الشمس في موقعكم الجغرافي. اختلاف التاريخ يوما واحدا بين الطرق الثلاث أمر طبيعي ومتوقع وليس خطأ.',
    'settings.prayerHeading': 'مواقيت الصلاة',
    'settings.fajrAngleLabel': 'زاوية الفجر (تحت الأفق)',
    'settings.asrMethodLabel': 'مذهب العصر',
    'settings.ishaModeOffset': 'العشاء بعد المغرب بعدد دقائق',
    'settings.ishaModeAngle': 'العشاء بزاوية فلكية',
    'settings.ishaOffsetLabel': 'عدد الدقائق بعد المغرب',
    'settings.ishaAngleLabel': 'زاوية العشاء (تحت الأفق)',
    'settings.isfarAngleLabel': 'زاوية الإسفار الأعلى (تحت الأفق)',
    'settings.naflAltitudeLabel': 'ارتفاع حل النافلة ("قيد رمح")',
    'settings.adhanHeading': 'الأذان',
    'settings.adhanEnabledLabel': 'تفعيل الأذان عند دخول وقت كل صلاة',
    'settings.adhanChoiceMakkah': 'أذان الكعبة المشرفة (مكة)',
    'settings.adhanChoiceEgypt': 'أذان جمهورية مصر (القاهرة - الشيخ محمد رفعت)',
    'settings.adhanChoiceQuds': 'أذان القدس (تسجيل من فلسطين)',
    'settings.testAdhanBtn': '🔊 تجربة الأذان المختار',
    'settings.tahajjudEnabledLabel': 'تنبيه أذان سادس للتهجد قبل الفجر',
    'settings.tahajjudOffsetLabel': 'عدد الدقائق قبل أذان الفجر',
    'settings.adhanHint': 'يرنّ الأذان المختار تلقائيا عند دخول كل وقت من الأوقات الخمسة (وتنبيه التهجد السادس إن فُعِّل)، بصرف النظر تماما عن نافذة القراءة الآلية أدناه (تلك خاصة بالنطق الآلي كل نصف ساعة فقط، لا بالأذان). يعمل هذا ما دامت الصفحة مفتوحة فعليا على الجهاز - لا يرن والجهاز نائم أو الصفحة مغلقة. ملاحظة: أذان القدس هنا تسجيل عام من فلسطين، لا تسجيل مؤكد من المسجد الأقصى بعينه.',
    'settings.voiceHeading': 'القارئ الصوتي',
    'settings.voiceSelectLabel': 'صوت القراءة',
    'settings.voiceAutoOption': 'تلقائي (أول صوت عربي يوفّره الجهاز)',
    'settings.voiceNoneFound': 'لم يُعثر على صوت عربي مثبَّت على هذا الجهاز',
    'settings.rateLabel': 'سرعة النطق',
    'settings.testVoiceBtn': '🔊 تجربة الصوت',
    'settings.voiceTestSentence': 'هذا اختبار لجودة النطق: الساعة الآن الخامسة عشرة والنصف.',
    'settings.voiceHint': 'جودة النطق تعتمد على الصوت العربي المثبَّت على جهازكم لا على التطبيق نفسه - إن توفر أكثر من صوت عربي جرّبوها هنا واختاروا الأوضح. تقليل السرعة قد يحسّن وضوح بعض الأصوات.',
    'settings.autoReadStartLabel': 'بداية نافذة القراءة التلقائية',
    'settings.autoReadEndLabel': 'نهاية نافذة القراءة التلقائية',
    'settings.autoReadWindowHint': 'تسري على "القراءة الآلية كل نصف ساعة" فقط (زر "قراءة الآن" يعمل دائما بصرف النظر عنها) - تبقى ساكتة خارج هذه النافذة الزمنية بدل القراءة طوال اليوم والليل، وتعاود القراءة تلقائيا عند دخول النافذة من جديد دون أي تدخل. اجعلا الوقتين متساويين لإلغاء القيد والقراءة طوال اليوم.',
    'settings.save': 'حفظ',
    'settings.close': 'إغلاق',

    'status.testingVoice': 'جارٍ تجربة الصوت...',
    'status.testDone': 'تمت التجربة.',
    'status.reading': 'جارٍ القراءة...',
    'status.readDone': 'تمت القراءة.',
    'status.speechFailed': 'تعذّر النطق الصوتي في هذا المتصفح.',

    'geo.notSupported': 'خدمة تحديد الموقع غير متوفرة في هذا المتصفح. استعملوا الإدخال اليدوي.',
    'geo.locating': 'جارٍ تحديد الموقع...',
    'geo.successTemplate': 'تم تحديد الموقع: {lat}°, {lon}°',
    'geo.detectedTzNote': ' — ملاحظة: المنطقة الزمنية المكتشَفة من جهازكم هي {tz}، ولم تُطبَّق تلقائيا؛ يمكنكم ضبطها يدويا من قسم «المنطقة الزمنية» أدناه إن رغبتم.',
    'geo.errorDenied': 'تم رفض إذن الموقع. تحقّقوا من: أيقونة القفل/الموقع 🔒 بجانب شريط العنوان، ثم من صلاحية "الموقع" الممنوحة للمتصفح نفسه من إعدادات نظام الجهاز (أندرويد: الإعدادات ← التطبيقات ← المتصفح ← الأذونات ← الموقع)، وأن خدمة الموقع في النظام مفعّلة عموما. ثم أعيدوا المحاولة، أو استعملوا الإدخال اليدوي.',
    'geo.errorTimeout': 'انتهى الوقت المسموح دون نتيجة (يحدث غالبا في الأماكن المغلقة). نعاود المحاولة بدقة أقل...',
    'geo.errorUnavailable': 'تعذّر تحديد الموقع حاليا (الموضع غير متوفر). نعاود المحاولة...',
    'geo.errorGeneric': 'تعذّر تحديد الموقع ({message}). يمكنكم استعمال الإدخال اليدوي.',
    'geo.errorUnknown': 'خطأ غير معروف',
    'geo.watchdogTimeout': 'لم يستجب المتصفح لطلب الموقع لا بنجاح ولا برفض صريح — يُحتمل أن تحديد الموقع غير مسموح به في بيئة العرض هذه (مثلا صفحة مفتوحة ضمن معاينة مُضمَّنة). جرّبوا فتح الرابط في نافذة متصفح مستقلة كاملة، وتأكدوا من تفعيل خدمة الموقع للمتصفح من إعدادات النظام، أو استعملوا الإدخال اليدوي أدناه.',

    'compass.north': 'ش',
    'compass.south': 'ج',
    'compass.east': 'شرق',
    'compass.west': 'غرب'
  },

  fr: {
    'app.title': 'Calculateur astronomique des prières (date personnalisée)',
    'header.locationTitle': 'Position actuelle',
    'header.settingsTitle': 'Réglages',

    'datetime.badgeCustom': "⏸ Calculé pour : {datetime} — figé, ne suit pas l'horloge réelle",

    'tabs.time': 'Prière et heure',
    'tabs.sun': 'Soleil',
    'tabs.moon': 'Lune',
    'tabs.sidereal': 'Temps sidéral',
    'tabs.qibla': 'Qibla',

    'prayer.panelTitle': 'Horaires de prière',
    'prayer.fajr': 'Fajr',
    'prayer.sunrise': 'Lever du soleil',
    'prayer.dhuhr': 'Dhuhr',
    'prayer.asr': 'Asr',
    'prayer.maghrib': 'Maghrib',
    'prayer.isha': 'Isha',
    'prayer.hint': "Méthode de calcul : Fajr à {fajrAngle}, Asr selon l'école {asrMethod}, Isha {ishaInfo} minutes après le Maghrib. Ces valeurs se modifient depuis les réglages ⚙.",
    'prayer.hintIshaAngleSuffix': '° (par angle)',
    'prayer.asrJumhurShort': 'Jumhur',
    'prayer.asrHanafiShort': 'Hanafite',
    'prayer.asrOptionJumhur': 'Jumhur (chaféite/malikite/hanbalite)',
    'prayer.asrOptionHanafi': 'Hanafite',

    'prayer.extraGroupTitle': 'Horaires chariatiques supplémentaires',
    'prayer.lastThirdLabel': 'Début du dernier tiers de la nuit',
    'prayer.isfarAlaLabel': "Isfar (clarté avancée avant l'aube)",
    'prayer.naflLabel': 'Heure de licéité de la prière surérogatoire',
    'prayer.asrMukhtarEndLabel': "Fin du temps préféré de l'Asr",
    'prayer.extraNotTodayFallback': "Ne survient pas aujourd'hui à votre position",
    'prayer.extraHint': "Nuit chariatique : du coucher du soleil au lever du Fajr. Isfar : hauteur du Soleil -6°. Licéité de la Nafl : hauteur +4° (\"qid rumh\"). Fin du temps préféré de l'Asr : ombre = ombre au méridien + deux fois la hauteur du gnomon. Les angles de l'Isfar et de la Nafl se modifient depuis les réglages ⚙.",

    'common.eclLon': 'Longitude écliptique',
    'common.distFromEarth': 'Distance à la Terre',
    'common.eqGroupTitle': 'Coordonnées équatoriales',
    'common.ra': 'Ascension droite',
    'common.dec': 'Déclinaison',
    'common.hzGroupTitle': 'Coordonnées horizontales (maintenant)',
    'common.altitude': 'Hauteur',
    'common.azimuth': 'Azimut',
    'common.hourAngle': 'Angle horaire',
    'common.rise': 'Lever',
    'common.set': 'Coucher',
    'common.transit': 'Passage au méridien',
    'common.zodiacGroupTitle': 'Signe du zodiaque et demeure lunaire',
    'common.zodiacSignLabel': 'Signe du zodiaque',
    'common.degreeInSignLabel': 'Degré dans le signe',
    'common.manzilLabel': 'Demeure lunaire (manzil)',
    'common.degreeInManzilLabel': 'Degré dans la demeure',

    'sun.panelTitle': 'Données du Soleil',
    'sun.eclGroupTitle': 'Coordonnées écliptiques (célestes)',
    'sun.rtsGroupTitle': 'Lever, passage au méridien et coucher',
    'sun.shadowGroupTitle': "Ombre (pour un gnomon de {gnomon} cm)",
    'sun.shadowZawalLabel': 'Ombre au passage au méridien',
    'sun.shadowNowLabel': 'Ombre actuelle',
    'sun.shadowAzimuthNowLabel': "Azimut de l'ombre actuelle",
    'sun.shadowNowFallback': "Le Soleil est sous l'horizon",
    'sun.dayNightGroupTitle': 'Durée du jour et de la nuit',
    'sun.dayLenLabel': 'Durée du jour',
    'sun.nightLenLabel': 'Durée de la nuit',
    'sun.auSuffix': ' UA',
    'sun.cmSuffix': ' cm',

    'moon.panelTitle': 'Données de la Lune',
    'moon.eclGroupTitle': 'Coordonnées écliptiques',
    'moon.eclLatLabel': 'Latitude écliptique',
    'moon.rtsGroupTitle': 'Lever, passage au méridien et coucher',
    'moon.transit': 'Passage au méridien',
    'moon.miscGroupTitle': 'Élongation, âge, distance et phase',
    'moon.elongLabel': 'Élongation (par rapport au Soleil)',
    'moon.ageLabel': 'Âge',
    'moon.phaseLabel': 'Phase actuelle',
    'moon.illumLabel': "Taux d'éclairement",
    'moon.nextNewGroupTitle': 'Prochaine conjonction (nouvelle lune)',
    'moon.nextNewUtcLabel': 'En temps universel (UTC)',
    'moon.nextNewLocalLabel': "À l'heure locale",
    'moon.daySuffix': ' j',
    'moon.kmSuffix': ' km',

    'sidereal.panelTitle': 'Temps sidéral',
    'sidereal.gst0Label': 'GST0 — Temps sidéral de Greenwich à 0h temps universel',
    'sidereal.gstLabel': 'GST — Temps sidéral actuel de Greenwich',
    'sidereal.lstLabel': 'LST — Temps sidéral local',
    'sidereal.hint': "GST0 est calculé à minuit temps universel du jour courant ; GST en est le prolongement continu avec le temps à Greenwich ; LST est GST additionné de la longitude est de votre position (en heures).",

    'qibla.panelTitle': 'Direction de la Qibla',
    'qibla.azimuthGroupTitle': 'Azimut de la Qibla depuis votre position',
    'qibla.azimuthLabel': 'Azimut de la Qibla',
    'qibla.directionLabel': 'Direction de la Qibla',
    'qibla.alignmentGroupTitle': "Alignement du Soleil ou de l'ombre avec la Qibla aujourd'hui",
    'qibla.altitudeAtFacingLabel': 'Hauteur du Soleil face à la Qibla',
    'qibla.sunTowardLabel': 'Heure où le Soleil fait face à la Qibla',
    'qibla.shadowTowardLabel': "Heure où l'ombre indique la Qibla",
    'qibla.notTodayFallback': "Ne se produit pas aujourd'hui à votre position",
    'qibla.hint': "L'azimut de la Qibla est calculé par la formule sphérique exacte (grand cercle), et non par une ligne droite sur une carte plane. L'alignement de l'ombre signifie que l'ombre de tout objet vertical pointe exactement vers la Qibla à cet instant ; l'alignement du Soleil signifie que le Soleil lui-même se trouve exactement dans la direction de la Qibla. L'un ou l'autre - ou les deux - peut ne pas se produire certains jours, selon la latitude et la saison.",

    'footer.speakNow': '🔊 Lire maintenant',
    'footer.autoRead': 'Lecture automatique toutes les demi-heures',

    'settings.title': 'Réglages',
    'settings.languageHeading': 'Langue',
    'settings.locationHeading': 'Position géographique',
    'settings.locModeAuto': 'Détection automatique',
    'settings.locModeManual': 'Saisie manuelle',
    'settings.detectLocationBtn': '📍 Détecter ma position',
    'settings.latLabel': 'Latitude (nord +, sud -)',
    'settings.lonLabel': 'Longitude (est +, ouest -)',
    'settings.tzHeading': 'Fuseau horaire',
    'settings.tzIndependenceHint': "Le fuseau horaire se règle toujours ici manuellement, indépendamment de la détection de la position géographique ci-dessus (automatique ou manuelle).",
    'settings.tzModeTz': "Fuseau horaire nommé (heure d'été gérée automatiquement)",
    'settings.tzModeOffset': 'Décalage fixe par rapport à UTC',
    'settings.tzSelectLabel': 'Fuseau horaire',
    'settings.tzOffsetLabel': 'Décalage par rapport à UTC (en heures)',

    'settings.dateTimeHeading': 'Date et heure',
    'settings.dateTimeHint': "Choisissez « Heure actuelle » pour un calcul continu comme d'habitude, ou « Date et heure précises » pour figer tous les calculs de cette page sur un instant donné - interprété selon le fuseau horaire réglé ci-dessus - afin de comparer les résultats avec d'autres logiciels astronomiques ou horaires de prière.",
    'settings.dateTimeModeNow': 'Heure actuelle (continue)',
    'settings.dateTimeModeCustom': 'Date et heure précises (figée)',
    'settings.customDateLabel': 'Date (selon le fuseau horaire réglé ci-dessus)',
    'settings.customTimeLabel': 'Heure (selon le fuseau horaire réglé ci-dessus)',

    'settings.gnomonLabel': 'Longueur du gnomon (cm)',
    'settings.hijriHeading': 'Calendrier hégirien',
    'settings.hijriMethodKuwaiti': 'Calendrier koweïtien (tabulaire)',
    'settings.hijriMethodUmmAlQura': 'Calendrier Umm al-Qura (officiel en Arabie saoudite)',
    'settings.hijriMethodAstronomical': 'Calendrier astronomique calculé (conjonction + coucher du soleil)',
    'settings.hijriMethodHint': "Le calendrier koweïtien est un calendrier tabulaire traditionnel alternant des mois de 30 et 29 jours, sans observation astronomique réelle. Le calendrier Umm al-Qura est le calendrier officiel du Royaume d'Arabie saoudite (disponible uniquement entre 1318 et 1500 AH ; en dehors de cette plage, le calendrier koweïtien est utilisé automatiquement à la place). Le calendrier astronomique calculé détermine le début de chaque mois à partir du moment réel de la conjonction lunaire et de l'heure du coucher du soleil à votre position géographique. Il est normal et attendu que la date diffère d'un jour entre ces trois méthodes - ce n'est pas une erreur.",
    'settings.prayerHeading': 'Horaires de prière',
    'settings.fajrAngleLabel': "Angle du Fajr (sous l'horizon)",
    'settings.asrMethodLabel': "École de calcul de l'Asr",
    'settings.ishaModeOffset': 'Isha un nombre de minutes après le Maghrib',
    'settings.ishaModeAngle': 'Isha selon un angle astronomique',
    'settings.ishaOffsetLabel': 'Nombre de minutes après le Maghrib',
    'settings.ishaAngleLabel': "Angle de l'Isha (sous l'horizon)",
    'settings.isfarAngleLabel': "Angle de l'Isfar supérieur (sous l'horizon)",
    'settings.naflAltitudeLabel': 'Hauteur de licéité de la Nafl ("qid rumh")',
    'settings.adhanHeading': 'Adhan (appel à la prière)',
    'settings.adhanEnabledLabel': "Activer l'adhan à l'entrée de chaque heure de prière",
    'settings.adhanChoiceMakkah': 'Adhan de la Mecque (Kaaba)',
    'settings.adhanChoiceEgypt': "Adhan d'Égypte (Le Caire - cheikh Mohammad Rif'at)",
    'settings.adhanChoiceQuds': 'Adhan de Jérusalem (enregistrement de Palestine)',
    'settings.testAdhanBtn': '🔊 Tester cet adhan',
    'settings.tahajjudEnabledLabel': "Alerte d'un sixième appel pour le Tahajjud avant le Fajr",
    'settings.tahajjudOffsetLabel': "Minutes avant l'adhan du Fajr",
    'settings.adhanHint': "L'adhan choisi sonne automatiquement à l'entrée de chacune des cinq heures de prière (et à l'alerte Tahajjud si activée), indépendamment de la fenêtre de lecture automatique ci-dessous (celle-ci ne concerne que la narration vocale toutes les demi-heures, pas l'adhan). Cela fonctionne seulement tant que la page reste ouverte sur l'appareil - rien ne sonne si l'appareil est en veille ou la page fermée. Remarque : l'adhan de Jérusalem ici est un enregistrement général de Palestine, pas un enregistrement confirmé de la mosquée Al-Aqsa elle-même.",
    'settings.voiceHeading': 'Lecture vocale',
    'settings.voiceSelectLabel': 'Voix de lecture',
    'settings.voiceAutoOption': 'Automatique (première voix française disponible)',
    'settings.voiceNoneFound': "Aucune voix française installée n'a été trouvée sur cet appareil",
    'settings.rateLabel': 'Vitesse de lecture',
    'settings.testVoiceBtn': '🔊 Tester la voix',
    'settings.voiceTestSentence': "Ceci est un test de qualité vocale : il est actuellement quinze heures et demie.",
    'settings.voiceHint': "La qualité de la voix dépend de la voix française installée sur votre appareil, pas de l'application elle-même - si plusieurs voix françaises sont disponibles, essayez-les ici et choisissez la plus claire. Réduire la vitesse peut améliorer la clarté de certaines voix.",
    'settings.autoReadStartLabel': 'Début de la fenêtre de lecture automatique',
    'settings.autoReadEndLabel': 'Fin de la fenêtre de lecture automatique',
    'settings.autoReadWindowHint': "S'applique uniquement à la « lecture automatique toutes les demi-heures » (le bouton « Lire maintenant » fonctionne toujours, quelle que soit cette fenêtre) - elle reste silencieuse en dehors de cette plage horaire au lieu de lire jour et nuit, et reprend automatiquement dès l'entrée dans la plage, sans aucune intervention. Mettez les deux heures à égalité pour supprimer la restriction et lire toute la journée.",
    'settings.save': 'Enregistrer',
    'settings.close': 'Fermer',

    'status.testingVoice': 'Test de la voix en cours...',
    'status.testDone': 'Test terminé.',
    'status.reading': 'Lecture en cours...',
    'status.readDone': 'Lecture terminée.',
    'status.speechFailed': 'La synthèse vocale a échoué dans ce navigateur.',

    'geo.notSupported': "Le service de géolocalisation n'est pas disponible dans ce navigateur. Utilisez la saisie manuelle.",
    'geo.locating': 'Détection de la position en cours...',
    'geo.successTemplate': 'Position détectée : {lat}°, {lon}°',
    'geo.detectedTzNote': ' — remarque : le fuseau horaire détecté sur votre appareil est {tz}, mais il n\'a pas été appliqué automatiquement ; réglez-le vous-même dans la section « Fuseau horaire » ci-dessous si besoin.',
    'geo.errorDenied': "L'autorisation de localisation a été refusée. Vérifiez : l'icône de verrou/position 🔒 à côté de la barre d'adresse, puis l'autorisation « Position » accordée au navigateur lui-même dans les réglages système de l'appareil (Android : Paramètres ← Applications ← Navigateur ← Autorisations ← Position), et que le service de localisation du système est activé. Réessayez ensuite, ou utilisez la saisie manuelle.",
    'geo.errorTimeout': "Le délai a expiré sans résultat (fréquent en intérieur). Nouvelle tentative avec une précision réduite...",
    'geo.errorUnavailable': "Impossible de déterminer la position actuellement (position indisponible). Nouvelle tentative...",
    'geo.errorGeneric': 'Impossible de déterminer la position ({message}). Vous pouvez utiliser la saisie manuelle.',
    'geo.errorUnknown': 'erreur inconnue',
    'geo.watchdogTimeout': "Le navigateur n'a répondu ni par un succès ni par un refus explicite à la demande de position — la géolocalisation n'est peut-être pas autorisée dans ce contexte d'affichage (par exemple une page ouverte dans un aperçu intégré). Essayez d'ouvrir le lien dans une fenêtre de navigateur complète et indépendante, vérifiez que le service de localisation est activé pour le navigateur dans les réglages système, ou utilisez la saisie manuelle ci-dessous.",

    'compass.north': 'N',
    'compass.south': 'S',
    'compass.east': 'E',
    'compass.west': 'O'
  }
}

/**
 * يُرجع نص الترجمة لمفتاح key باللغة lang، مع استبدال أي عناصر نائبة {var} بقيم vars إن
 * وُجدت، ومع العودة إلى العربية فالمفتاح نفسه إن تعذّر إيجاد ترجمة (حماية من انهيار العرض
 * بسبب مفتاح ناقص بدل اختفاء النص كليا).
 * @param {string} key
 * @param {'ar'|'fr'} [lang]
 * @param {Object<string,string|number>} [vars]
 */
export function t (key, lang = DEFAULT_LANG, vars) {
  const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG]
  let s = (key in dict) ? dict[key] : ((STRINGS[DEFAULT_LANG] && STRINGS[DEFAULT_LANG][key]) || key)
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
  }
  return s
}

/** اتجاه الصفحة المناسب للغة (الفرنسية من اليسار لليمين، خلافا للعربية) */
export function dirForLang (lang) {
  return lang === 'fr' ? 'ltr' : 'rtl'
}

/**
 * يطبّق الترجمة على كل عناصر DOM الثابتة التي تحمل data-i18n (نص العنصر) أو data-i18n-attr
 * (خاصية أو أكثر، بصيغة "attr1:key1,attr2:key2"). لا يمسّ القيم الديناميكية (data-f) التي
 * يتولاها render.js في كل دورة تحديث.
 */
export function applyTranslations (root, lang) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'), lang)
  })
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr') || ''
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((x) => x && x.trim())
      if (attr && key) el.setAttribute(attr, t(key, lang))
    })
  })
}

export default { DEFAULT_LANG, SUPPORTED_LANGS, STRINGS, t, dirForLang, applyTranslations }
