import { useState, useRef, useEffect, useCallback } from 'react'

const COLORS = ['green', 'blue', 'purple', 'gold', 'red']
const TOOL_URL = 'https://puzzle-solver-bice.vercel.app'
const isMobile = window.matchMedia('(pointer: coarse)').matches

const STRINGS = {
  ja: {
    title: 'HERO OPTIMIZER\nパズル&サバイバル 英雄特技',
    chest: '手持ちチェス',
    unitPref: '兵種選択',
    unitHint: '自軍の主力兵種を選ぶと速く最適化できます',
    unit: { fighter:'ファイター', shooter:'シューター', rider:'ライダー' },
    search: '計算スタート',
    found: 'パターンの最適配置が見つかりました',
    of: '/',
    power: '戦力UP',
    status: '有効ステータス数',
    fighter: 'ファイター',
    shooter: 'シューター',
    rider: 'ライダー',
    troop: '部隊',
    allUnit: '戦力重視',
    hint: 'チェスを増やすとさらに選択肢が広がります',
    none: '配置できるパターンが見つかりませんでした。\nチェスを増やしてください。',
    err: 'エラーが発生しました。もう一度試してください。',
    share: 'シェア',
    tweet: '#パズサバ 英雄特技最適化ツール https://puzzle-solver-bice.vercel.app',
    discord_copy: 'Discord にコピー',
    copied: 'クリップボードにコピーしました',
    computing: '計算中...',
    loading_wasm: 'ソルバーを読み込み中...',
    cancel: '計算を中止',
    searchNote: '組み合わせによっては数分かかることがあります。\n計算中は中止できます。',
    close: '閉じる',
    tapToContinue: 'タップして続ける',
    colors: { green:'緑', blue:'青', purple:'紫', gold:'金', red:'赤' },
    numpad_cancel: 'キャンセル',
    numpad_confirm: '確定',
    numpad_next: '確定→次へ',
    howToUseTitle: '使い方',
    howToUseSections: [
      {
        title: 'ツールについて',
        lines: [
          'このツールは、パズル&サバイバルの英雄特技（チェス配置）を自動で最適化します。手持ちの駒数を入力するだけで、戦力が最大になるF1/F2配置を計算します。',
        ],
      },
      {
        title: 'ツールの使い方手順',
        lines: [
          '1. 手持ちのチェス駒を色ごとに入力',
          '2.「計算スタート」を押す',
          '3. 戦力上位の配置がカルーセルで表示される',
        ],
      },
      {
        title: 'このツールが役立つ場面',
        lines: [
          '駒が増えてきてどう配置すればいいかわからない方、F2が解放されたばかりの方、より高い戦力を目指している方におすすめです。',
        ],
      },
      {
        title: 'F1 / F2 のゲーム内説明',
        lines: [
          'F1：通常の英雄特技スロット',
          'F2：手持ち駒が30個以上で解放される第2スロット',
          'F1とF2に駒を最適配分して戦力を最大化する',
        ],
      },
      {
        title: '注意事項',
        lines: [
          '計算結果はゲームのバランス調整により変わる場合があります。最新のゲームデータに基づいて定期的に更新しています。入力する駒の組み合わせによっては計算に数分かかる場合があります。',
        ],
      },
    ],
    privacyTitle: 'プライバシーポリシー',
    privacySections: [
      { heading: '広告の配信について', text: '当サイトは、Google AdSenseを利用しています。Googleを含む第三者配信事業者はCookieを使用して、ユーザーが当サイトや他のサイトに過去にアクセスした際の情報に基づいて広告を配信します。Googleがどのようにデータを使用するかについては、こちらをご覧ください。' },
      { heading: 'Cookieについて', text: '当サイトではGoogle AdSenseによる広告配信のためにCookieを使用することがあります。ユーザーはブラウザの設定によりCookieを無効にすることができます。ただし、Cookieを無効にした場合、一部の機能が正常に動作しない場合があります。' },
      { heading: 'アクセス解析について', text: '当サイトはサービス向上のためアクセス解析ツールを使用する場合があります。収集される情報は匿名であり、個人を特定するものではありません。' },
      { heading: '免責事項', text: '当サイトの解法はアルゴリズムによる自動生成であり、結果の正確性を保証するものではありません。当サイトを利用して生じたいかなる損害についても責任を負いません。「パズル＆サバイバル」は権利者の商標・著作物です。当サイトは非公式のファンツールです。' },
      { heading: 'お問い合わせ', text: '当サイトに関するご意見・ご要望はGitHubリポジトリのIssueにてお寄せください。', isContact: true },
    ],
    minUnit: '分',
    secUnit: '秒',
    completedIn: '{t}で完了',
    pageTitle: 'Puzzle & Survival - 英雄特技 最適化ツール',
    shareHeader: '【パズル&サバイバル 英雄特技】',
    sharePower: '戦力+',
    shareStatus: ' / 有効ステータス',
    shareFooter: '無料最適化ツール🔥',
  },
  en: {
    title: 'Puzzle & Survival\nHero Specialty Optimizer',
    chest: 'Available Tiles',
    unitPref: 'Unit Type',
    unitHint: 'Select your main unit for faster results',
    unit: { fighter:'Fighter', shooter:'Shooter', rider:'Rider' },
    search: 'Start',
    found: 'optimal pattern(s) found',
    of: '/',
    power: 'Power UP',
    status: 'Active Stats',
    fighter: 'Fighter',
    shooter: 'Shooter',
    rider: 'Rider',
    troop: 'Troop',
    allUnit: 'Max Power',
    hint: 'More pieces = more options',
    none: 'No patterns found.\nTry adding more pieces.',
    err: 'An error occurred. Please try again.',
    share: 'Share',
    tweet: '#PuzzlesAndSurvival Hero Skill Optimizer https://puzzle-solver-bice.vercel.app',
    discord_copy: 'Copy for Discord',
    copied: 'Copied to clipboard',
    computing: 'Computing...',
    loading_wasm: 'Loading solver...',
    cancel: 'Cancel',
    searchNote: 'Some combinations may take a few minutes.\nYou can cancel anytime.',
    close: 'Close',
    tapToContinue: 'Tap to continue',
    colors: { green:'Green', blue:'Blue', purple:'Purple', gold:'Gold', red:'Red' },
    numpad_cancel: 'Cancel',
    numpad_confirm: 'OK',
    numpad_next: 'OK → Next',
    howToUseTitle: 'How to Use',
    howToUseSections: [
      {
        title: 'About This Tool',
        lines: [
          'This tool automatically optimizes Hero Skill placements (chess piece arrangements) in Puzzle & Survival. Simply enter the number of pieces you have, and it calculates the optimal F1/F2 configuration to maximize your combat power.',
        ],
      },
      {
        title: 'How to Use This Tool',
        lines: [
          '1. Enter your available tiles by color',
          '2. Press "Start"',
          '3. Top placements are shown in the carousel',
        ],
      },
      {
        title: 'When This Tool Helps',
        lines: [
          'Recommended for players who are unsure how to arrange their growing collection of pieces, those who just unlocked F2, or anyone looking to maximize their combat power.',
        ],
      },
      {
        title: 'F1 / F2 In-Game Slots',
        lines: [
          'F1: Standard hero specialty slot',
          'F2: Second slot, unlocked with 30+ tiles',
          'Optimally distributes tiles across F1 and F2 to maximize power',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Calculation results may change due to game balance adjustments. The tool is regularly updated based on the latest game data. Depending on the combination of pieces entered, calculation may take several minutes.',
        ],
      },
    ],
    privacyTitle: 'Privacy Policy',
    privacySections: [
      { heading: 'About Ad Delivery', text: 'This site uses Google AdSense. Google and third-party vendors use cookies to serve ads based on your prior visits to this site or other sites. Learn more about how Google uses data.' },
      { heading: 'About Cookies', text: 'This site may use cookies for ad delivery via Google AdSense. You can disable cookies in your browser settings. Note that disabling cookies may cause some features to not function properly.' },
      { heading: 'About Access Analytics', text: 'This site may use access analytics tools to improve its service. Information collected is anonymous and does not identify individuals.' },
      { heading: 'Disclaimer', text: 'Solutions provided by this site are algorithmically generated and accuracy is not guaranteed. We assume no responsibility for any damages arising from use of this site. "Puzzles & Survival" is a trademark and copyrighted work of its respective owner. This site is an unofficial fan tool.' },
      { heading: 'Contact', text: 'For feedback or requests, please open an Issue on our GitHub repository.', isContact: true },
    ],
    minUnit: 'm ',
    secUnit: 's',
    completedIn: 'Completed in {t}',
    pageTitle: 'Puzzle & Survival - Hero Skill Optimizer',
    shareHeader: '[Puzzle & Survival Hero Specialty]',
    sharePower: 'Power+',
    shareStatus: ' / Active Stats: ',
    shareFooter: 'Free Optimizer Tool 🔥',
  },
  zh: {
    title: '末日喧嚣\n英雄专长优化器',
    chest: '空闲棋子',
    unitPref: '兵种偏好',
    unitHint: '选择主力兵种可加快优化速度',
    unit: { fighter:'近战兵', shooter:'射击兵', rider:'骑乘兵' },
    search: '开始计算',
    found: '找到最优配置',
    of: '/',
    power: '提升战力',
    status: '有效状态数',
    fighter: '近战兵',
    shooter: '射击兵',
    rider: '骑乘兵',
    troop: '部队',
    allUnit: '战力优先',
    hint: '增加棋子可获得更多选择',
    none: '未找到可配置方案\n请增加棋子数量',
    err: '发生错误，请重试',
    share: '分享',
    tweet: '#Puzzles英雄技能优化工具 https://puzzle-solver-bice.vercel.app',
    weibo: '微博',
    discord_copy: '复制到Discord',
    copied: '已复制到剪贴板',
    computing: '计算中...',
    loading_wasm: '加载求解器...',
    cancel: '取消计算',
    searchNote: '部分组合可能需要数分钟。\n计算中可随时取消。',
    close: '关闭',
    tapToContinue: '点击继续',
    colors: { green:'绿', blue:'蓝', purple:'紫', gold:'金', red:'红' },
    numpad_cancel: '取消',
    numpad_confirm: '确定',
    numpad_next: '确定→下一个',
    howToUseTitle: '使用说明',
    howToUseSections: [
      {
        title: '关于本工具',
        lines: [
          '该工具可自动优化《Puzzle & Survival》的英雄特技（棋子配置）。只需输入您拥有的棋子数量，即可计算出使战力最大化的F1/F2配置。',
        ],
      },
      {
        title: '使用步骤',
        lines: [
          '1. 按颜色输入手持棋子数量',
          '2. 点击「开始计算」',
          '3. 最优配置将在轮播图中显示',
        ],
      },
      {
        title: '适用场景',
        lines: [
          '适合不知道如何配置逐渐增多的棋子、刚解锁F2的玩家，以及希望提升更高战力的玩家。',
        ],
      },
      {
        title: 'F1 / F2 游戏内说明',
        lines: [
          'F1：普通英雄专长槽位',
          'F2：持有30个以上棋子时解锁的第二槽位',
          '在F1和F2之间最优分配棋子以最大化战力',
        ],
      },
      {
        title: '注意事项',
        lines: [
          '计算结果可能会因游戏平衡调整而发生变化。工具会基于最新的游戏数据进行定期更新。根据输入的棋子组合，计算可能需要几分钟时间。',
        ],
      },
    ],
    privacyTitle: '隐私政策',
    privacySections: [
      { heading: '关于广告投放', text: '本网站使用Google AdSense。Google及第三方广告商会使用Cookie，根据您过去访问本网站或其他网站的记录来投放广告。了解Google如何使用数据，请点击此处。' },
      { heading: '关于Cookie', text: '本网站可能使用Cookie进行Google AdSense广告投放。您可以通过浏览器设置禁用Cookie。但禁用Cookie后，部分功能可能无法正常使用。' },
      { heading: '关于访问分析', text: '本网站可能使用访问分析工具以改善服务。收集的信息为匿名信息，不会识别个人身份。' },
      { heading: '免责声明', text: '本网站的解法由算法自动生成，不保证结果的准确性。因使用本网站而产生的任何损失，本站概不负责。"Puzzles & Survival"为权利方的商标及著作物。本网站为非官方粉丝工具。' },
      { heading: '联系方式', text: '如有意见或建议，请在GitHub仓库的Issue中提交。', isContact: true },
    ],
    minUnit: '分',
    secUnit: '秒',
    completedIn: '{t}完成',
    pageTitle: 'Puzzle & Survival - 英雄专长优化工具',
    shareHeader: '【末日喧嚣 英雄专长】',
    sharePower: '战力+',
    shareStatus: ' / 有效状态: ',
    shareFooter: '免费优化工具🔥',
  },
  ko: {
    title: 'HERO OPTIMIZER\n퍼즐 & 서바이벌 영웅 특기 최적화기',
    chest: '보유 타일',
    unitPref: '병종 선택',
    unitHint: '주력 병종을 선택하면 더 빠르게 최적화됩니다',
    unit: { fighter:'파이터', shooter:'슈터', rider:'라이더' },
    search: '계산 시작',
    found: '최적 배치를 찾았습니다',
    of: '/',
    power: '전투력 상승',
    status: '활성 스탯 수',
    fighter: '파이터',
    shooter: '슈터',
    rider: '라이더',
    troop: '부대',
    allUnit: '전투력 우선',
    hint: '타일을 늘리면 선택지가 더 많아집니다',
    none: '배치 가능한 패턴을 찾을 수 없습니다.\n타일을 더 추가하세요.',
    err: '오류가 발생했습니다. 다시 시도해 주세요.',
    share: '공유',
    tweet: '#퍼즐앤서바이벌 영웅 특기 최적화 도구 https://puzzle-solver-bice.vercel.app',
    discord_copy: 'Discord에 복사',
    copied: '클립보드에 복사되었습니다',
    computing: '계산 중...',
    loading_wasm: '솔버를 불러오는 중...',
    cancel: '계산 취소',
    searchNote: '일부 조합은 몇 분이 걸릴 수 있습니다.\n계산 중 언제든 취소할 수 있습니다.',
    close: '닫기',
    tapToContinue: '탭하여 계속',
    colors: { green:'초록', blue:'파랑', purple:'보라', gold:'금', red:'빨강' },
    numpad_cancel: '취소',
    numpad_confirm: '확인',
    numpad_next: '확인 → 다음',
    howToUseTitle: '사용 방법',
    howToUseSections: [
      {
        title: '이 도구에 대하여',
        lines: [
          '이 도구는 퍼즐 & 서바이벌의 영웅 특기(체스 배치)를 자동으로 최적화합니다. 보유한 말의 수만 입력하면 전투력이 최대가 되는 F1/F2 배치를 계산합니다.',
        ],
      },
      {
        title: '도구 사용 절차',
        lines: [
          '1. 보유한 타일 수를 색상별로 입력',
          '2. 「계산 시작」을 누르기',
          '3. 상위 배치가 캐러셀로 표시됩니다',
        ],
      },
      {
        title: '이 도구가 유용한 경우',
        lines: [
          '말이 많아져 어떻게 배치해야 할지 모르는 경우, F2를 막 해금한 경우, 더 높은 전투력을 목표로 하는 분들께 추천합니다.',
        ],
      },
      {
        title: 'F1 / F2 게임 내 설명',
        lines: [
          'F1: 일반 영웅 특기 슬롯',
          'F2: 타일 30개 이상 보유 시 해금되는 두 번째 슬롯',
          'F1과 F2에 타일을 최적으로 배분하여 전투력을 최대화',
        ],
      },
      {
        title: '주의사항',
        lines: [
          '계산 결과는 게임 밸런스 조정에 따라 변경될 수 있습니다. 최신 게임 데이터를 기반으로 정기적으로 업데이트됩니다. 입력한 말의 조합에 따라 계산에 몇 분 정도 소요될 수 있습니다.',
        ],
      },
    ],
    privacyTitle: '개인정보 처리방침',
    privacySections: [
      { heading: '광고 게재에 대하여', text: '본 사이트는 Google AdSense를 이용합니다. Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 사용자가 본 사이트 또는 다른 사이트를 과거에 방문한 정보를 기반으로 광고를 게재합니다. Google의 데이터 사용 방식에 대해서는 여기를 참조하십시오.' },
      { heading: '쿠키에 대하여', text: '본 사이트는 Google AdSense를 통한 광고 게재를 위해 쿠키를 사용할 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키를 비활성화할 수 있습니다. 단, 쿠키를 비활성화하면 일부 기능이 정상적으로 작동하지 않을 수 있습니다.' },
      { heading: '액세스 분석에 대하여', text: '본 사이트는 서비스 향상을 위해 액세스 분석 도구를 사용할 수 있습니다. 수집되는 정보는 익명이며 개인을 특정하지 않습니다.' },
      { heading: '면책사항', text: '본 사이트의 해법은 알고리즘에 의해 자동 생성되며 결과의 정확성을 보장하지 않습니다. 본 사이트 이용으로 인해 발생한 어떠한 손해에 대해서도 책임을 지지 않습니다. 「Puzzles & Survival」은 권리자의 상표 및 저작물입니다. 본 사이트는 비공식 팬 툴입니다.' },
      { heading: '문의', text: '본 사이트에 관한 의견·요청은 GitHub 저장소의 Issue를 통해 제출해 주십시오。', isContact: true },
    ],
    minUnit: '분 ',
    secUnit: '초',
    completedIn: '{t} 완료',
    pageTitle: 'Puzzle & Survival - 영웅 특기 최적화 도구',
    shareHeader: '【퍼즐 & 서바이벌 영웅 특기】',
    sharePower: '전투력+',
    shareStatus: ' / 활성 스탯: ',
    shareFooter: '무료 최적화 도구🔥',
  },
  ru: {
    title: 'Puzzle & Survival\nОптимизатор Особенности Героя',
    chest: 'Доступные Плитки',
    unitPref: 'Тип войска',
    unitHint: 'Выберите тип для ускорения расчёта',
    unit: { fighter:'Боец', shooter:'Стрелок', rider:'Всадник' },
    search: 'Начать',
    found: 'вариантов найдено',
    of: '/',
    power: 'Рост силы',
    status: 'Активных статов',
    fighter: 'Боец',
    shooter: 'Стрелок',
    rider: 'Всадник',
    troop: 'Отряд',
    allUnit: 'Макс. сила',
    hint: 'Больше фигур — больше вариантов',
    none: 'Вариантов не найдено\nДобавьте больше фигур.',
    err: 'Произошла ошибка. Попробуйте снова.',
    share: 'Поделиться',
    tweet: '#PuzzlesAndSurvival Оптимизатор навыков героя https://puzzle-solver-bice.vercel.app',
    discord_copy: 'Скопировать для Discord',
    copied: 'Скопировано в буфер обмена',
    computing: 'Вычисление...',
    loading_wasm: 'Загрузка решателя...',
    cancel: 'Отменить',
    searchNote: 'Некоторые комбинации могут занять несколько минут.\nМожно отменить.',
    close: 'Закрыть',
    tapToContinue: 'Нажмите, чтобы продолжить',
    colors: { green:'Зелёный', blue:'Синий', purple:'Фиолетовый', gold:'Золотой', red:'Красный' },
    numpad_cancel: 'Отмена',
    numpad_confirm: 'ОК',
    numpad_next: 'ОК → Далее',
    howToUseTitle: 'Инструкция',
    howToUseSections: [
      {
        title: 'Об инструменте',
        lines: [
          'Этот инструмент автоматически оптимизирует особенности героев (расстановку фигур) в игре Puzzle & Survival. Просто введите количество имеющихся у вас фигур, и он рассчитает оптимальную расстановку F1/F2 для максимальной боевой мощи.',
        ],
      },
      {
        title: 'Как пользоваться инструментом',
        lines: [
          '1. Введите количество плиток по цветам',
          '2. Нажмите «Начать»',
          '3. Лучшие расстановки отобразятся в карусели',
        ],
      },
      {
        title: 'Когда пригодится инструмент',
        lines: [
          'Подходит для тех, кто не знает, как расставить увеличившееся количество фигур, кто только что открыл F2, а также для тех, кто стремится к более высокой боевой мощи.',
        ],
      },
      {
        title: 'F1 / F2 — игровые слоты',
        lines: [
          'F1: Стандартный слот особенности героя',
          'F2: Второй слот, открывается при 30+ плитках',
          'Оптимально распределяет плитки между F1 и F2 для максимальной силы',
        ],
      },
      {
        title: 'Примечания',
        lines: [
          'Результаты расчётов могут изменяться в зависимости от баланса игры. Инструмент регулярно обновляется на основе актуальных игровых данных. В зависимости от комбинации введённых фигур расчёт может занять несколько минут.',
        ],
      },
    ],
    privacyTitle: 'Политика конфиденциальности',
    privacySections: [
      { heading: 'О показе рекламы', text: 'Этот сайт использует Google AdSense. Google и сторонние поставщики используют файлы cookie для показа рекламы на основе ваших предыдущих посещений этого и других сайтов. Узнайте больше о том, как Google использует данные.' },
      { heading: 'О файлах cookie', text: 'На этом сайте могут использоваться файлы cookie для показа рекламы через Google AdSense. Вы можете отключить cookie в настройках браузера. Обратите внимание, что отключение cookie может привести к некорректной работе некоторых функций.' },
      { heading: 'Об анализе посещаемости', text: 'Сайт может использовать инструменты анализа посещаемости для улучшения сервиса. Собираемая информация является анонимной и не позволяет идентифицировать личность.' },
      { heading: 'Отказ от ответственности', text: 'Решения, предоставляемые сайтом, генерируются автоматически алгоритмом, и точность результатов не гарантируется. Мы не несём ответственности за любой ущерб, возникший в результате использования сайта. «Puzzles & Survival» является товарным знаком и объектом авторского права правообладателя. Данный сайт является неофициальным фан-инструментом.' },
      { heading: 'Контакты', text: 'По вопросам и предложениям обращайтесь через раздел Issue в репозитории GitHub.', isContact: true },
    ],
    minUnit: 'м ',
    secUnit: 'с',
    completedIn: 'Завершено за {t}',
    pageTitle: 'Puzzle & Survival - Оптимизатор особенностей героя',
    shareHeader: '[Puzzle & Survival Особенность Героя]',
    sharePower: 'Сила+',
    shareStatus: ' / Активных статов: ',
    shareFooter: 'Бесплатный оптимизатор🔥',
  },
}

// ============================================================
// ゲームデータ
// ============================================================
const BUFFS = {
  1:  ['S','HP',  10,2000], 2:  ['F','HP',  10,2000], 3:  ['R','HP',  10,2000],
  4:  ['部隊','DEF', 5,2000], 5:  ['部隊','HP',  5,2000], 6:  ['S','DEF',10,2000],
  7:  ['F','DEF',10,2000],  8:  ['R','DEF',10,2000],  9:  ['部隊','DEF', 5,2000],
  10: ['部隊','HP',  5,2000], 11: ['S','ATK',20,5000], 12: ['F','ATK',20,5000],
  13: ['R','ATK',20,5000], 14: ['部隊','DEF',20,5000], 15: ['部隊','HP', 20,5000],
  16: ['S','ATK',20,5000], 17: ['F','ATK',20,5000],  18: ['R','ATK',20,5000],
  19: ['部隊','DEF',20,5000], 20: ['部隊','HP', 20,5000],
}

const UNITS_CFG = {
  fighter: { best4:[12,17], yp4:[14,19,15,20], rest4:[11,16,13,18], self:'F', ally:'S' },
  shooter: { best4:[11,16], yp4:[14,19,15,20], rest4:[12,17,13,18], self:'S', ally:'R' },
  rider:   { best4:[13,18], yp4:[14,19,15,20], rest4:[12,17,11,16], self:'R', ally:'F' },
}

const UNIT_TARGETS = {
  fighter: ['fighter'],
  shooter: ['shooter'],
  rider:   ['rider'],
  all:     ['fighter','shooter','rider'],
}

const COLOR_MAP = { '-1':'empty', 0:'red', 1:'blue', 2:'green', 3:'purple', 4:'gold' }

const UNIT_LABEL = { fighter:'ファイター', shooter:'シューター', rider:'ライダー' }

// ============================================================
// シェアテキスト生成
// ============================================================
function buildShareText(pattern, t) {
  const b = pattern.buffs
  const lines = ['F','S','R','部隊'].map(key => {
    const label = { F: t.fighter, S: t.shooter, R: t.rider, '部隊': t.troop }[key]
    const parts = ['ATK','DEF','HP']
      .filter(s => (b[key]?.[s] ?? 0) > 0)
      .map(s => `${s}+${b[key][s]}%`)
    return parts.length ? `${label}: ${parts.join(' / ')}` : null
  }).filter(Boolean)
  return `${t.shareHeader}\n${t.sharePower}${pattern.power.toLocaleString()}${t.shareStatus}${pattern.status_count}\n${lines.join('\n')}\n${t.shareFooter}\n${TOOL_URL}`
}

function formatElapsed(t, { min, sec }) {
  const timeStr = min > 0 ? `${min}${t.minUnit}${sec}${t.secUnit}` : `${sec}${t.secUnit}`
  return t.completedIn.replace('{t}', timeStr)
}

// ============================================================
// シェアボタン
// ============================================================
function ShareButtons({ pattern, t }) {
  const [toast, setToast] = useState(false)
  const text = buildShareText(pattern, t)

  const handleDiscord = () => {
    navigator.clipboard.writeText(text).then(() => {
      setToast(true)
      setTimeout(() => setToast(false), 2000)
    })
  }

  const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.734-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25z"/>
    </svg>
  )
  const IconFB = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  const IconLINE = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
  const IconDiscord = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  )
  const IconWeibo = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.098 20.323c-3.977.415-7.411-1.496-7.671-4.27-.259-2.774 2.755-5.355 6.733-5.771 3.977-.416 7.411 1.495 7.67 4.269.26 2.774-2.754 5.356-6.732 5.772zm7.044-9.265c-.237-.065-.399-.108-.275-.39.269-.676.296-1.26.006-1.677-.557-.793-2.083-.751-3.836-.013 0 0-.548.24-.408-.195.268-.866.228-1.59-.191-2.008-.952-.943-3.483.036-5.651 2.207-1.63 1.636-2.58 3.352-2.58 4.842 0 2.752 3.532 4.424 6.991 4.424 4.535 0 7.549-2.638 7.549-4.731 0-1.265-.955-1.983-1.605-2.459zm-5.817 7.511c-2.43.251-4.532-.792-4.702-2.334-.17-1.542 1.664-2.981 4.094-3.232 2.43-.252 4.532.791 4.703 2.333.17 1.542-1.664 2.98-4.095 3.233zm2.036-2.569c-.096.507-.57.878-1.067.838-.497-.04-.814-.477-.718-.984.095-.504.565-.874 1.062-.837.497.04.818.477.723.983zm-1.33-1.105c-.23.023-.38.22-.335.44.046.22.266.368.496.345.23-.023.381-.22.335-.44-.046-.219-.266-.368-.496-.345zm7.197-9.266c.48 1.127.523 2.412.07 3.62a.467.467 0 0 1-.598.271.468.468 0 0 1-.271-.599c.37-.976.333-2.02-.105-2.948-.438-.928-1.24-1.594-2.221-1.848a.468.468 0 0 1-.333-.571.468.468 0 0 1 .572-.333c1.265.321 2.306 1.181 2.886 2.408zm-1.744.832a2.16 2.16 0 0 1 .048 1.749.428.428 0 0 1-.551.247.428.428 0 0 1-.247-.551 1.31 1.31 0 0 0-.03-1.062 1.316 1.316 0 0 0-.814-.695.428.428 0 0 1-.291-.533.428.428 0 0 1 .533-.291c.607.168 1.106.573 1.352 1.136z"/>
    </svg>
  )

  return (
    <div className="share-section">
      <div className="share-label">{t.share}</div>
      <div className="share-row">
        <a className="share-btn btn-x" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t.tweet)}`} target="_blank" rel="noreferrer"><IconX /> X</a>
        {t.weibo ? (
          <a className="share-btn btn-weibo" href={`http://service.weibo.com/share/share.php?url=${encodeURIComponent(TOOL_URL)}&title=${encodeURIComponent(t.tweet)}`} target="_blank" rel="noreferrer"><IconWeibo /> {t.weibo}</a>
        ) : null}
        <a className="share-btn btn-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(TOOL_URL)}`} target="_blank" rel="noreferrer"><IconFB /> Facebook</a>
        <a className="share-btn btn-line" href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(TOOL_URL)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><IconLINE /> LINE</a>
        <button className="share-btn btn-discord" onClick={handleDiscord}><IconDiscord /> {t.discord_copy}</button>
      </div>
      {toast && <div className="toast-msg">{t.copied}</div>}
    </div>
  )
}

// ============================================================
// 使い方アコーディオン
// ============================================================
function HowToUse({ t }) {
  const [openIndex, setOpenIndex] = useState(null)
  const [mainOpen, setMainOpen] = useState(false)

  const toggle = (i) => setOpenIndex(prev => prev === i ? null : i)

  return (
    <div className="how-to-use">
      <button className="how-to-use-toggle" onClick={() => setMainOpen(v => !v)}>
        <span>{t.howToUseTitle}</span>
        <span className={`accordion-chevron${mainOpen ? ' open' : ''}`}>▾</span>
      </button>
      {mainOpen && (
        <div className="how-to-use-body">
          {t.howToUseSections.map((sec, i) => (
            <div key={i} className="how-to-use-item">
              <button className="how-to-use-item-toggle" onClick={() => toggle(i)}>
                <span>{sec.title}</span>
                <span className={`accordion-chevron${openIndex === i ? ' open' : ''}`}>▾</span>
              </button>
              {openIndex === i && (
                <ul className="how-to-use-list">
                  {sec.lines.map((line, j) => <li key={j}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// フッター（プライバシーポリシー）
// ============================================================
const CONTACT_FORM = 'https://forms.gle/BsSYTngjnEf3wmZc8'

function Footer({ t }) {
  return (
    <footer className="site-footer">
      <div className="footer-title">{t.privacyTitle}</div>
      <div className="footer-sections">
        {t.privacySections.map((sec, i) => (
          <div key={i} className="footer-section">
            <div className="footer-section-heading">{sec.heading}</div>
            <p className="footer-section-text">
              {sec.text}
              {sec.isContact && (
                <> <a href={CONTACT_FORM} target="_blank" rel="noopener noreferrer" className="footer-link">→ お問い合わせフォーム</a></>
              )}
            </p>
          </div>
        ))}
      </div>
    </footer>
  )
}

// ============================================================
// ローディングログ
// ============================================================
function LoadingLog({ logs }) {
  const boxRef = useRef(null)
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight
    }
  }, [logs])
  return (
    <div className="loading-log" ref={boxRef}>
      {logs.map((line, i) => (
        <div key={i} className={`log-line${i === logs.length - 1 ? ' log-line-new' : ''}`}>
          {line}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// フィールドグリッド
// ============================================================
function FieldGrid({ field, label }) {
  return (
    <div className="field-section">
      {label && <div className="field-label">{label}</div>}
      <div className="field-grid">
        {field.map((color, i) => (
          <div key={i} className={`field-cell${color === 'empty' ? ' empty' : ''}`}>
            {color !== 'empty' && (
              <div className={`piece ${color}`}>
                <div className="piece-inner" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// バフテーブル
// ============================================================
function BuffTable({ buffs, t }) {
  const units = [
    { key: 'F',     label: t.fighter },
    { key: 'S',     label: t.shooter },
    { key: 'R',     label: t.rider   },
    { key: '部隊',  label: t.troop   },
  ]
  return (
    <table className="buff-table">
      <thead>
        <tr><th></th><th>ATK</th><th>DEF</th><th>HP</th></tr>
      </thead>
      <tbody>
        {units.map(({ key, label }) => (
          <tr key={key}>
            <td>{label}</td>
            {['ATK','DEF','HP'].map(s => {
              const val = buffs[key]?.[s] ?? 0
              return <td key={s} className={val === 0 ? 'buff-zero' : ''}>{val === 0 ? '—' : `+${val}%`}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================
// チェス使用数・残り数
// ============================================================
const COLORS_ORDER = ['green', 'blue', 'purple', 'gold', 'red']

function ChessUsage({ pattern, hand }) {
  if (!hand) return null

  // 全フィールドの色をカウント
  const used = { green:0, blue:0, purple:0, gold:0, red:0 }
  for (const f of pattern.fields) {
    for (const color of f.field) {
      if (color !== 'empty' && used[color] !== undefined) used[color]++
    }
  }

  return (
    <div className="chess-usage">
      {COLORS_ORDER.map(color => {
        const total = hand[color]
        const u = used[color]
        const rem = total - u
        return (
          <div key={color} className="chess-usage-item">
            <div className={`chest-icon-sm ${color}`}><div className="chest-icon-inner-sm" /></div>
            <div className="chess-usage-nums">
              <span className="usage-used">{u}</span>
              <span className="usage-sep">/</span>
              <span className="usage-rem">{rem}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// スタッツ＋シェア
// ============================================================
function StatsPanel({ pattern, hand, t }) {
  return (
    <div className="stats-section">
      <ChessUsage pattern={pattern} hand={hand} />
      <div className="top-stats">
        <div className="stat-card"><div className="val">+{pattern.power.toLocaleString()}</div><div className="lbl">{t.power}</div></div>
        <div className="stat-card"><div className="val">{pattern.status_count}</div><div className="lbl">{t.status}</div></div>
      </div>
      <BuffTable buffs={pattern.buffs} t={t} />
      <ShareButtons pattern={pattern} t={t} />
    </div>
  )
}

// ============================================================
// カルーセル
// ============================================================
function Carousel({ patterns, hand, t }) {
  const [current, setCurrent] = useState(0)
  const total = patterns.length
  const go = idx => setCurrent((idx + total) % total)
  const p = patterns[current]
  return (
    <>
      <div className="pattern-msg">
        <span>{total}</span> {t.found}・{current + 1} {t.of} {total}
      </div>
      <div className="carousel-wrap">
        {p.fields.map((f, i) => (
          <div key={i}>
            {i > 0 && <hr className="field-divider" />}
            <FieldGrid field={f.field} label={p.fields.length > 1 ? f.label : null} />
          </div>
        ))}
        <div className="nav-row">
          <button className="nav-btn" onClick={() => go(current - 1)}>‹</button>
          <div className="dots">
            {patterns.map((_, i) => (
              <button key={i} className={`dot${i === current ? ' active' : ''}`} onClick={() => go(i)} />
            ))}
          </div>
          <button className="nav-btn" onClick={() => go(current + 1)}>›</button>
        </div>
        <StatsPanel pattern={p} hand={hand} t={t} />
      </div>
    </>
  )
}

// ============================================================
// 兵種選択ボタン
// ============================================================
function UnitSelector({ value, onChange, t }) {
  const options = [
    { key: 'fighter', label: `⚔️ ${t.fighter}` },
    { key: 'shooter', label: `🏹 ${t.shooter}` },
    { key: 'rider',   label: `🐴 ${t.rider}` },
    { key: 'all',     label: `⚡ ${t.allUnit}` },
  ]
  return (
    <div className="unit-selector-section">
      <div className="chest-label">{t.unitPref}</div>
      <div className="unit-selector-row">
        {options.map(opt => (
          <button
            key={opt.key}
            className={`unit-btn${value === opt.key ? ' active' : ''}`}
            onClick={() => onChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="unit-hint">{t.unitHint}</div>
    </div>
  )
}

// ============================================================
// テンキーポップアップ（モバイル用）
// ============================================================
function NumpadPopup({ color, value, onPress, onBackspace, onConfirm, onCancel, t }) {
  return (
    <div className="numpad-overlay" onClick={onCancel}>
      <div className="numpad-popup" onClick={e => e.stopPropagation()}>
        <div className="numpad-header">
          <span className={`numpad-color-dot ${color}`} />
          <span>{t.colors[color]}：{value}</span>
        </div>
        <div className="numpad-grid">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="numpad-btn" onClick={() => onPress(String(n))}>{n}</button>
          ))}
          <button className="numpad-btn" onClick={() => onPress('0')}>0</button>
          <button className="numpad-btn numpad-back" onClick={onBackspace}>⌫</button>
        </div>
        <div className="numpad-actions">
          <button className="numpad-cancel" onClick={onCancel}>{t.numpad_cancel}</button>
          <button className="numpad-confirm" onClick={onConfirm}>{color === 'red' ? t.numpad_confirm : t.numpad_next}</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// メインApp
// ============================================================
export default function App() {
  const [lang, setLang] = useState(() => {
    const l = (navigator.language || '').toLowerCase()
    if (l.startsWith('ja')) return 'ja'
    if (l.startsWith('zh')) return 'zh'
    if (l.startsWith('ru')) return 'ru'
    if (l.startsWith('ko')) return 'ko'
    return 'en'
  })
  const [pieces, setPieces] = useState({ green:0, blue:0, purple:0, gold:0, red:0 })
  const [numpadTarget, setNumpadTarget] = useState(null)
  const [numpadInput, setNumpadInput]   = useState('')
  const [numpadOverwrite, setNumpadOverwrite] = useState(true)
  const [unitPref, setUnitPref] = useState('fighter')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [resultHand, setResultHand] = useState(null)  // 計算時のhand保存
  const [logs, setLogs] = useState([])
  const [wasmReady, setWasmReady] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(null)
  const workerRef = useRef(null)
  const startTimeRef = useRef(null)
  const t = STRINGS[lang]

  // ── Worker生成 ──
  const createWorker = useCallback(() => {
    const w = new Worker('/solver.worker.js')
    w.onmessage = (e) => {
      switch (e.data.type) {
        case 'ready':
          setWasmReady(true)
          break
        case 'log':
          setLogs(prev => [...prev, e.data.data])
          break
        case 'result':
          setResult(e.data.data)
          setStatus('done')
          {
            const elapsed = Date.now() - startTimeRef.current
            const min = Math.floor(elapsed / 60000)
            const sec = Math.floor((elapsed % 60000) / 1000)
            setElapsedTime({ min, sec })
          }
          break
        case 'error':
          setLogs(prev => [...prev, `[error] ${e.data.data}`])
          setStatus('error')
          break
      }
    }
    workerRef.current = w
  }, [])

  useEffect(() => {
    document.title = STRINGS[lang].pageTitle
  }, [lang])

  useEffect(() => {
    createWorker()
    return () => workerRef.current?.terminate()
  }, [createWorker])

  const handleChange = (color, val) =>
    setPieces(prev => ({ ...prev, [color]: Math.max(0, parseInt(val) || 0) }))

  const openNumpad = (color) => {
    setNumpadTarget(color)
    setNumpadInput(String(pieces[color]))
    setNumpadOverwrite(true)
  }
  const numpadPress = (digit) => {
    setNumpadInput(prev => {
      const base = numpadOverwrite ? '' : prev
      const next = base + digit
      const num = parseInt(next)
      if (num > 20) return prev
      setNumpadOverwrite(false)
      return next
    })
  }
  const numpadBackspace = () => {
    setNumpadOverwrite(false)
    setNumpadInput(prev => prev.length <= 1 ? '0' : prev.slice(0, -1))
  }
  const numpadConfirm = () => {
    if (numpadTarget) {
      handleChange(numpadTarget, numpadInput)
      const currentIndex = COLORS.indexOf(numpadTarget)
      const nextColor = COLORS[currentIndex + 1]
      if (nextColor) {
        setNumpadTarget(nextColor)
        setNumpadInput(String(pieces[nextColor]))
        setNumpadOverwrite(true)
      } else {
        setNumpadTarget(null)
      }
    }
  }
  const numpadCancel = () => setNumpadTarget(null)

  const handleSolve = () => {
    if (!wasmReady || !workerRef.current) return
    setStatus('loading')
    setResult(null)
    setLogs([])

    const hand    = [pieces.red, pieces.blue, pieces.green, pieces.purple, pieces.gold]
    const total   = hand.reduce((a,b) => a+b, 0)
    const targets = ['fighter']

    setResultHand({ green: pieces.green, blue: pieces.blue, purple: pieces.purple, gold: pieces.gold, red: pieces.red })
    startTimeRef.current = Date.now()
    setElapsedTime(null)
    workerRef.current.postMessage({ type: 'solve', hand, total, targets, lang })
  }

  // ── 計算中止 ──
  const handleCancel = () => {
    workerRef.current?.terminate()
    setWasmReady(false)
    setStatus('idle')
    setLogs([])
    createWorker()
  }

  return (
    <div className="app">
      <div className="header">
        <div className="title">
          {t.title.split('\n').map((line, i) => <div key={i} className={i === 2 ? 'title-sub' : ''}>{line}</div>)}
        </div>
        <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ko">한국어</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      <div className="chest-section">
        <div className="chest-label">{t.chest}</div>
        <div className="chest-row">
          {COLORS.map(color => (
            <div
              key={color}
              className="chest-item"
              onClick={() => isMobile && openNumpad(color)}
              style={isMobile ? { cursor: 'pointer' } : {}}
            >
              <input
                className="chest-input"
                type="number" min="0"
                value={pieces[color]}
                onChange={e => !isMobile && handleChange(color, e.target.value)}
                readOnly={isMobile}
                style={isMobile ? { pointerEvents: 'none' } : {}}
              />
              <div className={`chest-icon ${color}`}>
                <div className="chest-icon-inner" />
              </div>
            </div>
          ))}
        </div>

        <HowToUse t={t} />

        <div className="search-btn-wrap">
          {status === 'loading' ? (
            <button className="search-btn" onClick={handleCancel}>
              {t.cancel}
            </button>
          ) : (
            <button className="search-btn" onClick={handleSolve} disabled={!wasmReady}>
              {!wasmReady ? t.loading_wasm : t.search}
            </button>
          )}
          <div className="search-note">{t.searchNote}</div>
        </div>
      </div>


      {/* ログ表示 */}
      {logs.length > 0 && <LoadingLog logs={logs} />}

      {status === 'loading' && logs.length === 0 && (
        <div className="no-result">{t.computing}</div>
      )}

      {status === 'error' && <div className="no-result">{t.err}</div>}

      {elapsedTime && <div className="elapsed-time">{formatElapsed(t, elapsedTime)}</div>}

      {status === 'done' && result && (
        result.total === 0
          ? <div className="no-result">{t.none}</div>
          : result.total === 1
            ? <>
                <div className="pattern-msg">
                  <span>1</span> {t.found}
                  <br /><small style={{ color: '#555' }}>{t.hint}</small>
                </div>
                <div className="carousel-wrap">
                  {result.patterns[0].fields.map((f, i) => (
                    <div key={i}>
                      {i > 0 && <hr className="field-divider" />}
                      <FieldGrid field={f.field} label={result.patterns[0].fields.length > 1 ? f.label : null} />
                    </div>
                  ))}
                  <StatsPanel pattern={result.patterns[0]} hand={resultHand} t={t} />
                </div>
              </>
            : <Carousel patterns={result.patterns} hand={resultHand} t={t} />
      )}
      {isMobile && numpadTarget && (
        <NumpadPopup
          color={numpadTarget}
          value={numpadInput}
          onPress={numpadPress}
          onBackspace={numpadBackspace}
          onConfirm={numpadConfirm}
          onCancel={numpadCancel}
          t={t}
        />
      )}
      <Footer t={t} />
    </div>
  )
}
