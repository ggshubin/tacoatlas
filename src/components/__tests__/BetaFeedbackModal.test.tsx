import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { BetaFeedbackModal } from '../BetaFeedbackModal'
import * as betaFeedbackService from '../../services/betaFeedbackService'

jest.mock('../../services/betaFeedbackService', () => ({
  submitBetaFeedback: jest.fn(),
}))

const mockSubmit = betaFeedbackService.submitBetaFeedback as jest.Mock

describe('BetaFeedbackModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders type selector and input when visible', () => {
    const { getByTestId } = render(
      <BetaFeedbackModal visible={true} onClose={() => {}} />
    )
    expect(getByTestId('type-bug')).toBeTruthy()
    expect(getByTestId('type-feature')).toBeTruthy()
    expect(getByTestId('feedback-input')).toBeTruthy()
    expect(getByTestId('submit-btn')).toBeTruthy()
  })

  it('shows error when submitting with empty message', async () => {
    const { getByTestId } = render(
      <BetaFeedbackModal visible={true} onClose={() => {}} />
    )
    fireEvent.press(getByTestId('submit-btn'))
    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy()
    })
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('calls submitBetaFeedback with correct args on submit', async () => {
    mockSubmit.mockResolvedValue({ error: null })
    const { getByTestId } = render(
      <BetaFeedbackModal visible={true} userId="user-123" userEmail="test@test.com" onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('feedback-input'), 'The map crashes on load.')
    fireEvent.press(getByTestId('type-bug'))
    await act(async () => {
      fireEvent.press(getByTestId('submit-btn'))
    })
    expect(mockSubmit).toHaveBeenCalledWith({
      type: 'bug',
      message: 'The map crashes on load.',
      userId: 'user-123',
      userEmail: 'test@test.com',
    })
  })

  it('shows success state after successful submission', async () => {
    mockSubmit.mockResolvedValue({ error: null })
    jest.useFakeTimers()
    const { getByTestId } = render(
      <BetaFeedbackModal visible={true} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('feedback-input'), 'Add dark mode please.')
    await act(async () => {
      fireEvent.press(getByTestId('submit-btn'))
    })
    await waitFor(() => {
      expect(getByTestId('success-state')).toBeTruthy()
    })
    jest.useRealTimers()
  })

  it('shows error message when submission fails', async () => {
    mockSubmit.mockResolvedValue({ error: 'Network error' })
    const { getByTestId } = render(
      <BetaFeedbackModal visible={true} onClose={() => {}} />
    )
    fireEvent.changeText(getByTestId('feedback-input'), 'Something to report.')
    await act(async () => {
      fireEvent.press(getByTestId('submit-btn'))
    })
    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy()
    })
  })
})
