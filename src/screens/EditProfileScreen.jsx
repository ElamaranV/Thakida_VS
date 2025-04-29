import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, firestore, storage } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';

export default function EditProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    displayName: '',
    username: '',
    bio: '',
    phoneNumber: '',
    userProfilePic: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            displayName: data.displayName || '',
            username: data.username || '',
            bio: data.bio || '',
            phoneNumber: data.phoneNumber || '',
            userProfilePic: data.userProfilePic || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load profile data',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to change your profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploading(true);
        const imageUri = result.assets[0].uri;
        
        // Upload image to Firebase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `profile_${auth.currentUser.uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `profile_pictures/${filename}`);
        
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        setUserData(prev => ({ ...prev, userProfilePic: downloadURL }));
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking/uploading image:', error);
      setUploading(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile picture',
      });
    }
  };

  const handleSave = async () => {
    if (!userData.username.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Username is required',
      });
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        displayName: userData.displayName.trim(),
        username: userData.username.trim(),
        bio: userData.bio.trim(),
        phoneNumber: userData.phoneNumber.trim(),
        userProfilePic: userData.userProfilePic,
        updatedAt: new Date(),
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff416c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profilePictureContainer}>
        <TouchableOpacity onPress={pickImage} disabled={uploading}>
          {userData.userProfilePic ? (
            <Image
              source={{ uri: userData.userProfilePic }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={userData.displayName}
            onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
            placeholder="Enter your display name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={userData.username}
            onChangeText={(text) => setUserData(prev => ({ ...prev, username: text }))}
            placeholder="Enter your username"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={userData.bio}
            onChangeText={(text) => setUserData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={userData.phoneNumber}
            onChangeText={(text) => setUserData(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="Enter your phone number"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: '#ff416c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profilePictureContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ff416c',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff416c',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#ff416c',
    marginTop: 10,
    fontSize: 14,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 10, // Reduced from 20
    marginTop: 5, // Reduced from 10
},
bio: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10, // Reduced from 15
    width: '80%',
    maxHeight: 40, // Limit height to prevent overflow
},
profileActionButtons: {
    flexDirection: 'row',
    marginTop: 10, // Reduced from 15
    marginBottom: 10, // Added to ensure space at bottom
    position: 'relative', // Ensure visibility
    zIndex: 5, // Higher z-index to prevent being hidden
},
profileBannerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start', // Changed from 'center' to better distribute space
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 10, // Added to ensure spacing at bottom
},
}); 