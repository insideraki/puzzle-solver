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
    skill1_start: (l)          => `[Skill1] ${l}: computing...`,
    skill1_done:  (l,p,n)      => `[Skill1] ${l} done: power=${p}  active=${n}`,
    skill1_none:  (l)          => `[Skill1] ${l} → no placement`,
    skill1_adopt: (l,p)        => `[Skill1] adopted: ${l}  power=${p}`,
    skill2_rest:  (r)          => `[Skill2] remaining: red=${r[0]} blue=${r[1]} green=${r[2]} purple=${r[3]} gold=${r[4]}`,
    skill2_start: (l)          => `[Skill2] ${l}: computing...`,
    skill2_none:  ()           => `[Skill2] no placement → Skill1 only`,
    skill2_done:  (p,n)        => `[Skill2] done: power=${p}  active=${n}`,
    total:        (p)          => `[Done]  total power UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  active=${n}`,
  },
  zh: {
    unit: { fighter:'近战兵', shooter:'射击兵', rider:'骑乘兵' },
    skill1_start: (l)          => `[技能1] ${l}: 计算中...`,
    skill1_done:  (l,p,n)      => `[技能1] ${l} 完成: power=${p}  有效=${n}`,
    skill1_none:  (l)          => `[技能1] ${l} → 无配置`,
    skill1_adopt: (l,p)        => `[技能1] 采用: ${l}  power=${p}`,
    skill2_rest:  (r)          => `[技能2] 剩余: 红=${r[0]} 蓝=${r[1]} 绿=${r[2]} 紫=${r[3]} 金=${r[4]}`,
    skill2_start: (l)          => `[技能2] ${l}: 计算中...`,
    skill2_none:  ()           => `[技能2] 无配置 → 仅技能1`,
    skill2_done:  (p,n)        => `[技能2] 完成: power=${p}  有效=${n}`,
    total:        (p)          => `[完成]  总战力UP = +${p}`,
    best:         (b4,yp4,p,n) => `[best]  power=${p}  b4=${b4}  yp4=${yp4}  有效=${n}`,
  },
  ru: {
    unit: { fighter:'Боец', shooter:'Стрелок', rider:'Всадник' },
    skill1_start: (l)          => `[Навык1] ${l}: вычисление...`,
    skill1_done:  (l,p,n)      => `[Навык1] ${l} готово: сила=${p}  актив=${n}`,
    skill1_none:  (l)          => `[Навык1] ${l} → нет размещения`,
    skill1_adopt: (l,p)        => `[Навык1] принято: ${l}  сила=${p}`,
    skill2_rest:  (r)          => `[Навык2] остаток: кр=${r[0]} си=${r[1]} зл=${r[2]} фи=${r[3]} зо=${r[4]}`,
    skill2_start: (l)          => `[Навык2] ${l}: вычисление...`,
    skill2_none:  ()           => `[Навык2] нет размещения → только навык1`,
    skill2_done:  (p,n)        => `[Навык2] готово: сила=${p}  актив=${n}`,
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

self.Module = {
  onRuntimeInitialized() {
    M = self.Module
    self.postMessage({ type: 'ready' })
  }
}
importScripts('/solver.js')

// ============================================================
// メッセージ受信・ソルバー実行
// ============================================================
self.onmessage = (e) => {
  if (e.data.type !== 'solve') return

  const { hand, targets, total, lang } = e.data
  const S   = LOG_STRINGS[lang] ?? LOG_STRINGS.ja
  const log = (msg) => self.postMessage({ type: 'log', data: msg })

  try {
    let patterns = []

    const makeOnLog = () => (b4, yp4, power, nb) => {
      log(S.best(b4, yp4, power.toLocaleString(), nb))
    }

    if (total < 30) {
      // ── 1フィールド ──
      const candidates = []
      for (const unit of targets) {
        const label = S.unit[unit] || unit
        log(S.skill1_start(label))
        const r = wasmRunSolver(M, unit, hand, makeOnLog())
        if (r.power > 0) {
          log(S.skill1_done(label, r.power.toLocaleString(), r.status_count))
          candidates.push({
            power:        r.power,
            status_count: r.status_count,
            fields:       [{ label:'特技1', field: convertField(r.field) }],
            buffs:        calcBuffs(r.patterns),
          })
        } else {
          log(S.skill1_none(label))
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
        const label = S.unit[unit] || unit
        log(S.skill1_start(label))
        const r = wasmRunSolver(M, unit, hand, makeOnLog())
        if (!bestR1 || r.power > bestR1.power) { bestR1 = r; bestUnit = unit }
        if (r.power > 0) {
          log(S.skill1_done(label, r.power.toLocaleString(), r.status_count))
        } else {
          log(S.skill1_none(label))
        }
      }

      if (bestR1 && bestR1.power > 0) {
        const bestLabel = S.unit[bestUnit] || bestUnit
        log(S.skill1_adopt(bestLabel, bestR1.power.toLocaleString()))

        const used      = [0,0,0,0,0]
        for (const c of bestR1.field) if (c >= 0) used[c]++
        const remaining = hand.map((h,i) => h - used[i])

        log(S.skill2_rest(remaining))
        log(S.skill2_start(bestLabel))

        const r2 = wasmRunSolver(M, bestUnit, remaining, makeOnLog())

        if (r2.power === 0) {
          log(S.skill2_none())
          patterns = [{
            power:        bestR1.power,
            status_count: bestR1.status_count,
            fields:       [{ label:'特技1', field: convertField(bestR1.field) }],
            buffs:        calcBuffs(bestR1.patterns),
          }]
        } else {
          const totalPower = bestR1.power + r2.power
          log(S.skill2_done(r2.power.toLocaleString(), r2.status_count))
          log(S.total(totalPower.toLocaleString()))
          patterns = [{
            power:        totalPower,
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

    self.postMessage({ type: 'result', data: { total: patterns.length, patterns: patterns.slice(0,5) } })

  } catch (err) {
    self.postMessage({ type: 'error', data: err.message })
  }
}
