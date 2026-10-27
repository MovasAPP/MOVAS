import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

export function getAuthRedirectUrl(path: 'auth-callback' | 'reset-password') {
  if (Platform.OS === 'web') return `${window.location.origin}/${path}`;
  return Linking.createURL(path, { scheme: 'contratei' });
}
