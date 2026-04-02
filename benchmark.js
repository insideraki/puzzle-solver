// benchmark.js
// F1/F2配分探索ロジックをNode.jsで再現し、各色1〜10個のケースを計測してCSV出力
// 使い方: node benchmark.js

const path = require('path')
const fs   = require('fs')

// ============================================================
// ゲームデータ（solver.worker.jsと同一）
// ============================================================
const BUFFS = {
  1:['S','HP',10,2000],    2:['F','HP',10,2000],    3:['R','HP',10,2000],
  4:['部隊','DEF',5,2000], 5:['部隊','HP',5,2000],  6:['S','DEF',10,2000],
  7:['F','DEF',10,2000],   8:['R','DEF',10,2000],   9:['部隊','DEF',5,2000],
  10:['部隊','HP',5,2000], 11:['S','ATK',20,5000],  12:['F','ATK',20,5000],
  13:['R','ATK',20,5000],  14:['部隊','DEF',20,5000],15:['部隊','HP',20,5000],
  16:['S','ATK',20,5000],  17:['F','ATK',20,5000],  18:['R','ATK',20,5000],
  19:['部隊','DEF',20,5000],20:['部隊','HP',20,5000],
}

const UNITS_CFG = {
  fighter:{ best4:[12,17], yp4:[14,19,15,20], rest4:[11,16,13,18], self:'F', ally:'S' },
  shooter:{ best4:[11,16], yp4:[14,19,15,20], rest4:[12,17,13,18], self:'S', ally:'R' },
  rider:  { best4:[13,18], yp4:[14,19,15,20], rest4:[12,17,11,16], self:'R', ally:'F' },
}

// ============================================================
// WASMラッパー（solver.worker.jsと同一）
// ============================================================
function buffPriorityScore(pid, selfKey, allyKey) {
  const [unitType, stat, pct] = BUFFS[pid]
  const statW = { ATK:3, DEF:2, HP:1 }[stat]
  let unitW = 0
  if      (unitType === selfKey) unitW = 4
  else if (unitType === '部隊')  unitW = 2
  else if (unitType === allyKey) unitW = 1
  return unitW * statW * pct
}

function getPidOrder(unit) {
  const cfg  = UNITS_CFG[unit]
  const all3 = Array.from({length:10}, (_,i) => i+1)
    .sort((a,b) => buffPriorityScore(b, cfg.self, cfg.ally)
                 - buffPriorityScore(a, cfg.self, cfg.ally))
  return [...cfg.best4, ...cfg.yp4, ...cfg.rest4, ...all3]
}

function wasmSetupUnit(M, unit) {
  const cfg   = UNITS_CFG[unit]
  const order = getPidOrder(unit)
  const power = [0, ...Array.from({length:20}, (_,i) => BUFFS[i+1][3])]
  const b4    = cfg.best4

  const orderPtr = M._malloc(20 * 4)
  const powerPtr = M._malloc(21 * 4)
  const b4Ptr    = M._malloc(b4.length * 4)

  for (let i = 0; i < 20;        i++) M.setValue(orderPtr + i*4, order[i], 'i32')
  for (let i = 0; i < 21;        i++) M.setValue(powerPtr + i*4, power[i], 'i32')
  for (let i = 0; i < b4.length; i++) M.setValue(b4Ptr    + i*4, b4[i],    'i32')

  M._setup_unit(orderPtr, powerPtr, b4Ptr, b4.length)
  M._free(orderPtr); M._free(powerPtr); M._free(b4Ptr)
}

function wasmRunSolver(M, unit, hand) {
  wasmSetupUnit(M, unit)

  const handPtr = M._malloc(5  * 4)
  const resPtr  = M._malloc(60 * 4)
  for (let i = 0; i < 5; i++) M.setValue(handPtr + i*4, hand[i], 'i32')
  M._run_solve(handPtr, resPtr)

  const power = M.getValue(resPtr + 2*4, 'i32')
  const nb    = M.getValue(resPtr + 3*4, 'i32')

  M._free(handPtr); M._free(resPtr)
  return { power, status_count: nb }
}

// ============================================================
// F1/F2配分探索（solver.worker.jsと同一ロジック・逐次版）
// ============================================================
function getBoundaries(n) {
  return [...new Set([0, 4, 7, 8, n].filter(v => v <= n))]
}

function buildCombos(hand) {
  const r = hand[0], b = hand[1], g = hand[2], pu = hand[3], go = hand[4]
  const totalHand = hand.reduce((sum, v) => sum + v, 0)
  const isOptimalFixed = totalHand >= 45 && g >= 8 && go >= 7 && pu >= 8 &&
    ((r >= 8 && b >= 2) || (r >= 2 && b >= 8))

  const combos = []

  if (totalHand < 30) {
    combos.push([...hand])
    return combos
  }

  const boundaries = hand.map(n => getBoundaries(n))

  function enumerate(idx, current) {
    if (idx === 5) {
      if (current.every(v => v === 0)) return
      if (current[0] > current[1]) return
      const f1Total = current.reduce((sum, v) => sum + v, 0)
      const f1Limit = totalHand <= 40 ? 15 : 33
      if (f1Total > f1Limit) return
      combos.push([...current])
      return
    }
    for (const v of boundaries[idx]) {
      current[idx] = v
      enumerate(idx + 1, current)
    }
  }

  if (isOptimalFixed) {
    const c1 = [Math.min(r,8), Math.min(b,2), 8, 8, 7]
    const c2 = [Math.min(r,2), Math.min(b,8), 8, 8, 7]
    combos.push(c1)
    if (c1[0] !== c2[0] || c1[1] !== c2[1]) combos.push(c2)
  } else {
    enumerate(0, [0,0,0,0,0])
    if (g >= 8 && go >= 7 && pu >= 8) {
      const extras = [
        [Math.min(r,8), Math.min(b,2), 8, 8, 7],
        [Math.min(r,2), Math.min(b,8), 8, 8, 7],
      ]
      for (const c of extras) {
        if (c.every((v,i) => v <= hand[i]) && c.reduce((s,v) => s+v, 0) > 0) {
          combos.push(c)
        }
      }
    }
  }

  return combos
}

function searchF1F2(M, unit, hand, combos) {
  const f2Cache = new Map()
  let bestTotal = 0, bestR1 = null, bestR2 = null, bestF1hand = null

  for (const f1hand of combos) {
    const r1 = wasmRunSolver(M, unit, f1hand)
    if (r1.power === 0) continue

    const f2hand = hand.map((h, i) => h - f1hand[i])
    const f2Key  = f2hand.join(',')

    let r2
    if (f2Cache.has(f2Key)) {
      r2 = f2Cache.get(f2Key)
    } else {
      if (f2hand.every(v => v === 0)) {
        r2 = { power: 0 }
      } else {
        r2 = wasmRunSolver(M, unit, f2hand)
      }
      f2Cache.set(f2Key, r2)
    }

    const total = r1.power + r2.power
    if (total > bestTotal) {
      bestTotal  = total
      bestR1     = r1
      bestR2     = r2
      bestF1hand = f1hand
    }
  }

  return { bestTotal, bestF1hand }
}

// ============================================================
// メイン
// ============================================================
async function main() {
  const solverPath = path.join(__dirname, 'public', 'solver.js')
  if (!fs.existsSync(solverPath)) {
    console.error('solver.js が見つかりません: ' + solverPath)
    process.exit(1)
  }

  // solver.jsはEmscriptenモジュール。require()戻り値がModuleオブジェクト。
  // WASMロードは非同期なので、require()直後にonRuntimeInitializedを設定すれば間に合う。
  const M = await new Promise((resolve, reject) => {
    const mod = require(solverPath)
    mod.onRuntimeInitialized = () => resolve(mod)
    setTimeout(() => reject(new Error('WASM init timeout')), 30000)
  })

  console.log('WASM初期化完了')

  const unit = 'fighter'
  const header = 'n,手持ち合計,combos通り数,計算時間(秒),bestTotal戦力,F1配分'
  const rows = [header]
  console.log(header)

  for (let n = 1; n <= 10; n++) {
    const hand = [n, n, n, n, n]
    const totalHand = n * 5

    const combos = buildCombos(hand)

    const t0 = Date.now()
    const { bestTotal, bestF1hand } = searchF1F2(M, unit, hand, combos)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(3)

    const f1str = bestF1hand ? bestF1hand.join('/') : '-'
    const row = `${n},${totalHand},${combos.length},${elapsed},${bestTotal},${f1str}`
    rows.push(row)
    console.log(row)
  }

  const outPath = path.join(__dirname, 'benchmark_result.csv')
  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8')
  console.log(`\n出力完了: ${outPath}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
