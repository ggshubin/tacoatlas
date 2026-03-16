jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
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

  it('all methods are defined', () => {
    expect(photoService.pickFromLibrary).toBeDefined()
    expect(photoService.takePhoto).toBeDefined()
    expect(photoService.uploadPhoto).toBeDefined()
  })
})
