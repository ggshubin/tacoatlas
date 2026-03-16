import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TacoRating } from '../TacoRating'

describe('TacoRating', () => {
  it('renders 5 touchable elements', () => {
    const { getAllByLabelText } = render(<TacoRating value={3} />)
    const buttons = getAllByLabelText(/taco/)
    expect(buttons).toHaveLength(5)
  })

  it('calls onChange with correct value when tapped', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<TacoRating value={0} onChange={onChange} />)
    fireEvent.press(getByLabelText('4 tacos'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('calls onChange with 1 when 1 taco is pressed', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<TacoRating value={0} onChange={onChange} />)
    fireEvent.press(getByLabelText('1 taco'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('does not call onChange when readonly', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<TacoRating value={3} onChange={onChange} readonly />)
    fireEvent.press(getByLabelText('2 tacos'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
