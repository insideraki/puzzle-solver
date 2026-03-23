// solver.worker.js
// WASMソルバーをWeb Workerで実行する

// ============================================================
// ログ文字列（多言語）
// ============================================================
const LOG_STRINGS = {
  ja: {
    unit: { fighter:'ファイター', shooter:'シューター', rider:'ライダー' },
    skill1_start: (l)          => `[特技1] ${l} で計算中...`,
    skill1_done:  (l,p,n)      => `[特技1] ${l} 完了: power=${p}  有効=${n}`,
    skill1_none:  (l)          => `[特技1] ${l} → 配置なし`,
    skill1_adopt: (l,p)        => `[特技1] 採用: ${l}  power=${p}`,
    skill2_rest:  (r)          => `[特技2] 残り駒: 赤=${r[0]} 青=${r[1]} 緑=${r[2]} 紫=${r[3]} 金=${r[4]}`,
    skill2_start: (l)          => `[特技2] ${l} で計算中...`,
    skill2_none:  ()           => `[特技2] 配置なし → 特技1のみ採用`,
    skill2_done:  (p,n)        => `[特技2] 完了: power=${p}  有効=${n}`,
    total:        (p)          => `[完了]  合計戦力UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  有効=${n}`,
  },
  en: {
    unit: { fighter:'Fighter', shooter:'Shooter', rider:'Rider' },
    skill1_start: (l)          => `[Specialty1] ${l}: computing...`,
    skill1_done:  (l,p,n)      => `[Specialty1] ${l} done: power=${p}  active=${n}`,
    skill1_none:  (l)          => `[Specialty1] ${l} → no placement`,
    skill1_adopt: (l,p)        => `[Specialty1] adopted: ${l}  power=${p}`,
    skill2_rest:  (r)          => `[Specialty2] remaining: red=${r[0]} blue=${r[1]} green=${r[2]} purple=${r[3]} gold=${r[4]}`,
    skill2_start: (l)          => `[Specialty2] ${l}: computing...`,
    skill2_none:  ()           => `[Specialty2] no placement → Specialty1 only`,
    skill2_done:  (p,n)        => `[Specialty2] done: power=${p}  active=${n}`,
    total:        (p)          => `[Done]  total power UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  active=${n}`,
  },
  zh: {
    unit: { fighter:'近战兵', shooter:'射击兵', rider:'骑乘兵' },
    skill1_start: (l)          => `[专长1] ${l}: 计算中...`,
    skill1_done:  (l,p,n)      => `[专长1] ${l} 完成: power=${p}  有效=${n}`,
    skill1_none:  (l)          => `[专长1] ${l} → 无配置`,
    skill1_adopt: (l,p)        => `[专长1] 采用: ${l}  power=${p}`,
    skill2_rest:  (r)          => `[专长2] 剩余: 红=${r[0]} 蓝=${r[1]} 绿=${r[2]} 紫=${r[3]} 金=${r[4]}`,
    skill2_start: (l)          => `[专长2] ${l}: 计算中...`,
    skill2_none:  ()           => `[专长2] 无配置 → 仅专长1`,
    skill2_done:  (p,n)        => `[专长2] 完成: power=${p}  有效=${n}`,
    total:        (p)          => `[完成]  总战力UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  有效=${n}`,
  },
  ru: {
    unit: { fighter:'Боец', shooter:'Стрелок', rider:'Всадник' },
    skill1_start: (l)          => `[Особенность1] ${l}: вычисление...`,
    skill1_done:  (l,p,n)      => `[Особенность1] ${l} готово: сила=${p}  актив=${n}`,
    skill1_none:  (l)          => `[Особенность1] ${l} → нет размещения`,
    skill1_adopt: (l,p)        => `[Особенность1] принято: ${l}  сила=${p}`,
    skill2_rest:  (r)          => `[Особенность2] остаток: кр=${r[0]} си=${r[1]} зл=${r[2]} фи=${r[3]} зо=${r[4]}`,
    skill2_start: (l)          => `[Особенность2] ${l}: вычисление...`,
    skill2_none:  ()           => `[Особенность2] нет размещения → только Особенность1`,
    skill2_done:  (p,n)        => `[Особенность2] готово: сила=${p}  актив=${n}`,
    total:        (p)          => `[Готово]  итого сила UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  актив=${n}`,
  },
}

// ============================================================
// ゲームデータ
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

const COLOR_MAP = { '-1':'empty', 0:'red', 1:'blue', 2:'green', 3:'purple', 4:'gold' }

// ============================================================
// ゲームロジック
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

function wasmRunSolver(M, unit, hand, onLog) {
  wasmSetupUnit(M, unit)

  let cbPtr = 0
  if (onLog) {
    cbPtr = M.addFunction((b4, yp4, power, nb) => { onLog(b4, yp4, power, nb) }, 'viiii')
    M._set_log_callback(cbPtr)
  }

  const handPtr = M._malloc(5  * 4)
  const resPtr  = M._malloc(60 * 4)
  for (let i = 0; i < 5; i++) M.setValue(handPtr + i*4, hand[i], 'i32')
  M._run_solve(handPtr, resPtr)

  if (cbPtr) { M._set_log_callback(0); M.removeFunction(cbPtr) }

  const power    = M.getValue(resPtr + 2*4, 'i32')
  const nb       = M.getValue(resPtr + 3*4, 'i32')
  const npat     = M.getValue(resPtr + 4*4, 'i32')
  const field    = []
  const patterns = []
  for (let i = 0; i < 35;   i++) field.push(   M.getValue(resPtr + (5+i)*4,     'i32'))
  for (let i = 0; i < npat; i++) patterns.push( M.getValue(resPtr + (5+35+i)*4, 'i32'))

  M._free(handPtr); M._free(resPtr)
  return { power, status_count: nb, field, patterns }
}

// ============================================================
// WASMロード
// ============================================================
let M = null
let pendingSingle = null
self.Module = {
  onRuntimeInitialized() {
    M = self.Module
    self.postMessage({ type: 'ready' })
    if (pendingSingle) {
      const { unit, hand } = pendingSingle
      pendingSingle = null
      const result = wasmRunSolver(M, unit, hand, null)
      self.postMessage({ type: 'single_result', unit, result })
    }
  }
}
importScripts('/solver.js')

// ============================================================
// メッセージ受信・ソルバー実行
// ============================================================
self.onmessage = async (e) => {
  // ── solve_single：sub-workerとして1兵種のskill1を計算 ──
  if (e.data.type === 'solve_single') {
    const { unit, hand } = e.data
    if (M) {
      const result = wasmRunSolver(M, unit, hand, null)
      self.postMessage({ type: 'single_result', unit, result })
    } else {
      pendingSingle = { unit, hand }
    }
    return
  }

  // ── solve_f1f2：sub-workerとしてF1/F2境界値探索を実行 ──
  if (e.data.type === 'solve_f1f2') {
    const { unit, hand, combos } = e.data

    const f2Cache = new Map()
    let bestTotal = 0
    let bestR1 = null, bestR2 = null, bestF1hand = null

    for (const f1hand of combos) {
      const r1 = wasmRunSolver(M, unit, f1hand, null)
      if (r1.power === 0) continue

      const f2hand = hand.map((h, i) => h - f1hand[i])
      const f2Key = f2hand.join(',')

      let r2
      if (f2Cache.has(f2Key)) {
        r2 = f2Cache.get(f2Key)
      } else {
        if (f2hand.every(v => v === 0)) {
          r2 = { power: 0, status_count: 0, field: [], patterns: [] }
        } else {
          r2 = wasmRunSolver(M, unit, f2hand, null)
        }
        f2Cache.set(f2Key, r2)
      }

      const total = r1.power + r2.power
      if (total > bestTotal) {
        bestTotal = total
        bestR1 = r1
        bestR2 = r2
        bestF1hand = f1hand
      }
    }

    self.postMessage({ type: 'f1f2_result', bestTotal, bestR1, bestR2, bestF1hand })
    return
  }

  if (e.data.type !== 'solve') return

  const { hand, targets, total, lang } = e.data
  const S   = LOG_STRINGS[lang] ?? LOG_STRINGS.ja
  const log = (msg) => self.postMessage({ type: 'log', data: msg })

  try {
    let patterns = []

    const makeOnLog = () => (b4, yp4, power, nb) => {
      log(S.best(b4, yp4, power.toLocaleString(), nb))
    }

    {
      if (targets.length > 1) {
        // ── 並列計算（戦力重視モード）：skill1のみ、全兵種をpower降順で返す ──
        for (const unit of targets) log(S.skill1_start(S.unit[unit] || unit))

        const unitResults = await Promise.all(targets.map(unit => new Promise((resolve, reject) => {
          const w = new Worker('/solver.worker.js')
          w.onmessage = (ev) => {
            if (ev.data.type === 'ready') {
              w.postMessage({ type: 'solve_single', unit, hand })
            } else if (ev.data.type === 'single_result') {
              resolve({ unit, result: ev.data.result })
              w.terminate()
            }
          }
          w.onerror = (err) => { reject(err); w.terminate() }
        })))

        const allPatterns = []
        for (const { unit, result: r } of unitResults) {
          const label = S.unit[unit] || unit
          if (r.power > 0) {
            log(S.skill1_done(label, r.power.toLocaleString(), r.status_count))
            allPatterns.push({
              unit,
              power:        r.power,
              status_count: r.status_count,
              fields:       [{ key: 'skill1', field: convertField(r.field) }],
              buffs:        calcBuffs(r.patterns),
            })
          } else {
            log(S.skill1_none(label))
          }
        }
        allPatterns.sort((a, b) => b.power - a.power)
        patterns = allPatterns
      } else {
        // ── 逐次計算（単一兵種モード）：F1/F2配分境界値探索 ──
        const unit = targets[0]
        const label = S.unit[unit] || unit

        // 境界値候補生成
        function getBoundaries(n) {
          return [...new Set([0, 4, 7, 8, n].filter(v => v <= n))]
        }

        const g = hand[2], pu = hand[3], go = hand[4], r = hand[0], b = hand[1]
        const totalHand = hand.reduce((sum, v) => sum + v, 0)
        const isOptimalFixed = totalHand >= 45 && g >= 8 && go >= 7 && pu >= 8 &&
          ((r >= 8 && b >= 2) || (r >= 2 && b >= 8))

        // 5色の全組み合わせ列挙
        // hand = [red, blue, green, purple, gold]
        const boundaries = hand.map(n => getBoundaries(n))
        const combos = []
        function enumerate(idx, current) {
          if (idx === 5) {
            // 全色0はスキップ
            if (current.every(v => v === 0)) return
            // 赤(index 0)>青(index 1)の場合はスキップ（赤↔青対称）
            if (current[0] > current[1]) return
            // F1合計が上限を超える場合はスキップ
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
          const c1 = [Math.min(r,8), Math.min(b,2), 8, 8, 7]  // 赤優先
          const c2 = [Math.min(r,2), Math.min(b,8), 8, 8, 7]  // 青優先
          combos.push(c1)
          if (c1[0] !== c2[0] || c1[1] !== c2[1]) combos.push(c2)
        } else {
          enumerate(0, [0,0,0,0,0])
          // f1Limitに弾かれる最強候補を補完
          if (g >= 8 && go >= 7 && pu >= 8) {
            const extras = [
              [Math.min(r,8), Math.min(b,2), 8, 8, 7],
              [Math.min(r,2), Math.min(b,8), 8, 8, 7],
            ]
            for (const c of extras) {
              if (c.every((v,i) => v <= hand[i]) && c.reduce((s,v)=>s+v,0) > 0) {
                combos.push(c)
              }
            }
          }
        }

        log(`[探索] 配分候補: ${combos.length}通り`)

        const NUM_WORKERS = 4
        const chunkSize = Math.ceil(combos.length / NUM_WORKERS)
        const chunks = []
        for (let i = 0; i < NUM_WORKERS; i++) {
          const chunk = combos.slice(i * chunkSize, (i + 1) * chunkSize)
          if (chunk.length > 0) chunks.push(chunk)
        }

        log(`[探索] ${chunks.length}並列で計算中...`)

        const workerResults = await Promise.all(chunks.map(chunk => new Promise((resolve, reject) => {
          const w = new Worker('/solver.worker.js')
          w.onmessage = (ev) => {
            if (ev.data.type === 'ready') {
              w.postMessage({ type: 'solve_f1f2', unit, hand, combos: chunk })
            } else if (ev.data.type === 'f1f2_result') {
              resolve(ev.data)
              w.terminate()
            }
          }
          w.onerror = (err) => { reject(err); w.terminate() }
        })))

        // 全workerの結果から最大を選ぶ
        let bestTotal = 0
        let bestR1 = null, bestR2 = null, bestF1hand = null
        for (const wr of workerResults) {
          if (wr.bestTotal > bestTotal) {
            bestTotal = wr.bestTotal
            bestR1 = wr.bestR1
            bestR2 = wr.bestR2
            bestF1hand = wr.bestF1hand
          }
        }

        log(`[探索] 完了`)
        if (bestF1hand) {
          log(`[探索] 最適F1配分: 赤=${bestF1hand[0]} 青=${bestF1hand[1]} 緑=${bestF1hand[2]} 紫=${bestF1hand[3]} 金=${bestF1hand[4]}`)
        }

        if (!bestR1) {
          // 全組み合わせで配置なし
          patterns = []
        } else if (bestR2 && bestR2.power > 0) {
          log(S.skill1_done(label, bestR1.power.toLocaleString(), bestR1.status_count))
          log(S.skill2_done(bestR2.power.toLocaleString(), bestR2.status_count))
          log(S.total(bestTotal.toLocaleString()))
          patterns = [{
            power:        bestTotal,
            status_count: bestR1.status_count + bestR2.status_count,
            fields: [
              { key:'skill1', field: convertField(bestR1.field) },
              { key:'skill2', field: convertField(bestR2.field) },
            ],
            buffs: mergeBuffs(calcBuffs(bestR1.patterns), calcBuffs(bestR2.patterns)),
          }]
          // 赤=青の枚数が同じ場合、赤↔青スワップ版を追加
          if (hand[0] === hand[1]) {
            const swapField = (field) => field.map(c => c === 'red' ? 'blue' : c === 'blue' ? 'red' : c)
            const swapped = {
              ...patterns[0],
              fields: patterns[0].fields.map(f => ({ ...f, field: swapField(f.field) }))
            }
            patterns.push(swapped)
          }
        } else {
          log(S.skill1_done(label, bestR1.power.toLocaleString(), bestR1.status_count))
          patterns = [{
            power:        bestR1.power,
            status_count: bestR1.status_count,
            fields:       [{ key:'skill1', field: convertField(bestR1.field) }],
            buffs:        calcBuffs(bestR1.patterns),
          }]
          // 赤=青の枚数が同じ場合、赤↔青スワップ版を追加
          if (hand[0] === hand[1]) {
            const swapField = (field) => field.map(c => c === 'red' ? 'blue' : c === 'blue' ? 'red' : c)
            const swapped = {
              ...patterns[0],
              fields: patterns[0].fields.map(f => ({ ...f, field: swapField(f.field) }))
            }
            patterns.push(swapped)
          }
        }
      }
    }

    self.postMessage({ type: 'result', data: { total: patterns.length, patterns: patterns.slice(0,5) } })

  } catch (err) {
    self.postMessage({ type: 'error', data: err.message })
  }
}
