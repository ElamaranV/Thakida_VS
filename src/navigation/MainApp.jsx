import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import AddVideoScreen from '../screens/AddVideoScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VideoDetail from '../screens/VideoDetail';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomHeader = ({ navigation }) => {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (auth.currentUser) {
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setPoints(doc.data().coins || 0);
        }
      });

      return () => unsubscribe();
    }
  }, []);

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
    <SafeAreaView style={styles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Thakida</Text>
        <View style={styles.headerRight}>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="piggy-bank" size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{points}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Feather name="log-out" size={24} color="#ff416c" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: { 
        backgroundColor: '#000',
        height: 60,
        paddingBottom: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 0,
        borderTopWidth: 1,
        borderTopColor: '#333',
      },
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
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingTop: 10, // Add top padding
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16, // Consistent horizontal padding
    paddingVertical: 12, // Vertical padding for better spacing
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22, // Slightly larger font
    fontWeight: 'bold',
    paddingLeft: 4, // Small left padding for title
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Space between piggy bank and logout
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  logoutButton: {
    padding: 8,
    marginRight: 4, // Small right margin
  },
});