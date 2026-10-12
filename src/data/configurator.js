/**
 * Конфигуратор с действующего typefl.ru: те же шаги и варианты.
 * type: choice — один вариант, range — объём ползунком, multi — несколько опций.
 */
export const CONFIGURATORS = [
  {
    id: 'trailer',
    tab: 'Полуприцеп-цистерна',
    prefix: 'ППЦ',
    steps: [
      {
        key: 'purpose',
        title: 'Назначение',
        type: 'choice',
        options: ['Светлые нефтепродукты', 'Тёмные нефтепродукты', 'Техническая вода'],
      },
      { key: 'volume', title: 'Объём цистерны', type: 'range', min: 16, max: 40, unit: 'м³' },
      {
        key: 'sections',
        title: 'Количество секций',
        type: 'choice',
        options: ['1', '2', '3', '4'],
      },
      { key: 'shape', title: 'Форма цистерны', type: 'choice', options: ['Круг', 'Чемодан'] },
      { key: 'frame', title: 'Конструкция', type: 'choice', options: ['Рамная', 'Безрамная'] },
      { key: 'wall', title: 'Толщина стенок цистерны', type: 'choice', options: ['4 мм', '5 мм'] },
      { key: 'axles', title: 'Количество осей', type: 'choice', options: ['2', '3', '4'] },
      { key: 'maker', title: 'Производитель осей', type: 'choice', options: ['BPW', 'PLT'] },
      {
        key: 'ssu',
        title: 'Высота ССУ',
        type: 'range',
        min: 1150,
        max: 1650,
        step: 50,
        unit: 'мм',
      },
      {
        key: 'tyres',
        title: 'Шины',
        type: 'choice',
        options: ['385 / 65R22,5 (магистральные)', '425 / 85R21 (внедорожные)'],
      },
      {
        key: 'suspension',
        title: 'Подвеска',
        type: 'choice',
        options: ['Рессорная', 'Пневматическая'],
      },
      { key: 'brakes', title: 'Тормоза', type: 'choice', options: ['Дисковые', 'Барабанные'] },
      {
        key: 'extras',
        title: 'Опции',
        type: 'multi',
        options: [
          'Термоизоляция (пенополиуретан 100 мм)',
          'Насосная установка',
          'Мотопомпа',
          'Электроподогрев сливного люка',
          'Узел выдачи топлива',
          'Нижний налив / рекуперация',
          'Подъёмные оси',
          'Антикоррозийная обработка',
        ],
      },
    ],
    defaults: { volume: 16, sections: '1', ssu: 1150, extras: [] },
  },
]
