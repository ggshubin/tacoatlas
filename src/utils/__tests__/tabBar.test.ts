import { tabBarHeight, tabBarPaddingBottom } from '../tabBar'

it('android adds the gesture inset to height and padding', () => {
  expect(tabBarHeight(24, true)).toBe(88)
  expect(tabBarPaddingBottom(24, true)).toBe(36)
})

it('ios uses fixed values', () => {
  expect(tabBarHeight(34, false)).toBe(60)
  expect(tabBarPaddingBottom(34, false)).toBe(8)
})
