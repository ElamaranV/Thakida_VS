import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/NavigationContainer';
import Toast from 'react-native-toast-message';

export default function App() {
  return (
    <>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
      <StatusBar style="auto" />
      <Toast />
      </GestureHandlerRootView>
    </>
  );
}
