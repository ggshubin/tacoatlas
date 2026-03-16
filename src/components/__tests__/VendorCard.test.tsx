import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { VendorCard } from '../VendorCard'
import type { Vendor } from '../../types/database'

const mockVendor: Vendor = {
  id: '1', name: 'El Toro', lat: 33.4, lng: -112.0,
  address: null, city_id: null, hours: null, photo_url: null,
  status: 'approved', submitted_by: null, created_at: new Date().toISOString(),
}

describe('VendorCard', () => {
  it('renders vendor name', () => {
    const { root } = render(
      <VendorCard vendor={mockVendor} avgRating={4} onPress={() => {}} />
    )
    const vendorName = root.findByProps({ children: 'El Toro' })
    expect(vendorName).toBeTruthy()
  })

  it('shows "No ratings yet" when avgRating is null', () => {
    const { root } = render(
      <VendorCard vendor={mockVendor} avgRating={null} onPress={() => {}} />
    )
    const noRatingText = root.findByProps({ children: 'No ratings yet' })
    expect(noRatingText).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <VendorCard vendor={mockVendor} avgRating={3} onPress={onPress} />
    )
    fireEvent.press(getByLabelText('El Toro'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows emoji placeholder when no photo_url', () => {
    const { root } = render(
      <VendorCard vendor={mockVendor} avgRating={null} onPress={() => {}} />
    )
    const emoji = root.findByProps({ children: '🌮' })
    expect(emoji).toBeTruthy()
  })
})
