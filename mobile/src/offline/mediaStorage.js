import * as FileSystem from 'expo-file-system';

export async function persistCapturedPhoto(uri, fileId) {
  const directory = `${FileSystem.documentDirectory}merchandising/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${fileId}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
