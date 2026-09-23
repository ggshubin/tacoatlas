// Single source for the tab bar's size. The floating announcement banner sits
// just above it, so both must agree.
export function tabBarHeight(bottomInset: number, isAndroid: boolean): number {
  return isAndroid ? 64 + bottomInset : 60
}

export function tabBarPaddingBottom(bottomInset: number, isAndroid: boolean): number {
  return isAndroid ? 12 + bottomInset : 8
}
