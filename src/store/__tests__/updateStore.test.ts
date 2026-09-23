type Updates = {
  isEnabled: boolean
  checkForUpdateAsync: jest.Mock
  fetchUpdateAsync: jest.Mock
  reloadAsync: jest.Mock
}

function load(isEnabled = true) {
  let mod!: typeof import('../updateStore')
  let updates!: Updates
  jest.isolateModules(() => {
    updates = {
      isEnabled,
      checkForUpdateAsync: jest.fn(async () => ({ isAvailable: true, isRollBackToEmbedded: false })),
      fetchUpdateAsync: jest.fn(async () => ({ isNew: true, isRollBackToEmbedded: false })),
      reloadAsync: jest.fn(async () => undefined),
    }
    jest.doMock('expo-updates', () => updates)
    mod = require('../updateStore')
  })
  return { store: mod.useUpdateStore, updates }
}

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}))
afterEach(() => jest.restoreAllMocks())

it('does nothing when expo-updates is disabled (dev / Expo Go)', async () => {
  const { store, updates } = load(false)
  await store.getState().check()
  expect(updates.checkForUpdateAsync).not.toHaveBeenCalled()
  expect(store.getState().status).toBe('idle')
})

it('checks, downloads, and becomes ready', async () => {
  const { store, updates } = load()
  await store.getState().check()
  expect(updates.fetchUpdateAsync).toHaveBeenCalled()
  expect(store.getState().status).toBe('ready')
})

it('reports up to date when nothing is available', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false, isRollBackToEmbedded: false })
  await store.getState().check()
  expect(updates.fetchUpdateAsync).not.toHaveBeenCalled()
  expect(store.getState().status).toBe('upToDate')
})

it('throttles unforced checks for 30 minutes', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false })
  await store.getState().check()
  await store.getState().check()
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1)
  await store.getState().check({ force: true })
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(2)
})

it('sets error when the check throws', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockRejectedValueOnce(new Error('offline'))
  await store.getState().check()
  expect(store.getState().status).toBe('error')
})

it('a forced check while ready re-shows the prompt instead of re-downloading', async () => {
  const { store, updates } = load()
  await store.getState().check()
  store.getState().dismiss()
  expect(store.getState().dismissed).toBe(true)
  await store.getState().check({ force: true })
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1)
  expect(store.getState().dismissed).toBe(false)
  expect(store.getState().status).toBe('ready')
})

it('restart reloads and reports failure', async () => {
  const { store, updates } = load()
  await expect(store.getState().restart()).resolves.toBe(true)
  updates.reloadAsync.mockRejectedValueOnce(new Error('nope'))
  await expect(store.getState().restart()).resolves.toBe(false)
})

describe('rollback to embedded', () => {
  it('treats a rollback check result as an available update and becomes ready', async () => {
    const { store, updates } = load()
    updates.checkForUpdateAsync.mockResolvedValueOnce({
      isAvailable: false,
      isRollBackToEmbedded: true,
      manifest: undefined,
      reason: undefined,
    })
    updates.fetchUpdateAsync.mockResolvedValueOnce({
      isNew: false,
      isRollBackToEmbedded: true,
      manifest: undefined,
    })
    await store.getState().check()
    expect(updates.fetchUpdateAsync).toHaveBeenCalled()
    expect(store.getState().status).toBe('ready')
  })

  it('a non-rollback fetch that is not new stays up to date', async () => {
    const { store, updates } = load()
    updates.fetchUpdateAsync.mockResolvedValueOnce({
      isNew: false,
      isRollBackToEmbedded: false,
      manifest: undefined,
    })
    await store.getState().check()
    expect(store.getState().status).toBe('upToDate')
  })
})

it('an in-flight check is not duplicated by a concurrent call', async () => {
  const { store, updates } = load()
  await Promise.all([store.getState().check(), store.getState().check()])
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1)
})

describe('stuck update checks', () => {
  afterEach(() => jest.useRealTimers())

  it('times out a stuck check and reports error, clearing timers', async () => {
    jest.useFakeTimers()
    const { store, updates } = load()
    updates.checkForUpdateAsync.mockImplementation(() => new Promise(() => {}))

    const checkPromise = store.getState().check()
    await jest.advanceTimersByTimeAsync(30_000)
    await checkPromise

    expect(store.getState().status).toBe('error')
    expect(jest.getTimerCount()).toBe(0)
  })

  it('times out a stuck fetch and reports error, clearing timers', async () => {
    jest.useFakeTimers()
    const { store, updates } = load()
    updates.fetchUpdateAsync.mockImplementation(() => new Promise(() => {}))

    const checkPromise = store.getState().check()
    await jest.advanceTimersByTimeAsync(120_000)
    await checkPromise

    expect(store.getState().status).toBe('error')
    expect(jest.getTimerCount()).toBe(0)
  })
})
