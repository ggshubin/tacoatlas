export const isEnabled = false
export const isEmbeddedLaunch = true
export const updateId: string | null = null
export const runtimeVersion: string | null = null
export const channel: string | null = null
export const createdAt: Date | null = null
export const checkForUpdateAsync = jest.fn(async () => ({ isAvailable: false }))
export const fetchUpdateAsync = jest.fn(async () => ({ isNew: false }))
export const reloadAsync = jest.fn(async () => undefined)
