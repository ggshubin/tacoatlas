// The free tier is switched off by a flag, not deleted. These tests pin both
// sides of that flag so a future re-enable can't silently regress: with
// PRO_FOR_ALL on nothing may drop a user below Pro, and with it off the
// original entitlement resolution must still work.

jest.mock('../../services/proService', () => ({
  proService: { isPro: jest.fn() },
}))

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    from: jest.fn(),
  },
}))

function loadStore(proForAll: boolean) {
  let store: typeof import('../proStore')
  jest.isolateModules(() => {
    jest.doMock('../../config/features', () => ({ PRO_FOR_ALL: proForAll }))
    store = require('../proStore')
  })
  return store!.useProStore
}

describe('proStore with PRO_FOR_ALL on', () => {
  it('starts Pro so no gated UI flashes before checkPro resolves', () => {
    const useProStore = loadStore(true)
    expect(useProStore.getState().isPro).toBe(true)
    expect(useProStore.getState().loading).toBe(false)
  })

  it('checkPro stays Pro without consulting RevenueCat or the server', async () => {
    const { proService } = require('../../services/proService')
    const useProStore = loadStore(true)

    await useProStore.getState().checkPro()

    expect(useProStore.getState().isPro).toBe(true)
    expect(useProStore.getState().loading).toBe(false)
    expect(proService.isPro).not.toHaveBeenCalled()
  })

  it('setPro(false) cannot strip Pro while the flag is on', () => {
    const useProStore = loadStore(true)
    useProStore.getState().setPro(false)
    expect(useProStore.getState().isPro).toBe(true)
  })
})

describe('proStore with PRO_FOR_ALL off', () => {
  beforeEach(() => jest.clearAllMocks())

  it('starts locked and resolves from the entitlement', async () => {
    const { proService } = require('../../services/proService')
    proService.isPro.mockResolvedValue(true)

    const useProStore = loadStore(false)
    expect(useProStore.getState().isPro).toBe(false)

    await useProStore.getState().checkPro()

    expect(proService.isPro).toHaveBeenCalled()
    expect(useProStore.getState().isPro).toBe(true)
  })

  it('stays free when neither RevenueCat nor the server confers Pro', async () => {
    const { proService } = require('../../services/proService')
    proService.isPro.mockResolvedValue(false)

    const useProStore = loadStore(false)
    await useProStore.getState().checkPro()

    expect(useProStore.getState().isPro).toBe(false)
  })

  it('setPro(false) downgrades normally', () => {
    const useProStore = loadStore(false)
    useProStore.getState().setPro(true)
    expect(useProStore.getState().isPro).toBe(true)
    useProStore.getState().setPro(false)
    expect(useProStore.getState().isPro).toBe(false)
  })
})
