import React from 'react'

export const View = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', { ...props, ref })
)
View.displayName = 'View'

export const Text = React.forwardRef((props: any, ref: any) =>
  React.createElement('span', { ...props, ref })
)
Text.displayName = 'Text'

export const TouchableOpacity = React.forwardRef(({ accessibilityRole, accessibilityLabel, ...props }: any, ref: any) =>
  React.createElement('button', {
    ...props,
    'aria-label': accessibilityLabel,
    role: accessibilityRole || 'button',
    ref
  })
)
TouchableOpacity.displayName = 'TouchableOpacity'

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => {
    if (!style) return {}
    if (Array.isArray(style)) {
      return style.reduce((acc, s) => ({ ...acc, ...StyleSheet.flatten(s) }), {})
    }
    return style
  },
}

export const ScrollView = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', { ...props, ref })
)
ScrollView.displayName = 'ScrollView'

export const FlatList = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', { ...props, ref })
)
FlatList.displayName = 'FlatList'

export const Image = React.forwardRef((props: any, ref: any) =>
  React.createElement('img', { ...props, ref })
)
Image.displayName = 'Image'

export const TextInput = React.forwardRef((props: any, ref: any) =>
  React.createElement('input', { ...props, ref })
)
TextInput.displayName = 'TextInput'

export const Switch = React.forwardRef((props: any, ref: any) =>
  React.createElement('input', { type: 'checkbox', ...props, ref })
)
Switch.displayName = 'Switch'

export const ActivityIndicator = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', { ...props, ref })
)
ActivityIndicator.displayName = 'ActivityIndicator'

export const Modal = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', { ...props, ref })
)
Modal.displayName = 'Modal'

export const Pressable = React.forwardRef((props: any, ref: any) =>
  React.createElement('button', { ...props, ref })
)
Pressable.displayName = 'Pressable'

export const Alert = {
  alert: jest.fn(),
}

export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web || obj.default,
}

export const Dimensions = {
  get: jest.fn(() => ({ width: 1024, height: 768 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}
