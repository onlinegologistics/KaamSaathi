import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeFeedScreen } from '../screens/home/HomeFeedScreen';
import { JobDetailScreen } from '../screens/job/JobDetailScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { ChatThreadScreen } from '../screens/profile/ChatThreadScreen';
import { LiveLocationScreen } from '../screens/job/LiveLocationScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeFeedScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="LiveLocation" component={LiveLocationScreen} />
    </Stack.Navigator>
  );
};
