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
    const { getByText } = render(<ProPrivacyReminderModal {...props} />)
    expect(getByText(/4 spots saved just for you/)).toBeTruthy()
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
