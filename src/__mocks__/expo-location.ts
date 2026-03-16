export const Accuracy = { Balanced: 3, High: 4, Low: 2 }
export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' })
export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: { latitude: 33.4484, longitude: -112.0740, altitude: 0, accuracy: 5 }
})
export const reverseGeocodeAsync = jest.fn().mockResolvedValue([
  { streetNumber: '123', street: 'Main St', city: 'Phoenix', region: 'AZ' }
])
