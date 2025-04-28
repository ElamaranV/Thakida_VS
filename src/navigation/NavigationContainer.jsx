import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import MainApp from './MainApp';
import Toast from 'react-native-toast-message';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.username && userData.phoneNumber) {
            setProfileComplete(true); // Profile is complete
          } else { 
            setProfileComplete(false); // Profile is incomplete
          }
        } else {
          setProfileComplete(false); // No user document found
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setProfileComplete(false);
      }
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  if (checkingAuth) return null; // Show a loading screen or spinner while checking auth

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !profileComplete ? (
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={MainApp} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}