import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PrivacySelector } from '../PrivacySelector'

const noop = () => {}

describe('PrivacySelector — Pro', () => {
  it('renders all three options unlocked and fires onChange per option', () => {
    const onChange = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={onChange} isPro isSignedIn onUpgradePress={noop} />
    )
    expect(queryByTestId('privacy-pro-badge-public')).toBeNull()
    expect(queryByTestId('privacy-pro-badge-friends')).toBeNull()
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(onChange).toHaveBeenCalledWith('public')
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(onChange).toHaveBeenCalledWith('friends')
    fireEvent.press(getByTestId('privacy-opt-private'))
    expect(onChange).toHaveBeenCalledWith('private')
  })

  it('caption matches the selected value', () => {
    const { getByTestId, rerender } = render(
      <PrivacySelector value="public" onChange={noop} isPro isSignedIn onUpgradePress={noop} />
    )
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Anyone on TacoAtlas can see this spot and your review.')
    rerender(<PrivacySelector value="friends" onChange={noop} isPro isSignedIn onUpgradePress={noop} />)
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Only your friends can see this.')
    rerender(<PrivacySelector value="private" onChange={noop} isPro isSignedIn onUpgradePress={noop} />)
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Saved to your personal log — only you can see it.')
  })
})

describe('PrivacySelector — free', () => {
  it('locks Public and Mi Gente with PRO badges and fires no onChange on locked taps', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <PrivacySelector value="private" onChange={onChange} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    expect(getByTestId('privacy-pro-badge-public')).toBeTruthy()
    expect(getByTestId('privacy-pro-badge-friends')).toBeTruthy()
    fireEvent.press(getByTestId('privacy-opt-public'))
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the upgrade nudge after a locked tap, with Upgrade when signed in', () => {
    const onUpgradePress = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn onUpgradePress={onUpgradePress} />
    )
    expect(queryByTestId('privacy-nudge')).toBeNull()
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(getByTestId('privacy-nudge')).toBeTruthy()
    expect(getByTestId('privacy-upgrade-btn-text').props.children).toBe('Upgrade')
    fireEvent.press(getByTestId('privacy-upgrade-btn'))
    expect(onUpgradePress).toHaveBeenCalled()
  })

  it('shows Sign Up label on the nudge when signed out', () => {
    const { getByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn={false} onUpgradePress={noop} />
    )
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(getByTestId('privacy-upgrade-btn-text').props.children).toBe('Sign Up')
  })

  it('nudge reverts to caption when Just Me is tapped', () => {
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(getByTestId('privacy-nudge')).toBeTruthy()
    fireEvent.press(getByTestId('privacy-opt-private'))
    expect(queryByTestId('privacy-nudge')).toBeNull()
    expect(getByTestId('privacy-caption')).toBeTruthy()
  })

  it('normalizes a non-private value to private on mount', () => {
    const onChange = jest.fn()
    render(
      <PrivacySelector value="public" onChange={onChange} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    expect(onChange).toHaveBeenCalledWith('private')
  })
})
