import { useState, useRef, useEffect, useCallback } from 'react'

const COLORS = ['green', 'blue', 'purple', 'gold', 'red']
const TOOL_URL = 'https://puzzle-solver-bice.vercel.app'
const isMobile = window.matchMedia('(pointer: coarse)').matches

const STRINGS = {
  ja: {
    title: 'パズル&サバイバル\n英雄特技 最適化ツール',
    chest: '手持ちチェス',
    unitPref: '兵種選択',
    unitHint: '自軍の主力兵種を選ぶと速く最適化できます',
    unit: { fighter:'ファイター', shooter:'シューター', rider:'ライダー' },
    search: '最適配置を探索',
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
    discord_copy: 'Discord にコピー',
    copied: 'クリップボードにコピーしました',
    computing: '計算中...',
    loading_wasm: 'ソルバーを読み込み中...',
    cancel: '計算を中止',
  },
  en: {
    title: 'Puzzle & Survival\nHero Specialty Optimizer',
    chest: 'Available Tiles',
    unitPref: 'Unit Type',
    unitHint: 'Select your main unit for faster results',
    unit: { fighter:'Fighter', shooter:'Shooter', rider:'Rider' },
    search: 'Find Optimal Setup',
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
    discord_copy: 'Copy for Discord',
    copied: 'Copied to clipboard',
    computing: 'Computing...',
    loading_wasm: 'Loading solver...',
    cancel: 'Cancel',
  },
  zh: {
    title: '末日喧嚣\n英雄专长优化器',
    chest: '空闲棋子',
    unitPref: '兵种偏好',
    unitHint: '选择主力兵种可加快优化速度',
    unit: { fighter:'近战兵', shooter:'射击兵', rider:'骑乘兵' },
    search: '搜索最优配置',
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
    discord_copy: '复制到Discord',
    copied: '已复制到剪贴板',
    computing: '计算中...',
    loading_wasm: '加载求解器...',
    cancel: '取消计算',
  },
  ru: {
    title: 'Puzzle & Survival\nОптимизатор Особенности Героя',
    chest: 'Доступные Плитки',
    unitPref: 'Тип войска',
    unitHint: 'Выберите тип для ускорения расчёта',
    unit: { fighter:'Боец', shooter:'Стрелок', rider:'Всадник' },
    search: 'Найти оптимум',
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
    discord_copy: 'Скопировать для Discord',
    copied: 'Скопировано в буфер обмена',
    computing: 'Вычисление...',
    loading_wasm: 'Загрузка решателя...',
    cancel: 'Отменить',
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
  return `【パズル&サバイバル 英雄特技】\n戦力+${pattern.power.toLocaleString()} / 有効ステータス${pattern.status_count}\n${lines.join('\n')}\n無料最適化ツール🔥\n${TOOL_URL}`
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

  return (
    <div className="share-section">
      <div className="share-label">{t.share}</div>
      <div className="share-row">
        <a className="share-btn btn-x" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><IconX /> X</a>
        <a className="share-btn btn-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(TOOL_URL)}`} target="_blank" rel="noreferrer"><IconFB /> Facebook</a>
        <a className="share-btn btn-line" href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(TOOL_URL)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><IconLINE /> LINE</a>
        <button className="share-btn btn-discord" onClick={handleDiscord}><IconDiscord /> {t.discord_copy}</button>
      </div>
      {toast && <div className="toast-msg">{t.copied}</div>}
    </div>
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
        {p.unit && t.unit?.[p.unit] && (
          <div className="unit-badge">{t.unit[p.unit]}</div>
        )}
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
function NumpadPopup({ color, value, onPress, onBackspace, onConfirm, onCancel }) {
  const colorLabel = { green:'緑', blue:'青', purple:'紫', gold:'金', red:'赤' }
  return (
    <div className="numpad-overlay" onClick={onCancel}>
      <div className="numpad-popup" onClick={e => e.stopPropagation()}>
        <div className="numpad-header">
          <span className={`numpad-color-dot ${color}`} />
          <span>{colorLabel[color]}：{value}</span>
        </div>
        <div className="numpad-grid">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="numpad-btn" onClick={() => onPress(String(n))}>{n}</button>
          ))}
          <button className="numpad-btn" onClick={() => onPress('0')}>0</button>
          <button className="numpad-btn numpad-back" onClick={onBackspace}>⌫</button>
        </div>
        <div className="numpad-actions">
          <button className="numpad-cancel" onClick={onCancel}>キャンセル</button>
          <button className="numpad-confirm" onClick={onConfirm}>確定</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// メインApp
// ============================================================
export default function App() {
  const [lang, setLang] = useState('ja')
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
  const workerRef = useRef(null)
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
    }
    setNumpadTarget(null)
  }
  const numpadCancel = () => setNumpadTarget(null)

  const handleSolve = () => {
    if (!wasmReady || !workerRef.current) return
    setStatus('loading')
    setResult(null)
    setLogs([])

    const hand    = [pieces.red, pieces.blue, pieces.green, pieces.purple, pieces.gold]
    const total   = hand.reduce((a,b) => a+b, 0)
    const targets = UNIT_TARGETS[unitPref] || ['fighter']

    setResultHand({ green: pieces.green, blue: pieces.blue, purple: pieces.purple, gold: pieces.gold, red: pieces.red })
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
          {t.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      <div className="chest-section">
        <div className="chest-label">{t.chest}</div>
        <div className="chest-row">
          {COLORS.map(color => (
            <div key={color} className="chest-item">
              <input
                className="chest-input"
                type="number" min="0"
                value={pieces[color]}
                onChange={e => !isMobile && handleChange(color, e.target.value)}
                readOnly={isMobile}
              />
              <div
                className={`chest-icon ${color}`}
                onClick={() => isMobile && openNumpad(color)}
                style={isMobile ? { cursor: 'pointer' } : {}}
              >
                <div className="chest-icon-inner" />
              </div>
            </div>
          ))}
        </div>

        <UnitSelector value={unitPref} onChange={setUnitPref} t={t} />

        <div className="search-btn-wrap">
          {status === 'loading' ? (
            <button className="search-btn" onClick={handleCancel}>
              ⏹ {t.cancel}
            </button>
          ) : (
            <button className="search-btn" onClick={handleSolve} disabled={!wasmReady}>
              {!wasmReady ? t.loading_wasm : t.search}
            </button>
          )}
        </div>
      </div>

      {/* 広告スペース */}
      <div className="ad-space" />

      {/* ログ表示 */}
      {logs.length > 0 && <LoadingLog logs={logs} />}

      {status === 'loading' && logs.length === 0 && (
        <div className="no-result">{t.computing}</div>
      )}

      {status === 'error' && <div className="no-result">{t.err}</div>}

      {status === 'done' && result && (
        result.total === 0
          ? <div className="no-result">{t.none}</div>
          : result.total === 1
            ? <>
                <div className="pattern-msg">
                  {result.patterns[0].unit && t.unit?.[result.patterns[0].unit] && (
                    <div className="unit-badge">{t.unit[result.patterns[0].unit]}</div>
                  )}
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
        />
      )}
    </div>
  )
}
