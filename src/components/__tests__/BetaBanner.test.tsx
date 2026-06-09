import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BetaBanner } from '../BetaBanner'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}))

describe('BetaBanner', () => {
  it('renders the banner with beta text', () => {
    const { getByTestId } = render(<BetaBanner onPress={() => {}} />)
    expect(getByTestId('beta-banner')).toBeTruthy()
    expect(getByTestId('beta-banner-text')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<BetaBanner onPress={onPress} />)
    fireEvent.press(getByTestId('beta-banner'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
