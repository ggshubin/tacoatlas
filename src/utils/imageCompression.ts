import * as ImageManipulator from 'expo-image-manipulator'

const MAX_WIDTH = 1200
const JPEG_QUALITY = 0.75

/**
 * Compresses a local image URI: resizes to max 1200px wide (preserving aspect
 * ratio) and re-encodes as JPEG at 0.75 quality.
 *
 * Returns the compressed local URI, ready to pass to a Supabase Storage upload.
 */
export async function compressImage(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}
