import { Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { MarketingLanding } from '@/components/MarketingLanding';
import MarketplaceHomeScreen from '@/components/MarketplaceHomeScreen';

export default function IndexScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return Platform.OS === 'web' && view !== 'explore' ? <MarketingLanding /> : <MarketplaceHomeScreen />;
}
