import type { LanguageCode } from './types';

export interface TranslationStrings {
  deploy: string;
  settings: string;
  hostGuide: string;
  callsign: string;
  sectorLabel: string;
  controlHintDesktop: string;
  controlHintTouch: string;
  resume: string;
  restartPosition: string;
  editHud: string;
  returnMenu: string;
  pausedTitle: string;
  resetDefaults: string;
  saveClose: string;
  tabs: {
    graphics: string;
    controls: string;
    audio: string;
    gameplay: string;
  };
  graphics: {
    preset: string;
    low: string;
    medium: string;
    high: string;
    ultra: string;
    auto: string;
    resolutionScale: string;
    fpsCap: string;
    shadows: string;
    shadowQuality: string;
    drawDistance: string;
    textureQuality: string;
    antiAliasing: string;
    fog: string;
    bloom: string;
    motionBlur: string;
    foliageDensity: string;
    particleDensity: string;
    showFpsPing: string;
    short: string;
    long: string;
  };
  controls: {
    sensHip: string;
    sensAds: string;
    sensScope: string;
    sensVehicle: string;
    sensAircraft: string;
    sensShip: string;
    invertY: string;
    aimAssist: string;
    joystickSize: string;
    joystickOpacity: string;
    joystickPosition: string;
    dynamic: string;
    fixed: string;
    fireButtonSide: string;
    left: string;
    right: string;
    autoFire: string;
    autoSprint: string;
    tiltAircraft: string;
    haptics: string;
    forceTouchHud: string;
    editHudBtn: string;
  };
  audio: {
    master: string;
    music: string;
    effects: string;
    voice: string;
    ambient: string;
  };
  gameplay: {
    language: string;
    fov: string;
    crosshairStyle: string;
    crosshairColor: string;
    hitMarkers: string;
    damageNumbers: string;
    colorblindMode: string;
    cross: string;
    dot: string;
    chevron: string;
    dynamic: string;
    none: string;
    protanopia: string;
    deuteranopia: string;
    tritanopia: string;
  };
  hud: {
    fire: string;
    aim: string;
    reload: string;
    crouch: string;
    jump: string;
    reloading: string;
    cycling: string;
    standing: string;
    crouching: string;
    sprinting: string;
    clickToAim: string;
    hudEditorTitle: string;
    hudEditorHint: string;
    done: string;
    resetLayout: string;
  };
  host: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
    close: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: {
    deploy: 'Deploy to Front',
    settings: 'Settings',
    hostGuide: 'Host Guide',
    callsign: 'Callsign',
    sectorLabel: 'Somme Sector 4 · 1917 · Infantry Field Test',
    controlHintDesktop: 'WASD Move · Shift Sprint · C Crouch · Space Jump · Click Aim/Fire · R Reload · Esc Pause',
    controlHintTouch: 'Left Stick Move · Drag Right Side Look · Fire / ADS / Reload Touch Controls',
    resume: 'Resume Combat',
    restartPosition: 'Reset Position',
    editHud: 'Edit HUD Layout',
    returnMenu: 'Return to Main Menu',
    pausedTitle: 'Field Pause',
    resetDefaults: 'Reset to Default',
    saveClose: 'Done',
    tabs: {
      graphics: 'Graphics',
      controls: 'Controls',
      audio: 'Audio',
      gameplay: 'Gameplay',
    },
    graphics: {
      preset: 'Quality Preset',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      ultra: 'Ultra',
      auto: 'Auto',
      resolutionScale: 'Render Resolution Scale',
      fpsCap: 'FPS Cap',
      shadows: 'Dynamic Shadows',
      shadowQuality: 'Shadow Quality',
      drawDistance: 'Draw Distance',
      textureQuality: 'Texture Quality',
      antiAliasing: 'Anti-Aliasing',
      fog: 'Atmospheric Fog',
      bloom: 'Bloom',
      motionBlur: 'Motion Blur',
      foliageDensity: 'Foliage Density',
      particleDensity: 'Particle Density',
      showFpsPing: 'FPS & Ping Counter',
      short: 'Short',
      long: 'Long',
    },
    controls: {
      sensHip: 'Hip Look Sensitivity',
      sensAds: 'ADS Look Sensitivity',
      sensScope: 'Scope Sensitivity',
      sensVehicle: 'Vehicle Sensitivity',
      sensAircraft: 'Aircraft Sensitivity',
      sensShip: 'Ship Sensitivity',
      invertY: 'Invert Y Axis',
      aimAssist: 'Touch Aim Assist',
      joystickSize: 'Joystick Size',
      joystickOpacity: 'Joystick Opacity',
      joystickPosition: 'Joystick Mode',
      dynamic: 'Dynamic',
      fixed: 'Fixed',
      fireButtonSide: 'Fire Button Side',
      left: 'Left',
      right: 'Right',
      autoFire: 'Auto-Fire on Target',
      autoSprint: 'Auto-Sprint',
      tiltAircraft: 'Tilt Controls (Aircraft)',
      haptics: 'Haptic Vibration',
      forceTouchHud: 'Show Touch Controls on Desktop',
      editHudBtn: 'Customize HUD Layout',
    },
    audio: {
      master: 'Master Volume',
      music: 'Music Volume',
      effects: 'Effects Volume',
      voice: 'Voice & Callouts',
      ambient: 'Battlefield Ambient',
    },
    gameplay: {
      language: 'Language',
      fov: 'Field of View (FOV)',
      crosshairStyle: 'Crosshair Style',
      crosshairColor: 'Crosshair Color',
      hitMarkers: 'Hit Markers',
      damageNumbers: 'Damage Numbers',
      colorblindMode: 'Colorblind Mode',
      cross: 'Cross',
      dot: 'Dot',
      chevron: 'Chevron',
      dynamic: 'Dynamic',
      none: 'Standard',
      protanopia: 'Protanopia',
      deuteranopia: 'Deuteranopia',
      tritanopia: 'Tritanopia',
    },
    hud: {
      fire: 'FIRE',
      aim: 'ADS',
      reload: 'RLD',
      crouch: 'CRCH',
      jump: 'JMP',
      reloading: 'Reloading',
      cycling: 'Chambering',
      standing: 'Standing',
      crouching: 'Crouched',
      sprinting: 'Sprinting',
      clickToAim: 'Click viewport to lock mouse aim · Esc for pause',
      hudEditorTitle: 'HUD Layout Editor',
      hudEditorHint: 'Drag any control to reposition it for your thumbs.',
      done: 'Save Layout',
      resetLayout: 'Reset Layout',
    },
    host: {
      title: 'Hosting a LAN Server',
      subtitle: 'Run Ashfront on any laptop or Android Termux node over local WiFi or mobile hotspot.',
      step1Title: '1. Start the Authoritative Server',
      step1Body: 'From the project folder run `npm install` once, then `node server/server.js`. The terminal prints all local WiFi & hotspot URLs on port 3000.',
      step2Title: '2. Connect Players on Same WiFi / Hotspot',
      step2Body: 'Have squadmates open Chrome on Android or desktop and enter the printed http://SERVER_IP:3000 address (or enter it in the Phase 2 Connect screen).',
      step3Title: '3. APK & Capacitor Ready',
      step3Body: 'Run `npm run build` to generate the static bundle inside `dist/` ready to wrap with Capacitor for Android APK distribution.',
      close: 'Close',
    },
  },
  ar: {
    deploy: 'انطلق إلى الجبهة',
    settings: 'الإعدادات',
    hostGuide: 'دليل الاستضافة',
    callsign: 'الاسم الحركي',
    sectorLabel: 'قطاع السوم ٤ · ١٩١٧ · اختبار المشاة الميداني',
    controlHintDesktop: 'WASD حركة · Shift ركض · C انحناء · Space قفز · نقر تصويب وإطلاق · R تلقيم · Esc إيقاف',
    controlHintTouch: 'عصا اليسار للحركة · اسحب اليمين للتوجيه · أزرار اللمس للإطلاق والتصويب',
    resume: 'استئناف القتال',
    restartPosition: 'إعادة التمركز',
    editHud: 'تعديل تخطيط الأزرار',
    returnMenu: 'العودة للقائمة الرئيسية',
    pausedTitle: 'إيقاف مؤقت',
    resetDefaults: 'استعادة الافتراضي',
    saveClose: 'تم',
    tabs: {
      graphics: 'الرسوميات',
      controls: 'التحكم',
      audio: 'الصوت',
      gameplay: 'اللعب',
    },
    graphics: {
      preset: 'مستوى الجودة',
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      ultra: 'فائق',
      auto: 'تلقائي',
      resolutionScale: 'دقة التصيير',
      fpsCap: 'حد الإطارات',
      shadows: 'الظلال الديناميكية',
      shadowQuality: 'جودة الظلال',
      drawDistance: 'مدى الرؤية',
      textureQuality: 'جودة الخامات',
      antiAliasing: 'تنعيم الحواف',
      fog: 'الضباب الجوي',
      bloom: 'التوهج الضوئي',
      motionBlur: 'ضبابية الحركة',
      foliageDensity: 'كثافة الأعشاب',
      particleDensity: 'كثافة الجسيمات',
      showFpsPing: 'عداد الإطارات والبنغ',
      short: 'قريب',
      long: 'بعيد',
    },
    controls: {
      sensHip: 'حساسية النظر العادي',
      sensAds: 'حساسية التصويب',
      sensScope: 'حساسية المنظار',
      sensVehicle: 'حساسية المركبات',
      sensAircraft: 'حساسية الطائرات',
      sensShip: 'حساسية السفن',
      invertY: 'عكس المحور العمودي',
      aimAssist: 'مساعدة التصويب باللمس',
      joystickSize: 'حجم عصا التحكم',
      joystickOpacity: 'شفافية عصا التحكم',
      joystickPosition: 'نمط عصا التحكم',
      dynamic: 'ديناميكي',
      fixed: 'ثابت',
      fireButtonSide: 'موقع زر الإطلاق',
      left: 'يسار',
      right: 'يمين',
      autoFire: 'إطلاق تلقائي على الهدف',
      autoSprint: 'ركض تلقائي',
      tiltAircraft: 'إمالة الهاتف للطائرات',
      haptics: 'الاهتزاز اللمسي',
      forceTouchHud: 'إظهار أزرار اللمس على الحاسوب',
      editHudBtn: 'تخصيص أماكن الأزرار',
    },
    audio: {
      master: 'الصوت الرئيسي',
      music: 'الموسيقى',
      effects: 'المؤثرات',
      voice: 'الأوامر الصوتية',
      ambient: 'أجواء المعركة',
    },
    gameplay: {
      language: 'اللغة',
      fov: 'زاوية الرؤية',
      crosshairStyle: 'شكل المؤشر',
      crosshairColor: 'لون المؤشر',
      hitMarkers: 'علامات الإصابة',
      damageNumbers: 'أرقام الضرر',
      colorblindMode: 'وضع عمى الألوان',
      cross: 'متقاطع',
      dot: 'نقطة',
      chevron: 'سهم',
      dynamic: 'ديناميكي',
      none: 'قياسي',
      protanopia: 'بروتانوبيا',
      deuteranopia: 'ديوتيرانوبيا',
      tritanopia: 'تريتانوبيا',
    },
    hud: {
      fire: 'إطلاق',
      aim: 'تصويب',
      reload: 'تلقيم',
      crouch: 'انحناء',
      jump: 'قفز',
      reloading: 'جاري التلقيم',
      cycling: 'سحب الترباس',
      standing: 'واقف',
      crouching: 'منحنٍ',
      sprinting: 'يركض',
      clickToAim: 'انقر لتثبيت التصويب · Esc للإيقاف',
      hudEditorTitle: 'محرر تخطيط الواجهة',
      hudEditorHint: 'اسحب أي زر لتغيير موضعه بما يناسب يديك.',
      done: 'حفظ التخطيط',
      resetLayout: 'إعادة تعيين',
    },
    host: {
      title: 'استضافة خادم محلي',
      subtitle: 'شغّل Ashfront على أي حاسوب أو هاتف عبر شبكة WiFi المحلية أو نقطة الاتصال.',
      step1Title: '١. تشغيل الخادم',
      step1Body: 'من مجلد المشروع نفذ `npm install` مرة واحدة ثم `node server/server.js`. سيطبع الطرفي عناوين الشبكة المحلية على المنفذ 3000.',
      step2Title: '٢. اتصال اللاعبين بنفس الشبكة',
      step2Body: 'يفتح اللاعبون متصفح Chrome ويدخلون العنوان http://SERVER_IP:3000 الظاهر في الطرفية.',
      step3Title: '٣. جاهز لبناء APK عبر Capacitor',
      step3Body: 'شغّل `npm run build` لإنتاج حزمة ثابتة في `dist/` جاهزة للتغليف في تطبيق أندرويد.',
      close: 'إغلاق',
    },
  },
};
