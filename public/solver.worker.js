// solver.worker.js
// public/ に配置する。WASM計算を別スレッドで実行するためのWorker。

// ============================================================
// ゲームデータ（App.jsxからコピー）
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
// ゲームロジック
// ============================================================
function buffPriorityScore(pid, selfKey, allyKey) {
  const [unitType, stat, pct] = BUFFS[pid]
  const statW = { ATK:3, DEF:2, HP:1 }[stat]
  let unitW = 0
  if (unitType === selfKey) unitW = 4
  else if (unitType === '部隊') unitW = 2
  else if (unitType === allyKey) unitW = 1
  return unitW * statW * pct
}

function getPidOrder(unit) {
  const cfg = UNITS_CFG[unit]
  const all3 = Array.from({length:10}, (_,i) => i+1)
    .sort((a,b) => buffPriorityScore(b, cfg.self, cfg.ally) - buffPriorityScore(a, cfg.self, cfg.ally))
  return [...cfg.best4, ...cfg.yp4, ...cfg.rest4, ...all3]
}

function convertField(field) {
  return field.map(c => COLOR_MAP[c] ?? COLOR_MAP[String(c)] ?? 'empty')
}

function calcBuffs(patterns) {
  const result = {
    F:{ATK:0,DEF:0,HP:0}, S:{ATK:0,DEF:0,HP:0},
    R:{ATK:0,DEF:0,HP:0}, '部隊':{ATK:0,DEF:0,HP:0}
  }
  for (const p of patterns) {
    if (BUFFS[p]) {
      const [unit, stat, val] = BUFFS[p]
      result[unit][stat] += val
    }
  }
  return result
}

function mergeBuffs(b1, b2) {
  const result = {}
  for (const u of ['F','S','R','部隊']) {
    result[u] = {}
    for (const s of ['ATK','DEF','HP']) {
      result[u][s] = (b1[u]?.[s]||0) + (b2[u]?.[s]||0)
    }
  }
  return result
}

// ============================================================
// WASMラッパー
// ============================================================
function wasmSetupUnit(M, unit) {
  const cfg = UNITS_CFG[unit]
  const order = getPidOrder(unit)
  const power = [0, ...Array.from({length:20}, (_,i) => BUFFS[i+1][3])]
  const b4 = cfg.best4

  const orderPtr = M._malloc(20 * 4)
  const powerPtr = M._malloc(21 * 4)
  const b4Ptr    = M._malloc(b4.length * 4)

  for (let i = 0; i < 20; i++) M.setValue(orderPtr + i*4, order[i], 'i32')
  for (let i = 0; i < 21; i++) M.setValue(powerPtr + i*4, power[i], 'i32')
  for (let i = 0; i < b4.length; i++) M.setValue(b4Ptr + i*4, b4[i], 'i32')

  M._setup_unit(orderPtr, powerPtr, b4Ptr, b4.length)

  M._free(orderPtr)
  M._free(powerPtr)
  M._free(b4Ptr)
}

function wasmRunSolver(M, unit, hand, onLog) {
  wasmSetupUnit(M, unit)

  let cbPtr = 0
  if (onLog) {
    cbPtr = M.addFunction((b4, yp4, power, nb) => {
      onLog(b4, yp4, power, nb)
    }, 'viiii')
    M._set_log_callback(cbPtr)
  }

  const handPtr = M._malloc(5 * 4)
  const resPtr  = M._malloc(60 * 4)

  for (let i = 0; i < 5; i++) M.setValue(handPtr + i*4, hand[i], 'i32')
  M._run_solve(handPtr, resPtr)

  if (cbPtr) {
    M._set_log_callback(0)
    M.removeFunction(cbPtr)
  }

  const power  = M.getValue(resPtr + 2*4, 'i32')
  const nb     = M.getValue(resPtr + 3*4, 'i32')
  const npat   = M.getValue(resPtr + 4*4, 'i32')
  const field  = []
  for (let i = 0; i < 35; i++) field.push(M.getValue(resPtr + (5+i)*4, 'i32'))
  const patterns = []
  for (let i = 0; i < npat; i++) patterns.push(M.getValue(resPtr + (5+35+i)*4, 'i32'))

  M._free(handPtr)
  M._free(resPtr)

  return { power, status_count: nb, field, patterns }
}

// ============================================================
// WASM初期化
// ============================================================
let M = null
let pendingSolve = null

// solver.js より前に Module を定義しておく必要がある
self.Module = {
  onRuntimeInitialized() {
    M = self.Module
    self.postMessage({ type: 'ready' })
    // ready前に届いたsolveリクエストがあれば実行
    if (pendingSolve) {
      const msg = pendingSolve
      pendingSolve = null
      runSolve(msg)
    }
  }
}

importScripts('/solver.js')

// ============================================================
// メッセージ受信
// ============================================================
self.onmessage = function(e) {
  if (e.data.type !== 'solve') return
  if (!M) {
    pendingSolve = e.data
    return
  }
  runSolve(e.data)
}

// ============================================================
// メイン計算ロジック
// ============================================================
function postLog(line) {
  self.postMessage({ type: 'log', line })
}

function runSolve({ hand, unitPref }) {
  try {
    const total = hand.reduce((a,b) => a+b, 0)
    const targets = UNIT_TARGETS[unitPref] || ['fighter','shooter','rider']

    const onLog = (b4, yp4, power, nb) => {
      postLog(`[best]  power=${power.toLocaleString()}  b4=${b4}  yp4=${yp4}  有効=${nb}`)
    }

    let patterns = []

    if (total < 30) {
      // ── 1フィールド ──
      const candidates = []
      for (const unit of targets) {
        const label = UNIT_LABEL[unit] || unit
        postLog(`[特技1] ${label} で計算中...`)
        const r = wasmRunSolver(M, unit, hand, onLog)
        if (r.power > 0) {
          postLog(`[特技1] ${label} 完了: power=${r.power.toLocaleString()}  有効=${r.status_count}`)
          candidates.push({
            power: r.power,
            status_count: r.status_count,
            fields: [{ label:'特技1', field: convertField(r.field) }],
            buffs: calcBuffs(r.patterns),
          })
        } else {
          postLog(`[特技1] ${label} → 配置なし`)
        }
      }
      candidates.sort((a,b) => b.power - a.power)
      const seen = new Set()
      for (const c of candidates) {
        const sig = JSON.stringify(c.fields[0].field)
        if (!seen.has(sig)) { seen.add(sig); patterns.push(c) }
      }

    } else {
      // ── 2フィールド ──
      let bestUnit = null, bestR1 = null
      for (const unit of targets) {
        const label = UNIT_LABEL[unit] || unit
        postLog(`[特技1] ${label} で計算中...`)
        const r = wasmRunSolver(M, unit, hand, onLog)
        if (!bestR1 || r.power > bestR1.power) { bestR1 = r; bestUnit = unit }
        if (r.power > 0) {
          postLog(`[特技1] ${label} 完了: power=${r.power.toLocaleString()}  有効=${r.status_count}`)
        } else {
          postLog(`[特技1] ${label} → 配置なし`)
        }
      }

      if (bestR1 && bestR1.power > 0) {
        const bestLabel = UNIT_LABEL[bestUnit] || bestUnit
        postLog(`[特技1] 採用: ${bestLabel}  power=${bestR1.power.toLocaleString()}`)

        const used = [0,0,0,0,0]
        for (const c of bestR1.field) if (c >= 0) used[c]++
        const remaining = hand.map((h,i) => h - used[i])

        postLog(`[特技2] 残り駒: 赤=${remaining[0]} 青=${remaining[1]} 緑=${remaining[2]} 紫=${remaining[3]} 金=${remaining[4]}`)
        postLog(`[特技2] ${bestLabel} で計算中...`)

        const r2 = wasmRunSolver(M, bestUnit, remaining, onLog)

        if (r2.power === 0) {
          postLog(`[特技2] 配置なし → 特技1のみ採用`)
          patterns = [{
            power: bestR1.power,
            status_count: bestR1.status_count,
            fields: [{ label:'特技1', field: convertField(bestR1.field) }],
            buffs: calcBuffs(bestR1.patterns),
          }]
        } else {
          const totalPower = bestR1.power + r2.power
          postLog(`[特技2] 完了: power=${r2.power.toLocaleString()}  有効=${r2.status_count}`)
          postLog(`[完了]  合計戦力UP = +${totalPower.toLocaleString()}`)
          patterns = [{
            power: totalPower,
            status_count: bestR1.status_count + r2.status_count,
            fields: [
              { label:'特技1', field: convertField(bestR1.field) },
              { label:'特技2', field: convertField(r2.field) },
            ],
            buffs: mergeBuffs(calcBuffs(bestR1.patterns), calcBuffs(r2.patterns)),
          }]
        }
      }
    }

    self.postMessage({
      type: 'done',
      result: { total: patterns.length, patterns: patterns.slice(0, 5) }
    })

  } catch (e) {
    self.postMessage({ type: 'error', msg: e.message })
  }
}
