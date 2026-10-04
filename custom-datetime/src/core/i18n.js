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
    'settings.prayerHeading': 'مواقيت الصلاة',
    'settings.fajrAngleLabel': 'زاوية الفجر (تحت الأفق)',
    'settings.asrMethodLabel': 'مذهب العصر',
    'settings.ishaModeOffset': 'العشاء بعد المغرب بعدد دقائق',
    'settings.ishaModeAngle': 'العشاء بزاوية فلكية',
    'settings.ishaOffsetLabel': 'عدد الدقائق بعد المغرب',
    'settings.ishaAngleLabel': 'زاوية العشاء (تحت الأفق)',
    'settings.voiceHeading': 'القارئ الصوتي',
    'settings.voiceSelectLabel': 'صوت القراءة',
    'settings.voiceAutoOption': 'تلقائي (أول صوت عربي يوفّره الجهاز)',
    'settings.voiceNoneFound': 'لم يُعثر على صوت عربي مثبَّت على هذا الجهاز',
    'settings.rateLabel': 'سرعة النطق',
    'settings.testVoiceBtn': '🔊 تجربة الصوت',
    'settings.voiceTestSentence': 'هذا اختبار لجودة النطق: الساعة الآن الثالثة والنصف مساء.',
    'settings.voiceHint': 'جودة النطق تعتمد على الصوت العربي المثبَّت على جهازكم لا على التطبيق نفسه - إن توفر أكثر من صوت عربي جرّبوها هنا واختاروا الأوضح. تقليل السرعة قد يحسّن وضوح بعض الأصوات.',
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
    'settings.prayerHeading': 'Horaires de prière',
    'settings.fajrAngleLabel': "Angle du Fajr (sous l'horizon)",
    'settings.asrMethodLabel': "École de calcul de l'Asr",
    'settings.ishaModeOffset': 'Isha un nombre de minutes après le Maghrib',
    'settings.ishaModeAngle': 'Isha selon un angle astronomique',
    'settings.ishaOffsetLabel': 'Nombre de minutes après le Maghrib',
    'settings.ishaAngleLabel': "Angle de l'Isha (sous l'horizon)",
    'settings.voiceHeading': 'Lecture vocale',
    'settings.voiceSelectLabel': 'Voix de lecture',
    'settings.voiceAutoOption': 'Automatique (première voix française disponible)',
    'settings.voiceNoneFound': "Aucune voix française installée n'a été trouvée sur cet appareil",
    'settings.rateLabel': 'Vitesse de lecture',
    'settings.testVoiceBtn': '🔊 Tester la voix',
    'settings.voiceTestSentence': "Ceci est un test de qualité vocale : il est actuellement trois heures et demie de l'après-midi.",
    'settings.voiceHint': "La qualité de la voix dépend de la voix française installée sur votre appareil, pas de l'application elle-même - si plusieurs voix françaises sont disponibles, essayez-les ici et choisissez la plus claire. Réduire la vitesse peut améliorer la clarté de certaines voix.",
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
