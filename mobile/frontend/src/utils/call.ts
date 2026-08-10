import { Alert, Linking } from 'react-native';
import { ApiRequestError, getCallInfo } from '../services/api';

// MVP calling: hand off to the device's own phone dialer via `tel:`. No in-app VoIP —
// that's future scope (Twilio/Agora/WebRTC), not this pass.
//
// Deliberately skips a Linking.canOpenURL() pre-check: per Expo's docs that call rejects
// on iOS unless `tel` is declared in Info.plist's LSApplicationQueriesSchemes, which would
// make a perfectly callable number falsely report as "can't call". tel: is universally
// supported, so just attempt openURL directly and only surface a failure if that itself
// throws/rejects.
export const callPhoneNumber = async (phone: string) => {
  try {
    await Linking.openURL(`tel:${phone}`);
  } catch {
    Alert.alert('Could not open dialer', 'Please try again.');
  }
};

// Backend re-verifies the poster/accepted-worker relationship on every call — this just
// surfaces whatever it decides (including "not available yet") to the user.
export const startJobCall = async (accessToken: string, jobId: string) => {
  try {
    const res = await getCallInfo(accessToken, jobId);
    await callPhoneNumber(res.phone);
  } catch (e) {
    const message =
      e instanceof ApiRequestError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Could not start the call. Try again.';
    Alert.alert('Call unavailable', message);
  }
};
