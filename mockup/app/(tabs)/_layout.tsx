import { Tabs } from 'expo-router/js-tabs';

import { AppTabBar } from '~/components/tab-bar';
import { useUnreadCount } from '~/features/inbox';
import { palette } from '~/lib/theme';

export default function TabsLayout() {
  const unreadCount = useUnreadCount();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} unreadCount={unreadCount} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="amenities" options={{ title: 'Book' }} />
      <Tabs.Screen name="payments" options={{ title: 'Pay' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
