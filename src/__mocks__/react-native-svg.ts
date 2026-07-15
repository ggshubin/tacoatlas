import React from 'react'

const make = (name: string) => {
  const C = React.forwardRef((props: any, ref: any) =>
    React.createElement('div', { 'data-svg': name, ...props, ref })
  )
  C.displayName = name
  return C
}

const Svg = make('Svg')
export const Path = make('Path')
export const Circle = make('Circle')
export const Rect = make('Rect')
export const G = make('G')
export const Text = make('SvgText')
export const Defs = make('Defs')
export const LinearGradient = make('LinearGradient')
export const Stop = make('Stop')

export default Svg
