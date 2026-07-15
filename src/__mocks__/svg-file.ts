import React from 'react'

// Mock for imported .svg assets (react-native-svg-transformer turns them into
// components at build time; tests get this stub instead).
const SvgFileMock = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
  React.createElement('div', { 'data-svg-asset': true, ...props, ref })
)
SvgFileMock.displayName = 'SvgAsset'

export default SvgFileMock
