import React from 'react'
import { render } from '@testing-library/react-native'
import { DotProgressIndicator } from '../DotProgressIndicator'

describe('DotProgressIndicator', () => {
  it('renders 15 dots', () => {
    const { getAllByTestId } = render(<DotProgressIndicator placesLogged={0} />)
    expect(getAllByTestId('progress-dot')).toHaveLength(15)
  })

  it('marks correct number of dots as filled', () => {
    const { getAllByTestId } = render(<DotProgressIndicator placesLogged={5} />)
    const dots = getAllByTestId('progress-dot')
    const filled = dots.filter(d => d.props.accessibilityState?.selected === true)
    expect(filled).toHaveLength(5)
  })

  it('fills all 15 dots when placesLogged is 15', () => {
    const { getAllByTestId } = render(<DotProgressIndicator placesLogged={15} />)
    const dots = getAllByTestId('progress-dot')
    const filled = dots.filter(d => d.props.accessibilityState?.selected === true)
    expect(filled).toHaveLength(15)
  })

  it('clamps to 15 even if placesLogged exceeds 15', () => {
    const { getAllByTestId } = render(<DotProgressIndicator placesLogged={20} />)
    const dots = getAllByTestId('progress-dot')
    expect(dots).toHaveLength(15)
    const filled = dots.filter(d => d.props.accessibilityState?.selected === true)
    expect(filled).toHaveLength(15)
  })

  it('renders 0 filled dots when placesLogged is 0', () => {
    const { getAllByTestId } = render(<DotProgressIndicator placesLogged={0} />)
    const dots = getAllByTestId('progress-dot')
    const filled = dots.filter(d => d.props.accessibilityState?.selected === true)
    expect(filled).toHaveLength(0)
  })
})
