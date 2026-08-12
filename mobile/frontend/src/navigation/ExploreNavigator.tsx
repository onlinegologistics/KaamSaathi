import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreStackParamList } from './types';
import { ExploreScreen } from '../screens/explore/ExploreScreen';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export const ExploreNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
    </Stack.Navigator>
  );
};
