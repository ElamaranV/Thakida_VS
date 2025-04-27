import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { auth, firestore } from '../services/firebase';
import { setDoc, doc, query, where, getDocs, collection } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

export default function CompleteProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(''); // New state for Display Name
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'You need to allow access to your media library.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick a photo. Please try again.',
      });
    }
  };

  const uploadPhoto = async () => {
    const response = await fetch(photo);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', 'thakida_uploads');

    const cloudinaryResponse = await fetch(
      'https://api.cloudinary.com/v1_1/dgsqldkve/image/upload',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    const cloudinaryData = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok) {
      throw new Error(cloudinaryData.error?.message || 'Failed to upload photo.');
    }

    return cloudinaryData.secure_url;
  };

  const handleCompleteProfile = async () => {
    if (!username || !displayName || !phoneNumber || !photo) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter all fields and select a profile photo.',
      });
      return;
    }
  
    setLoading(true);
  
    try {
      // Check for duplicate usernames
      const usernameQuery = query(
        collection(firestore, 'users'),
        where('username', '==', username)
      );
      const querySnapshot = await getDocs(usernameQuery);
  
      if (!querySnapshot.empty) {
        Toast.show({
          type: 'error',
          text1: 'Username Taken',
          text2: 'Please choose a different username.',
        });
        setLoading(false);
        return;
      }
  
      const userProfilePic = await uploadPhoto();
  
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
  
      await setDoc(userRef, {
        username: username,
        displayName: displayName, // Save Display Name
        phoneNumber: phoneNumber,
        email: auth.currentUser.email,
        userProfilePic: userProfilePic,
        createdAt: new Date(),
      });
  
      Toast.show({
        type: 'success',
        text1: 'Profile Completed',
        text2: 'Welcome to Thakida!',
      });
  
      // No need to manually navigate to MainApp
      // The NavigationContainer will handle this automatically
    } catch (error) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'An error occurred while saving your profile.',
      });
    }
  
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.background}>
      <BlurView intensity={80} tint="dark" style={styles.glass}>
        <Text style={styles.title}>Complete Your Profile</Text>

        <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <Text style={styles.photoText}>Pick a Profile Photo</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Choose a Username"
          placeholderTextColor="#aaa"
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Display Name" // New input for Display Name
          placeholderTextColor="#aaa"
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          onChangeText={setPhoneNumber}
        />

        <TouchableOpacity
          style={[styles.button, loading && { backgroundColor: '#666' }]}
          onPress={handleCompleteProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </BlurView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glass: {
    padding: 25,
    width: '85%',
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  title: {
    fontSize: 26,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  photoPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoText: {
    color: '#aaa',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    color: 'white',
  },
  button: {
    backgroundColor: '#7B2FF7',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
});
