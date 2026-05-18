import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export function useImageUpload() {
  async function uploadImage(blob, path) {
    const storage = getStorage()
    const fileRef = storageRef(storage, path)
    const snap = await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' })
    return getDownloadURL(snap.ref)
  }
  return { uploadImage }
}
