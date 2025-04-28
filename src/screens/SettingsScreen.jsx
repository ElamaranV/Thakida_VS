import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const SettingsScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showLikes: true,
    showComments: true,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not authenticated',
        });
        return;
      }

      const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserData(data);
        setNotificationsEnabled(data.notificationsEnabled ?? true);
        setDarkMode(data.darkMode ?? false);
        setPrivacySettings(data.privacySettings ?? {
          profileVisibility: 'public',
          showLikes: true,
          showComments: true,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load settings',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to sign out',
      });
    }
  };

  const updateNotificationSettings = async (value) => {
    try {
      if (!auth.currentUser) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not authenticated',
        });
        return;
      }

      const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        notificationsEnabled: value,
      });
      setNotificationsEnabled(value);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Notification settings updated',
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update notification settings',
      });
    }
  };

  const updateDarkMode = async (value) => {
    try {
      if (!auth.currentUser) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not authenticated',
        });
        return;
      }

      const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        darkMode: value,
      });
      setDarkMode(value);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Theme settings updated',
      });
    } catch (error) {
      console.error('Error updating theme settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update theme settings',
      });
    }
  };

  const updatePrivacySettings = async (setting, value) => {
    try {
      if (!auth.currentUser) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not authenticated',
        });
        return;
      }

      const newPrivacySettings = { ...privacySettings, [setting]: value };
      const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        privacySettings: newPrivacySettings,
      });
      setPrivacySettings(newPrivacySettings);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Privacy settings updated',
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update privacy settings',
      });
    }
  };

  const SettingItem = ({ title, icon, onPress, value, type = 'button' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#000" />
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#f5dd4b' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={24} color="#999" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <Image
            source={{ uri: userData?.userProfilePic || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{userData?.username || 'User'}</Text>
            <Text style={styles.email}>{userData?.email || ''}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            title="Edit Profile"
            icon="person-outline"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingItem
            title="Change Password"
            icon="lock-closed-outline"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingItem
            title="Notifications"
            icon="notifications-outline"
            type="switch"
            value={notificationsEnabled}
            onPress={(value) => updateNotificationSettings(value)}
          />
          <SettingItem
            title="Dark Mode"
            icon="moon-outline"
            type="switch"
            value={darkMode}
            onPress={(value) => updateDarkMode(value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <SettingItem
            title="Profile Visibility"
            icon="eye-outline"
            onPress={() => navigation.navigate('PrivacySettings')}
          />
          <SettingItem
            title="Show Likes"
            icon="heart-outline"
            type="switch"
            value={privacySettings.showLikes}
            onPress={(value) => updatePrivacySettings('showLikes', value)}
          />
          <SettingItem
            title="Show Comments"
            icon="chatbubble-outline"
            type="switch"
            value={privacySettings.showComments}
            onPress={(value) => updatePrivacySettings('showComments', value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem
            title="Help Center"
            icon="help-circle-outline"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <SettingItem
            title="Report a Problem"
            icon="alert-circle-outline"
            onPress={() => navigation.navigate('ReportProblem')}
          />
          <SettingItem
            title="About"
            icon="information-circle-outline"
            onPress={() => navigation.navigate('About')}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 15,
    fontSize: 16,
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#ff416c',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 