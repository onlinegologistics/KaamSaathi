import { NavigatorScreenParams } from '@react-navigation/native';

export type ProfileEditSection = 'profile' | 'kyc' | 'wallet';

export type AuthStackParamList = {
  Onboarding: undefined;
  Splash: undefined;
  PhoneEntry: undefined;
  OtpVerification: { demoOtp: string };
  ProfileSetup: undefined;
};

export type LiveLocationParams = { jobId: string; otherUserName: string };

export type HomeStackParamList = {
  HomeFeed: undefined;
  JobDetail: { jobId: string };
  Search: undefined;
  ChatThread: ChatThreadParams;
  LiveLocation: LiveLocationParams;
};

export type SearchStackParamList = {
  SearchMain: undefined;
  JobDetail: { jobId: string };
  ChatThread: ChatThreadParams;
  LiveLocation: LiveLocationParams;
};

export type PostStackParamList = {
  PostJob: undefined;
  PostSuccess: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  JobApplicants: undefined;
  JobApplicantsDetail: { jobId: string };
  EditJob: { jobId: string };
  MyApplications: undefined;
  SavedJobs: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  AiAssistant: undefined;
  EditProfile: { section?: ProfileEditSection } | undefined;
  Wallet: undefined;
  LiveLocation: LiveLocationParams;
};

export type ChatThreadParams = {
  chatId: string;
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatThread: ChatThreadParams;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
  PostTab: NavigatorScreenParams<PostStackParamList>;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
