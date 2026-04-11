import React from 'react'
import { Text } from 'react-native'

function createIconMock(name: string) {
  return function MockIcon(props: any) {
    return React.createElement(Text, { testID: `icon-${props.name ?? name}` }, props.name ?? name)
  }
}

export const Ionicons = createIconMock('Ionicons')
export const MaterialIcons = createIconMock('MaterialIcons')
export const FontAwesome = createIconMock('FontAwesome')
export default { Ionicons, MaterialIcons, FontAwesome }
