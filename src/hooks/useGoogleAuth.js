// src/hooks/useGoogleAuth.js
import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { auth, signInWithCredential } from '../services/firebase';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

export default function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '219480594633-qpip27n57d36a4aul5ra5d7bp49f3gsn.apps.googleusercontent.com',   
    webClientId: '219480594633-qpip27n57d36a4aul5ra5d7bp49f3gsn.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => console.log('Firebase login successful'))
        .catch((error) => console.error('Firebase login failed', error));
    }
  }, [response]);

  return { promptAsync};
}
