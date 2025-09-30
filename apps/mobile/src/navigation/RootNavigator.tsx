import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TodayScreen } from '@screens/TodayScreen';
import { RootStackParamList } from '../types/navigation';
import { useThemeStore } from '@store/themeStore';
import { colors } from '@constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <Stack.Navigator
      initialRouteName="Today"
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? colors.dark.background : colors.light.background,
        },
        headerTintColor: isDark ? colors.dark.text : colors.light.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        contentStyle: {
          backgroundColor: isDark ? colors.dark.background : colors.light.background,
        },
        animation: 'slide_from_right',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: 'Today',
          headerLargeTitle: true,
          headerLargeTitleStyle: {
            fontWeight: '700',
            fontSize: 34,
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;