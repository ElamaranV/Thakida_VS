import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '219480594633-qpip27n57d36a4aul5ra5d7bp49f3gsn.apps.googleusercontent.com',
    webClientId: '219480594633-qpip27n57d36a4aul5ra5d7bp49f3gsn.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    responseType: 'id_token',
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
