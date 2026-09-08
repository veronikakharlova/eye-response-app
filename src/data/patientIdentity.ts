/**
 * ПРИДУМАННЫЕ (не реальные) личные данные для таблицы «Пациенты» — по
 * просьбе Вероники, чтобы у каждого пациента было ФИО, дата рождения и
 * комментарий врача, а не только код.
 *
 * Покрывает все 30 кодов: 22 из групп «Норма» / «Глаукома» / «ВМД», у
 * которых реальных ФИО никогда не было, и ещё 8 из группы «Миопия» — для
 * них реальные ФИО есть (см. src/data/myopiaIdentity.ts, гитигнор-файл),
 * но сюда, в общедоступную «Пациенты», намеренно вписаны ДРУГИЕ, тоже
 * придуманные имена: реальный файл нельзя импортировать в этот компонент
 * без него самого — сборка сломается при обычном git-клоне, у которого
 * гитигнор-файла нет.
 *
 * Ни один человек здесь не настоящий — ФИО, даты рождения, диагностические
 * комментарии врача полностью вымышлены, поэтому файл НЕ нужно скрывать
 * через .gitignore.
 *
 * По просьбе Вероники в интерфейсе это никак визуально не помечено как
 * «демо» — выглядит как обычные строки таблицы. Чтобы решение оставалось
 * обратимым, у каждой записи есть поле `synthetic: true`.
 */

export type SyntheticIdentity = {
  code: string
  fio: string
  sex: 'F' | 'M'
  dob: string // ДД.ММ.ГГГГ
  ageFile: number
  testDate: string // ДД.ММ.ГГГГ
  clinic: string
  stage: string
  /** Комментарий врача — то, что показывается в столбце «Примечание» на «Пациентах». */
  comment: string
  synthetic: true
}

const CLINIC = 'Moscow Helmholtz Research Institute of Eye Diseases'

export const PATIENT_IDENTITY: Record<string, SyntheticIdentity> = {
  // --- Норма ---
  AVA: {
    code: 'AVA', fio: 'Andreeva Vera Alekseevna', sex: 'F', dob: '03.03.1957', ageFile: 51,
    testDate: '14.03.2008', clinic: CLINIC, stage: 'без патологии', synthetic: true,
    comment: 'Жалоб не предъявляет, острота зрения в норме, повторный осмотр через год.',
  },
  BL: {
    code: 'BL', fio: 'Baranov Leonid', sex: 'M', dob: '10.02.1963', ageFile: 45,
    testDate: '22.05.2008', clinic: CLINIC, stage: 'без патологии', synthetic: true,
    comment: 'Профилактический осмотр, отклонений не выявлено.',
  },
  KSO: {
    code: 'KSO', fio: 'Kuznetsova Svetlana Olegovna', sex: 'F', dob: '05.09.1966', ageFile: 42,
    testDate: '19.06.2008', clinic: CLINIC, stage: 'без патологии', synthetic: true,
    comment: 'Жалоб нет, рекомендовано динамическое наблюдение раз в год.',
  },
  VDV: {
    code: 'VDV', fio: 'Volkov Denis Viktorovich', sex: 'M', dob: '17.01.1984', ageFile: 24,
    testDate: '11.08.2008', clinic: CLINIC, stage: 'без патологии', synthetic: true,
    comment: 'В детстве травма правого глаза; при осмотре — без признаков активной патологии.',
  },
  LO: {
    code: 'LO', fio: 'Lebedeva Oksana', sex: 'F', dob: '21.06.1986', ageFile: 22,
    testDate: '03.09.2008', clinic: CLINIC, stage: 'без патологии', synthetic: true,
    comment: 'Лёгкая миопия, очковая коррекция подобрана, жалоб нет.',
  },

  // --- Глаукома ---
  HIA: {
    code: 'HIA', fio: 'Hohlova Irina Anatolevna', sex: 'F', dob: '09.04.1929', ageFile: 79,
    testDate: '14.01.2008', clinic: CLINIC, stage: 'развитая стадия', synthetic: true,
    comment: 'ВГД повышено, назначена корректировка гипотензивной терапии, контроль через месяц.',
  },
  IAN: {
    code: 'IAN', fio: 'Igoshina Anna Nikolaevna', sex: 'F', dob: '12.11.1920', ageFile: 88,
    testDate: '28.02.2008', clinic: CLINIC, stage: 'далеко зашедшая стадия', synthetic: true,
    comment: 'Поля зрения значительно сужены, обсуждена дальнейшая хирургическая тактика.',
  },
  ILA: {
    code: 'ILA', fio: 'Ilyina Larisa Andreevna', sex: 'F', dob: '25.07.1938', ageFile: 70,
    testDate: '03.04.2008', clinic: CLINIC, stage: 'далеко зашедшая стадия', synthetic: true,
    comment: 'Отрицательная динамика по периметрии, рекомендована консультация глаукомного хирурга.',
  },
  ITP: {
    code: 'ITP', fio: 'Isaev Timofey Petrovich', sex: 'M', dob: '02.03.1939', ageFile: 69,
    testDate: '16.05.2008', clinic: CLINIC, stage: 'развитая стадия', synthetic: true,
    comment: 'Комплаентность к каплям низкая, повторно разъяснена схема закапывания.',
  },
  SLI: {
    code: 'SLI', fio: 'Sokolova Lyubov Ivanovna', sex: 'F', dob: '14.10.1944', ageFile: 64,
    testDate: '21.07.2008', clinic: CLINIC, stage: 'начальная стадия', synthetic: true,
    comment: 'ВГД в целевых пределах на текущей терапии, следующий визит через 3 месяца.',
  },
  SPM: {
    code: 'SPM', fio: 'Smirnov Pavel Mihaylovich', sex: 'M', dob: '30.05.1940', ageFile: 68,
    testDate: '09.09.2008', clinic: CLINIC, stage: 'развитая стадия', synthetic: true,
    comment: 'Жалобы на затуманивание зрения по утрам, скорректирована схема терапии.',
  },
  STI: {
    code: 'STI', fio: 'Sergeeva Tatiana Ivanovna', sex: 'F', dob: '19.08.1929', ageFile: 79,
    testDate: '04.11.2008', clinic: CLINIC, stage: 'далеко зашедшая стадия', synthetic: true,
    comment: 'Начата подготовка к лазерному вмешательству, пациентка проинформирована.',
  },
  SYN: {
    code: 'SYN', fio: 'Semenov Yurii Nikolaevich', sex: 'M', dob: '06.02.1931', ageFile: 77,
    testDate: '15.12.2008', clinic: CLINIC, stage: 'начальная стадия', synthetic: true,
    comment: 'Динамика стабильная, рекомендовано продолжить текущую терапию.',
  },

  // --- ВМД ---
  BAV: {
    code: 'BAV', fio: 'Belova Anna Viktorovna', sex: 'F', dob: '08.03.1954', ageFile: 54,
    testDate: '25.01.2008', clinic: CLINIC, stage: 'сухая форма', synthetic: true,
    comment: 'Жалобы на лёгкое искажение прямых линий, рекомендовано ОКТ в динамике.',
  },
  BEN: {
    code: 'BEN', fio: 'Bogdanov Evgenii Nikolaevich', sex: 'M', dob: '27.09.1928', ageFile: 80,
    testDate: '12.02.2008', clinic: CLINIC, stage: 'влажная форма', synthetic: true,
    comment: 'Показано интравитреальное введение препарата, направлен к ретинологу.',
  },
  ENF: {
    code: 'ENF', fio: 'Egorova Nadezhda Fedorovna', sex: 'F', dob: '14.12.1935', ageFile: 73,
    testDate: '06.03.2008', clinic: CLINIC, stage: 'сухая форма', synthetic: true,
    comment: 'Динамика стабильная, рекомендованы витаминные комплексы и контроль раз в полгода.',
  },
  GLG: {
    code: 'GLG', fio: 'Gromova Lyudmila Georgievna', sex: 'F', dob: '23.05.1941', ageFile: 67,
    testDate: '19.04.2008', clinic: CLINIC, stage: 'сухая форма', synthetic: true,
    comment: 'Жалоб не предъявляет, изменения выявлены при плановом осмотре.',
  },
  KN: {
    code: 'KN', fio: 'Kozlov Nikolai', sex: 'M', dob: '01.02.1928', ageFile: 80,
    testDate: '07.05.2008', clinic: CLINIC, stage: 'влажная форма', synthetic: true,
    comment: 'Отмечает резкое снижение остроты зрения, экстренно направлен на ОКТ.',
  },
  LAV: {
    code: 'LAV', fio: 'Lazareva Alla Vasilevna', sex: 'F', dob: '18.08.1933', ageFile: 75,
    testDate: '22.06.2008', clinic: CLINIC, stage: 'сухая форма', synthetic: true,
    comment: 'Незначительная динамика, рекомендовано продолжить наблюдение.',
  },
  NEI: {
    code: 'NEI', fio: 'Nikitina Elena Igorevna', sex: 'F', dob: '09.01.1935', ageFile: 73,
    testDate: '30.07.2008', clinic: CLINIC, stage: 'влажная форма', synthetic: true,
    comment: 'После курса инъекций отмечает улучшение, продолжена текущая схема.',
  },
  NSA: {
    code: 'NSA', fio: 'Nikolaev Sergei Andreevich', sex: 'M', dob: '26.04.1934', ageFile: 74,
    testDate: '14.09.2008', clinic: CLINIC, stage: 'сухая форма', synthetic: true,
    comment: 'Жалоб нет, изменения минимальные, повторный осмотр через год.',
  },
  VRD: {
    code: 'VRD', fio: 'Volkova Raisa Dmitrievna', sex: 'F', dob: '15.07.1937', ageFile: 71,
    testDate: '02.11.2008', clinic: CLINIC, stage: 'влажная форма', synthetic: true,
    comment: 'Рекомендован повторный курс антиVEGF-терапии.',
  },

  // --- Миопия (параллельные придуманные ФИО — не путать с реальными
  //     в myopiaIdentity.ts; см. пояснение в шапке файла) ---
  BOP: {
    code: 'BOP', fio: 'Baklanova Olga Pavlovna', sex: 'F', dob: '12.09.1985', ageFile: 23,
    testDate: '04.03.2008', clinic: CLINIC, stage: 'высокая степень + ПВХРД', synthetic: true,
    comment: 'Жалобы на снижение зрения вдаль, выявлена периферическая дистрофия сетчатки, направлена на профилактическую лазеркоагуляцию.',
  },
  GGG: {
    code: 'GGG', fio: 'Golubev Gleb Grigorevich', sex: 'M', dob: '23.06.1947', ageFile: 61,
    testDate: '18.04.2008', clinic: CLINIC, stage: 'не указана', synthetic: true,
    comment: 'Миопия стабильна, очковая коррекция актуальна, периферическая дистрофия сетчатки не выявлена, повторный осмотр через год.',
  },
  MTM: {
    code: 'MTM', fio: 'Morozova Tatiana Maksimovna', sex: 'F', dob: '07.11.1950', ageFile: 58,
    testDate: '29.05.2008', clinic: CLINIC, stage: 'средняя степень', synthetic: true,
    comment: 'Жалобы на утомляемость глаз при чтении, рекомендована коррекция для близи.',
  },
  NIN: {
    code: 'NIN', fio: 'Nazarova Irina Nikitichna', sex: 'F', dob: '14.02.1983', ageFile: 25,
    testDate: '20.07.2008', clinic: CLINIC, stage: 'не указана', synthetic: true,
    comment: 'Динамика миопии незначительная, коррекция подобрана верно, глазное дно без особенностей.',
  },
  NON: {
    code: 'NON', fio: 'Nikiforova Olga Naumovna', sex: 'F', dob: '30.08.1983', ageFile: 25,
    testDate: '21.07.2008', clinic: CLINIC, stage: 'высокая степень', synthetic: true,
    comment: 'Жалоб не предъявляет, плановый контроль глазного дна без особенностей.',
  },
  SEA: {
    code: 'SEA', fio: 'Solovyova Elena Anatolevna', sex: 'F', dob: '19.03.1972', ageFile: 36,
    testDate: '02.09.2008', clinic: CLINIC, stage: 'высокая степень', synthetic: true,
    comment: 'Отмечает лёгкое прогрессирование, укрепление склеры обсудить на повторном приёме.',
  },
  SYV: {
    code: 'SYV', fio: 'Sidorov Yaroslav Valerevich', sex: 'M', dob: '05.12.1947', ageFile: 61,
    testDate: '11.10.2008', clinic: CLINIC, stage: 'не указана', synthetic: true,
    comment: 'Жалоб нет, коррекция достаточна, периферия сетчатки без разрывов и дистрофий, повторный визит через год.',
  },
  TAG: {
    code: 'TAG', fio: 'Titov Artem Grigorevich', sex: 'M', dob: '03.05.1958', ageFile: 50,
    testDate: '16.11.2008', clinic: CLINIC, stage: 'средняя степень', synthetic: true,
    comment: 'Коррекция подобрана по текущей рефракции, пациент отмечает усталость глаз к вечеру, повторный осмотр через год.',
  },
}
