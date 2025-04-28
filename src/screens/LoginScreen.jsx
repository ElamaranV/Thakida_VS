import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase';
import useGoogleAuth from '../hooks/useGoogleAuth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const promptAsync = useGoogleAuth();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message,
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await promptAsync();
      Toast.show({
        type: 'success',
        text1: 'Google Login Successful',
      });
    } catch (error) {
      console.log('Google Sign-In Error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Google Login Failed',
        text2: error.message,
      });
    }
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.background}>
      <BlurView intensity={80} tint="dark" style={styles.glass}>
        <Text style={styles.title}>Thakida</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#aaa"
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <Pressable style={styles.googleBtn} onPress={handleGoogleLogin}>
          <Ionicons name="logo-google" size={22} color="white" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </BlurView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glass: {
    padding: 25,
    width: '85%',
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  title: { fontSize: 32, color: 'white', fontWeight: 'bold', marginBottom: 30 },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    color: 'white',
  },
  loginButton: {
    backgroundColor: '#ff416c',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
  },
  loginText: { textAlign: 'center', color: 'white', fontWeight: 'bold' },
  googleBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    width: '100%',
    justifyContent: 'center',
  },
  googleText: { color: 'white', fontWeight: '600' },
  link: { color: '#ccc', marginTop: 15 },
});
