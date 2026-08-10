import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from './types';
import { SearchScreen } from '../screens/search/SearchScreen';
import { JobDetailScreen } from '../screens/job/JobDetailScreen';
import { ChatThreadScreen } from '../screens/profile/ChatThreadScreen';
import { LiveLocationScreen } from '../screens/job/LiveLocationScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export const SearchNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="LiveLocation" component={LiveLocationScreen} />
    </Stack.Navigator>
  );
};
