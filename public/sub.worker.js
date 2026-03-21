// sub.worker.js
let M = null

self.Module = {
  onRuntimeInitialized() {
    M = self.Module
    self.postMessage({ type: 'ready' })
  }
}
importScripts('/solver.js')

self.onmessage = (e) => {
  if (e.data.type !== 'run') return
  const { jobs, handArr, orderArr, powerArr, b4Arr } = e.data

  const orderPtr = M._malloc(20 * 4)
  const powerPtr = M._malloc(21 * 4)
  const b4Ptr    = M._malloc(b4Arr.length * 4)
  for (let i = 0; i < 20;           i++) M.setValue(orderPtr + i*4, orderArr[i], 'i32')
  for (let i = 0; i < 21;           i++) M.setValue(powerPtr + i*4, powerArr[i], 'i32')
  for (let i = 0; i < b4Arr.length; i++) M.setValue(b4Ptr    + i*4, b4Arr[i],    'i32')
  M._setup_unit(orderPtr, powerPtr, b4Ptr, b4Arr.length)
  M._free(orderPtr); M._free(powerPtr); M._free(b4Ptr)

  const handPtr = M._malloc(5 * 4)
  for (let i = 0; i < 5; i++) M.setValue(handPtr + i*4, handArr[i], 'i32')
  M._run_solve_begin(handPtr)
  M._free(handPtr)

  for (const job of jobs) {
    M._run_solve_job(job)
  }

  const resPtr = M._malloc(60 * 4)
  M._run_solve_end(resPtr)

  const b4       = M.getValue(resPtr + 0*4, 'i32')
  const yp4      = M.getValue(resPtr + 1*4, 'i32')
  const power    = M.getValue(resPtr + 2*4, 'i32')
  const nb       = M.getValue(resPtr + 3*4, 'i32')
  const npat     = M.getValue(resPtr + 4*4, 'i32')
  const field    = []
  const patterns = []
  for (let i = 0; i < 35;   i++) field.push(   M.getValue(resPtr + (5+i)*4,     'i32'))
  for (let i = 0; i < npat; i++) patterns.push( M.getValue(resPtr + (5+35+i)*4, 'i32'))
  M._free(resPtr)

  self.postMessage({ type: 'done', result: { b4, yp4, power, nb, field, patterns } })
}
