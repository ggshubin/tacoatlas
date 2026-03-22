import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'
import { nanoid } from 'nanoid/non-secure'

export const photoService = {
  async pickFromLibrary(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })

    if (result.canceled) return null
    return result.assets[0].uri
  },

  async takePhoto(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return null

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    })

    if (result.canceled) return null
    return result.assets[0].uri
  },

  async uploadPhoto(localUri: string, userId: string): Promise<string> {
    const fileName = `${userId}/${nanoid()}.jpg`
    const bucketName = 'review-photos'
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as any)

    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
    return data.publicUrl
  },

  async uploadAvatar(localUri: string, userId: string): Promise<string> {
    const fileName = `avatars/${userId}.jpg`
    const bucketName = 'review-photos'
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    // Use FormData with direct URI — React Native handles file reading natively,
    // avoiding fetch(file://) which fails on Android
    const formData = new FormData()
    formData.append('file', { uri: localUri, name: 'avatar.jpg', type: 'image/jpeg' } as any)

    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
      },
      body: formData,
    })

    if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
    return `${data.publicUrl}?v=${Date.now()}`
  },
}
