import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { JobApplicantsScreen } from '../screens/job/JobApplicantsScreen';
import { JobApplicantsDetailScreen } from '../screens/job/JobApplicantsDetailScreen';
import { EditJobScreen } from '../screens/job/EditJobScreen';
import { MyApplicationsScreen } from '../screens/profile/MyApplicationsScreen';
import { SavedJobsScreen } from '../screens/profile/SavedJobsScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { HelpSupportScreen } from '../screens/profile/HelpSupportScreen';
import { AiAssistantScreen } from '../screens/profile/AiAssistantScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { WalletScreen } from '../screens/profile/WalletScreen';
import { LiveLocationScreen } from '../screens/job/LiveLocationScreen';
import { ViewProfileScreen } from '../screens/profile/ViewProfileScreen';
import { ChatListScreen } from '../screens/profile/ChatListScreen';
import { ChatThreadScreen } from '../screens/profile/ChatThreadScreen';
import { AccountTypeScreen } from '../screens/profile/AccountTypeScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="JobApplicants" component={JobApplicantsScreen} />
      <Stack.Screen name="JobApplicantsDetail" component={JobApplicantsDetailScreen} />
      <Stack.Screen name="EditJob" component={EditJobScreen} />
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <Stack.Screen name="SavedJobs" component={SavedJobsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="LiveLocation" component={LiveLocationScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="AccountType" component={AccountTypeScreen} />
    </Stack.Navigator>
  );
};
