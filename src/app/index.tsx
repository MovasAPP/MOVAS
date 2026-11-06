import { Platform } from 'react-native';

import { MarketingLanding } from '@/components/MarketingLanding';
import MarketplaceHomeScreen from '@/components/MarketplaceHomeScreen';

export default function IndexScreen() {
  return Platform.OS === 'web' ? <MarketingLanding /> : <MarketplaceHomeScreen />;
}
