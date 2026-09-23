import { supabaseChain, methodsOf, type Chain } from '../../test-utils/supabaseChain'

const from = jest.fn()
jest.mock('../supabase', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }))

import {
  fetchPublished, fetchReadIds, markRead, markUnread,
  listAll, fetchById, createDraft, updateAnnouncement, sendAnnouncement, deleteAnnouncement,
} from '../announcementService'

const ROW = {
  id: 'a1', title: 'Hello', body: 'World',
  published_at: '2026-09-22T00:00:00Z', created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z',
}

function respond(result: Parameters<typeof supabaseChain>[0]): Chain {
  const chain = supabaseChain(result)
  from.mockReturnValueOnce(chain)
  return chain
}

beforeEach(() => from.mockReset())

describe('fetchPublished', () => {
  it('queries sent announcements newest first and maps rows', async () => {
    const chain = respond({ data: [ROW], error: null })
    const result = await fetchPublished()
    expect(from).toHaveBeenCalledWith('announcements')
    expect(methodsOf(chain)).toEqual(['select', 'not', 'lte', 'order', 'limit'])
    expect(chain.calls[1][1]).toEqual(['published_at', 'is', null])
    expect(result).toEqual([{
      id: 'a1', title: 'Hello', body: 'World',
      publishedAt: '2026-09-22T00:00:00Z', createdAt: '2026-09-21T00:00:00Z', updatedAt: '2026-09-21T00:00:00Z',
    }])
  })
  it('throws the supabase error message', async () => {
    respond({ data: null, error: { message: 'boom' } })
    await expect(fetchPublished()).rejects.toThrow('boom')
  })
})

describe('read state', () => {
  it('fetchReadIds returns announcement ids', async () => {
    respond({ data: [{ announcement_id: 'a1' }, { announcement_id: 'a2' }], error: null })
    await expect(fetchReadIds()).resolves.toEqual(['a1', 'a2'])
  })
  it('markRead upserts one row per id and ignores duplicates', async () => {
    const chain = respond({ error: null })
    await markRead('u1', ['a1', 'a2'])
    expect(from).toHaveBeenCalledWith('announcement_reads')
    expect(chain.calls[0]).toEqual(['upsert', [
      [{ user_id: 'u1', announcement_id: 'a1' }, { user_id: 'u1', announcement_id: 'a2' }],
      { onConflict: 'user_id,announcement_id', ignoreDuplicates: true },
    ]])
  })
  it('markRead with no ids makes no request', async () => {
    await markRead('u1', [])
    expect(from).not.toHaveBeenCalled()
  })
  it('markUnread deletes the one receipt', async () => {
    const chain = respond({ error: null })
    await markUnread('u1', 'a1')
    expect(methodsOf(chain)).toEqual(['delete', 'eq', 'eq'])
    expect(chain.calls[1][1]).toEqual(['user_id', 'u1'])
    expect(chain.calls[2][1]).toEqual(['announcement_id', 'a1'])
  })
})

describe('admin', () => {
  it('listAll orders by created_at desc', async () => {
    const chain = respond({ data: [ROW], error: null })
    await listAll()
    expect(chain.calls.find(([m]) => m === 'order')?.[1]).toEqual(['created_at', { ascending: false }])
  })
  it('fetchById returns null when missing', async () => {
    respond({ data: null, error: null })
    await expect(fetchById('nope')).resolves.toBeNull()
  })
  it('createDraft inserts trimmed text with no published_at', async () => {
    const chain = respond({ data: { ...ROW, published_at: null }, error: null })
    const created = await createDraft({ title: '  Hi ', body: ' there ' })
    expect(chain.calls[0]).toEqual(['insert', [{ title: 'Hi', body: 'there' }]])
    expect(created.publishedAt).toBeNull()
  })
  it('updateAnnouncement updates title and body by id', async () => {
    const chain = respond({ data: ROW, error: null })
    await updateAnnouncement('a1', { title: 'T', body: 'B' })
    expect(chain.calls[0]).toEqual(['update', [{ title: 'T', body: 'B' }]])
    expect(chain.calls[1]).toEqual(['eq', ['id', 'a1']])
  })
  it('sendAnnouncement sets published_at only on drafts', async () => {
    const chain = respond({ data: ROW, error: null })
    await sendAnnouncement('a1')
    const [, [payload]] = chain.calls[0] as [string, [{ published_at: string }]]
    expect(typeof payload.published_at).toBe('string')
    expect(chain.calls[2]).toEqual(['is', ['published_at', null]])
  })
  it('deleteAnnouncement deletes by id', async () => {
    const chain = respond({ error: null })
    await deleteAnnouncement('a1')
    expect(methodsOf(chain)).toEqual(['delete', 'eq'])
  })
})
