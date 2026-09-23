// A stand-in for a supabase-js query builder. Every method call is recorded
// and returns the same builder, and awaiting it resolves to `result`. Lets
// service tests assert the exact query shape without a network.
export interface ChainResult {
  data?: unknown
  error: { message: string } | null
}

export type RecordedCall = [method: string, args: unknown[]]

export interface Chain {
  calls: RecordedCall[]
  [method: string]: any
}

export function supabaseChain(result: ChainResult): Chain {
  const calls: RecordedCall[] = []
  const builder: Chain = new Proxy({ calls } as Chain, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined
      if (prop === 'asymmetricMatch' || prop === 'toJSON' || prop === '$$typeof') return undefined
      if (prop === 'calls') return target.calls
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject)
      }
      return (...args: unknown[]) => {
        calls.push([prop, args])
        return builder
      }
    },
  })
  return builder
}

export function methodsOf(chain: Chain): string[] {
  return chain.calls.map(([m]) => m)
}
