import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useEffect } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function useGoogleAuth() {
  // Generate redirect URI automatically
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,  // VERY IMPORTANT in Expo Go
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '219480594633-qpip27n57d36a4aul5ra5d7bp49f3gsn.apps.googleusercontent.com',
    redirectUri: redirectUri,
    scopes: ['profile', 'email'],
    responseType: 'id_token',
    useProxy: true, 
  });

  useEffect(() => {
    const signIn = async () => {
      if (response?.type === 'success') {
        const { id_token } = response.params;
        if (!id_token) {
          console.error("No ID token found in Google response.");
          return;
        }

        const credential = GoogleAuthProvider.credential(id_token);
        try {
          await signInWithCredential(auth, credential);
        } catch (error) {
          console.error("Firebase signInWithCredential error:", error);
        }
      }
    };

    signIn();
  }, [response]);

  return promptAsync;
}
