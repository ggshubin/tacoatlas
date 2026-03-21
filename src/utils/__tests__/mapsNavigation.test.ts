/**
 * @jest-environment node
 */
import { buildMapsUrl } from '../mapsNavigation'

describe('buildMapsUrl', () => {
  it('returns maps:// scheme for ios', () => {
    const url = buildMapsUrl({ lat: 33.44, lng: -112.07, name: 'El Paisa', platform: 'ios' })
    expect(url).toBe('maps://?daddr=33.44,-112.07&dirflg=d')
  })

  it('returns geo: scheme for android', () => {
    const url = buildMapsUrl({ lat: 33.44, lng: -112.07, name: 'El Paisa', platform: 'android' })
    expect(url).toBe('geo:33.44,-112.07?q=33.44,-112.07(El%20Paisa)')
  })

  it('encodes spaces in spot name for android', () => {
    const url = buildMapsUrl({ lat: 33.44, lng: -112.07, name: 'Casa de Tacos', platform: 'android' })
    expect(url).toContain('Casa%20de%20Tacos')
  })
})
