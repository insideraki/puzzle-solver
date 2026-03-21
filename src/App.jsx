import { useState, useRef, useEffect, useCallback } from 'react'

const COLORS = ['green', 'blue', 'purple', 'gold', 'red']
const TOOL_URL = 'https://puzzle-solver-bice.vercel.app'

const STRINGS = {
  ja: {
    title: 'パズル&サバイバル\n英雄特技 最適化ツール',
    chest: '手持ちチェス',
    search: '最適配置を探索',
    select_unit: '兵種を選んでください',
    of: '/',
    power: '戦力UP',
    status: '有効ステータス数',
    fighter: 'ファイター',
    shooter: 'シューター',
    rider: 'ライダー',
    troop: '部隊',
    skill1: '特技1',
    skill2: '特技2',
    result_count: (n) => `${n}通りの配置が見つかりました`,
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
    title: 'Puzzle & Survival\nHero Skill Optimizer',
    chest: 'Chess Pieces',
    search: 'Find Optimal Setup',
    select_unit: 'Select your unit type',
    of: '/',
    power: 'Power UP',
    status: 'Active Stats',
    fighter: 'Fighter',
    shooter: 'Shooter',
    rider: 'Rider',
    troop: 'Troop',
    skill1: 'Skill 1',
    skill2: 'Skill 2',
    result_count: (n) => `${n} pattern(s) found`,
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
    title: '末日喧嚣\n英雄技能优化器',
    chest: '棋子数量',
    search: '搜索最优配置',
    select_unit: '请选择兵种',
    of: '/',
    power: '提升战力',
    status: '有效状态数',
    fighter: '近战兵',
    shooter: '射击兵',
    rider: '骑乘兵',
    troop: '部队',
    skill1: '技能1',
    skill2: '技能2',
    result_count: (n) => `找到 ${n} 种配置`,
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
    title: 'Puzzle & Survival\nОптимизатор навыков',
    chest: 'Шахматные фигуры',
    search: 'Найти оптимум',
    select_unit: 'Выберите тип войска',
    of: '/',
    power: 'Рост силы',
    status: 'Активных статов',
    fighter: 'Боец',
    shooter: 'Стрелок',
    rider: 'Всадник',
    troop: 'Отряд',
    skill1: 'Навык 1',
    skill2: 'Навык 2',
    result_count: (n) => `Найдено вариантов: ${n}`,
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

const COLOR_MAP = { '-1':'empty', 0:'red', 1:'blue', 2:'green', 3:'purple', 4:'gold' }


// ============================================================
// シェアテキスト生成
// ============================================================
function buildShareText(unitResult, t) {
  const b         = unitResult.buffs
  const unitLabel = t[unitResult.unit] || unitResult.unit
  const lines = ['F','S','R','部隊'].map(key => {
    const label = { F: t.fighter, S: t.shooter, R: t.rider, '部隊': t.troop }[key]
    const parts = ['ATK','DEF','HP']
      .filter(s => (b[key]?.[s] ?? 0) > 0)
      .map(s => `${s}+${b[key][s]}%`)
    return parts.length ? `${label}: ${parts.join(' / ')}` : null
  }).filter(Boolean)
  return `【パズル&サバイバル 英雄特技】${unitLabel}\n戦力+${unitResult.power.toLocaleString()} / 有効ステータス${unitResult.status_count}\n${lines.join('\n')}\n無料最適化ツール🔥\n${TOOL_URL}`
}

// ============================================================
// シェアボタン
// ============================================================
function ShareButtons({ unitResult, t }) {
  const [toast, setToast] = useState(false)
  const text = buildShareText(unitResult, t)

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
// ローディングログ（リアルタイム更新）
// ============================================================
function LoadingLog({ logs }) {
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])
  return (
    <div className="loading-log">
      {logs.map((line, i) => (
        <div key={i} className={`log-line${i === logs.length - 1 ? ' log-line-new' : ''}`}>
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
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
    { key: 'F',    label: t.fighter },
    { key: 'S',    label: t.shooter },
    { key: 'R',    label: t.rider   },
    { key: '部隊', label: t.troop   },
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
// スタッツ＋シェア
// ============================================================
function StatsPanel({ unitResult, t }) {
  return (
    <div className="stats-section">
      <div className="top-stats">
        <div className="stat-card"><div className="val">+{unitResult.power.toLocaleString()}</div><div className="lbl">{t.power}</div></div>
        <div className="stat-card"><div className="val">{unitResult.status_count}</div><div className="lbl">{t.status}</div></div>
      </div>
      <BuffTable buffs={unitResult.buffs} t={t} />
      <ShareButtons unitResult={unitResult} t={t} />
    </div>
  )
}

// ============================================================
// カルーセル（3兵種）
// ============================================================
function Carousel({ units, t }) {
  const [current, setCurrent] = useState(0)
  const total = units.length
  const go    = idx => setCurrent((idx + total) % total)
  const u     = units[current]

  // フィールドラベルをキーから翻訳
  const fieldLabel = (key) => key === 'skill1' ? t.skill1 : t.skill2

  return (
    <div className="carousel-wrap">
      {u.fields.map((f, i) => (
        <div key={i}>
          {i > 0 && <hr className="field-divider" />}
          <FieldGrid
            field={f.field}
            label={u.fields.length > 1 ? fieldLabel(f.key) : null}
          />
        </div>
      ))}

      {total > 1 && (
        <div className="nav-row">
          <button className="nav-btn" onClick={() => go(current - 1)}>‹</button>
          <div className="dots">
            {units.map((_, i) => (
              <button
                key={i}
                className={`dot${i === current ? ' active' : ''}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button className="nav-btn" onClick={() => go(current + 1)}>›</button>
        </div>
      )}

      <StatsPanel unitResult={u} t={t} />
    </div>
  )
}

// ============================================================
// メインApp
// ============================================================
export default function App() {
  const [lang, setLang]           = useState('ja')
  const [pieces, setPieces]       = useState({ green:8, blue:2, purple:8, gold:7, red:8 })
  const [status, setStatus]       = useState('idle')   // idle / loading / done / error
  const [result, setResult]       = useState(null)     // { units: [...] }
  const [logs, setLogs]           = useState([])
  const [wasmReady, setWasmReady] = useState(false)
  const workerRef = useRef(null)
  const t = STRINGS[lang]

  const logBufferRef = useRef([])
  const logTimerRef  = useRef(null)

  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length === 0) return
    const batch = logBufferRef.current.splice(0)
    setLogs(prev => [...prev, ...batch])
  }, [])

  // ── Worker生成 ──
  const createWorker = useCallback(() => {
    const w = new Worker('/solver.worker.js')
    w.onmessage = (e) => {
      switch (e.data.type) {
        case 'ready':
          setWasmReady(true)
          break
        case 'log':
          // 100msバッチでまとめてsetState → 再レンダリング回数を削減
          logBufferRef.current.push(e.data.data)
          if (!logTimerRef.current) {
            logTimerRef.current = setTimeout(() => {
              logTimerRef.current = null
              flushLogs()
            }, 100)
          }
          break
        case 'result':
          clearTimeout(logTimerRef.current)
          logTimerRef.current = null
          flushLogs()
          setResult(e.data.data)
          setStatus('done')
          break
        case 'error':
          clearTimeout(logTimerRef.current)
          logTimerRef.current = null
          flushLogs()
          setLogs(prev => [...prev, `[error] ${e.data.data}`])
          setStatus('error')
          break
      }
    }
    workerRef.current = w
  }, [flushLogs])

  useEffect(() => {
    createWorker()
    return () => workerRef.current?.terminate()
  }, [createWorker])

  const handleChange = (color, val) =>
    setPieces(prev => ({ ...prev, [color]: Math.max(0, parseInt(val) || 0) }))

  // ── 計算開始 ──
  const handleSolve = () => {
    if (!wasmReady || !workerRef.current) return
    setStatus('loading')
    setResult(null)
    setLogs([])

    const hand  = [pieces.red, pieces.blue, pieces.green, pieces.purple, pieces.gold]
    const total = hand.reduce((a,b) => a+b, 0)

    // targetsは廃止。常に3兵種をworker側で計算
    workerRef.current.postMessage({ type: 'solve', hand, total, lang })
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
                onChange={e => handleChange(color, e.target.value)}
              />
              <div className={`chest-icon ${color}`}><div className="chest-icon-inner" /></div>
            </div>
          ))}
        </div>

        {/* UnitSelectorは削除 */}

        <div className="search-btn-wrap">
          {status === 'loading' ? (
            <button className="search-btn" onClick={handleCancel}>
              ⏹ {t.cancel}
            </button>
          ) : (
            <button
              className="search-btn"
              onClick={handleSolve}
              disabled={!wasmReady}
            >
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

      {status === 'done' && result && (() => {
        const seen = new Set()
        const deduped = result.units.filter(u => {
          const sig = u.fields.map(f => JSON.stringify(f.field)).join('|')
          if (seen.has(sig)) return false
          seen.add(sig)
          return true
        })
        if (deduped.length === 0) return <div className="no-result">{t.none}</div>
        return <>
          <div className="pattern-msg">{t.result_count(deduped.length)}</div>
          <Carousel units={deduped} t={t} />
        </>
      })()}
    </div>
  )
}
