jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}))

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
      })),
    },
  },
}))

import { photoService } from '../photoService'

describe('photoService', () => {
  it('pickFromLibrary returns null when canceled', async () => {
    const result = await photoService.pickFromLibrary()
    expect(result).toBeNull()
  })

  it('takePhoto returns null when canceled', async () => {
    const result = await photoService.takePhoto()
    expect(result).toBeNull()
  })

  it('takePhoto saves the capture to the phone gallery', async () => {
    const ImagePicker = require('expo-image-picker')
    const MediaLibrary = require('expo-media-library')
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///capture.jpg' }] })

    const result = await photoService.takePhoto()

    expect(result).toBe('file:///capture.jpg')
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true)
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///capture.jpg')
  })

  it('takePhoto still returns the photo when gallery save fails', async () => {
    const ImagePicker = require('expo-image-picker')
    const MediaLibrary = require('expo-media-library')
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///capture2.jpg' }] })
    MediaLibrary.requestPermissionsAsync.mockRejectedValueOnce(new Error('denied'))

    const result = await photoService.takePhoto()

    expect(result).toBe('file:///capture2.jpg')
  })

  it('all methods are defined', () => {
    expect(photoService.pickFromLibrary).toBeDefined()
    expect(photoService.takePhoto).toBeDefined()
    expect(photoService.uploadPhoto).toBeDefined()
  })
})
