import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ProPrivacyReminderModal } from '../ProPrivacyReminderModal'

const props = {
  visible: true,
  spotCount: 4,
  onMakeAllPublic: jest.fn(),
  onChoosePerSpot: jest.fn(),
  onKeepPrivate: jest.fn(),
}

describe('ProPrivacyReminderModal', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows the spot count in the message', () => {
    const { getByTestId } = render(<ProPrivacyReminderModal {...props} />)
    const text = [getByTestId('reminder-message').props.children].flat().join('')
    expect(text).toContain('4 spots saved just for you')
  })

  it('does not render when not visible', () => {
    const { queryByTestId } = render(<ProPrivacyReminderModal {...props} visible={false} />)
    expect(queryByTestId('reminder-message')).toBeNull()
  })

  it('fires the right callback per button', () => {
    const { getByTestId } = render(<ProPrivacyReminderModal {...props} />)
    fireEvent.press(getByTestId('reminder-make-public'))
    expect(props.onMakeAllPublic).toHaveBeenCalled()
    fireEvent.press(getByTestId('reminder-per-spot'))
    expect(props.onChoosePerSpot).toHaveBeenCalled()
    fireEvent.press(getByTestId('reminder-keep-private'))
    expect(props.onKeepPrivate).toHaveBeenCalled()
  })
})
