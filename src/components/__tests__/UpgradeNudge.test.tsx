import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { UpgradeNudge } from '../UpgradeNudge'

describe('UpgradeNudge', () => {
  it('renders nudge message when visible', () => {
    const { getByTestId } = render(
      <UpgradeNudge visible onDismiss={jest.fn()} onUpgrade={jest.fn()} />
    )
    expect(getByTestId('nudge-message')).toBeTruthy()
  })

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <UpgradeNudge visible={false} onDismiss={jest.fn()} onUpgrade={jest.fn()} />
    )
    expect(queryByTestId('nudge-message')).toBeNull()
  })

  it('calls onDismiss when dismiss button is pressed', () => {
    const mockDismiss = jest.fn()
    const { getByTestId } = render(
      <UpgradeNudge visible onDismiss={mockDismiss} onUpgrade={jest.fn()} />
    )
    fireEvent.press(getByTestId('nudge-dismiss-btn'))
    expect(mockDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onUpgrade when upgrade button is pressed', () => {
    const mockUpgrade = jest.fn()
    const { getByTestId } = render(
      <UpgradeNudge visible onDismiss={jest.fn()} onUpgrade={mockUpgrade} />
    )
    fireEvent.press(getByTestId('nudge-upgrade-btn'))
    expect(mockUpgrade).toHaveBeenCalledTimes(1)
  })
})
