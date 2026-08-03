import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostStackParamList } from './types';
import { PostJobScreen } from '../screens/post/PostJobScreen';
import { PostSuccessScreen } from '../screens/post/PostSuccessScreen';

const Stack = createNativeStackNavigator<PostStackParamList>();

export const PostNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PostJob" component={PostJobScreen} />
      <Stack.Screen name="PostSuccess" component={PostSuccessScreen} />
    </Stack.Navigator>
  );
};
