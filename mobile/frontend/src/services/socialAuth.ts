import Constants from 'expo-constants';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
// react-native-fbsdk-next is intentionally NOT imported here: merely importing it crashes the
// app on launch (its native module throws "FacebookSdk has not been initialized" on first
// property access) unless the config plugin ran with a real FACEBOOK_APP_ID — see app.config.js.
// Re-add `import { LoginManager, AccessToken } from 'react-native-fbsdk-next'` + a
// signInWithFacebook() function here once Facebook credentials are configured and prebuild
// has run.

let googleConfigured = false;

const ensureGoogleConfigured = () => {
  if (googleConfigured) return;
  const webClientId = (Constants.expoConfig as any)?.extra?.googleWebClientId;
  if (!webClientId) {
    throw new Error('Google Sign-In is not configured for this build.');
  }
  GoogleSignin.configure({ webClientId, offlineAccess: false });
  googleConfigured = true;
};

export interface GoogleSignInResult {
  idToken: string;
  name: string;
  email: string;
}

/** Resolves with the Google idToken + profile info, or throws (including on user cancellation). */
export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices();
    try {
      await GoogleSignin.signOut();
    } catch {
      // Best-effort only: clearing the cached Google user should not block a fresh sign-in.
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error('Google sign-in did not return a token.');
    }
    return {
      idToken: response.data.idToken,
      name: response.data.user.name || '',
      email: response.data.user.email,
    };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google sign-in was cancelled.');
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device.');
      }
    }
    throw e instanceof Error ? e : new Error('Could not sign in with Google.');
  }
};
