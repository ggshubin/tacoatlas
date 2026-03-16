let counter = 0
export const nanoid = jest.fn(() => `mock-id-${++counter}`)
