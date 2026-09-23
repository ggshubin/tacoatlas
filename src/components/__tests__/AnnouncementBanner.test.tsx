import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AnnouncementBanner } from '../AnnouncementBanner'
import type { Announcement } from '../../types/announcement'

const A: Announcement = {
  id: 'a1', title: 'New map styles are live', body: 'b',
  publishedAt: '2026-09-22T00:00:00Z', createdAt: '2026-09-22T00:00:00Z', updatedAt: '2026-09-22T00:00:00Z',
}

it('renders nothing without an announcement', () => {
  const { queryByTestId } = render(
    <AnnouncementBanner announcement={null} bottomOffset={60} onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  expect(queryByTestId('announcement-banner')).toBeNull()
})

it('shows the title', () => {
  const { getByText } = render(
    <AnnouncementBanner announcement={A} bottomOffset={60} onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  expect(getByText('New map styles are live')).toBeTruthy()
})

it('open and dismiss pass the id', () => {
  const onOpen = jest.fn()
  const onDismiss = jest.fn()
  const { getByTestId } = render(
    <AnnouncementBanner announcement={A} bottomOffset={60} onOpen={onOpen} onDismiss={onDismiss} />
  )
  fireEvent.press(getByTestId('announcement-banner-open'))
  fireEvent.press(getByTestId('announcement-banner-dismiss'))
  expect(onOpen).toHaveBeenCalledWith('a1')
  expect(onDismiss).toHaveBeenCalledWith('a1')
})

it('inline preview is not absolutely positioned', () => {
  const { getByTestId } = render(
    <AnnouncementBanner announcement={A} inline onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  const style = [getByTestId('announcement-banner').props.style].flat()
  expect(style.some((s: { position?: string } | undefined) => s?.position === 'absolute')).toBe(false)
})
