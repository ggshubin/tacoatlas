import React from 'react'
import { View, Text, ScrollView, Image } from './react-native'

// Entering/exiting/layout builders (FadeIn.duration(200).delay(50) etc.)
// are chainable no-ops in tests.
function chainable(): any {
  const obj: any = {}
  const methods = [
    'duration', 'delay', 'springify', 'damping', 'stiffness', 'mass',
    'easing', 'withInitialValues', 'withCallback', 'reduceMotion', 'build',
  ]
  methods.forEach(m => { obj[m] = () => obj })
  return obj
}

export const FadeIn = chainable()
export const FadeInUp = chainable()
export const FadeInDown = chainable()
export const FadeOut = chainable()
export const FadeOutDown = chainable()
export const SlideInDown = chainable()
export const SlideOutDown = chainable()
export const LinearTransition = chainable()

export const useSharedValue = <T>(initial: T) => ({ value: initial })
export const useAnimatedStyle = (_factory: () => object) => ({})
export const withSpring = (toValue: unknown) => toValue
export const withTiming = (toValue: unknown) => toValue
export const withDelay = (_ms: number, animation: unknown) => animation
export const withSequence = (...animations: unknown[]) => animations[animations.length - 1]
export const withRepeat = (animation: unknown) => animation
export const cancelAnimation = () => {}
export const runOnJS = (fn: (...args: unknown[]) => unknown) => fn
export const Easing = new Proxy({}, { get: () => () => (t: number) => t })

function animatedComponent(Component: any, displayName: string) {
  const Wrapped = React.forwardRef(({ entering, exiting, layout, ...props }: any, ref: any) =>
    React.createElement(Component, { ...props, ref })
  )
  Wrapped.displayName = displayName
  return Wrapped
}

const Animated = {
  View: animatedComponent(View, 'Animated.View'),
  Text: animatedComponent(Text, 'Animated.Text'),
  ScrollView: animatedComponent(ScrollView, 'Animated.ScrollView'),
  Image: animatedComponent(Image, 'Animated.Image'),
  createAnimatedComponent: (c: any) => c,
}

export default Animated
