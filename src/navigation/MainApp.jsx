import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import AddVideoScreen from '../screens/AddVideoScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VideoDetail from '../screens/VideoDetail';
import SettingsScreen from '../screens/SettingsScreen';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomHeader = ({ navigation }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Toast.show({
        type: 'success',
        text1: 'Logged out',
        text2: 'You have been successfully logged out',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Logout failed',
        text2: error.message,
      });
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Thakida</Text>
      <TouchableOpacity onPress={handleLogout}>
        <Feather name="log-out" size={24} color="#ff416c" />
      </TouchableOpacity>
    </View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: { backgroundColor: '#000' },
      tabBarActiveTintColor: '#ff416c',
      tabBarInactiveTintColor: '#aaa',
      header: () => <CustomHeader />,
      tabBarIcon: ({ color, size }) => {
        let iconName;

        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'Add') iconName = 'plus-circle';
        else if (route.name === 'Search') iconName = 'search';
        else if (route.name === 'Profile') iconName = 'user';

        return <Feather name={iconName} size={22} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Add" component={AddVideoScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function MainApp() {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="VideoDetail" component={VideoDetail} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});