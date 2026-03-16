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
    const response = await fetch(localUri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('review-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from('review-photos').getPublicUrl(fileName)
    return data.publicUrl
  },
}
