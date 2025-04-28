import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useLikedVideos } from '../context/LikedVideosContext';
import Toast from 'react-native-toast-message';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { auth } from '../firebase/firebaseConfig';

const VideoDetailScreen = ({ route, navigation }) => {
  const { video } = route.params;
  const [loading, setLoading] = useState(false);
  const { likedVideos, toggleLike } = useLikedVideos();
  const [isLiked, setIsLiked] = useState(likedVideos.has(video.id));
  const [likeCount, setLikeCount] = useState(video.likes?.length || 0);

  const handleLike = async () => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please login to like videos',
      });
      return;
    }

    setLoading(true);
    try {
      const videoRef = doc(firestore, 'videos', video.id);
      const userRef = doc(firestore, 'users', auth.currentUser.uid);

      if (isLiked) {
        // Unlike
        await updateDoc(videoRef, {
          likes: arrayRemove(auth.currentUser.uid)
        });
        await updateDoc(userRef, {
          likedVideos: arrayRemove(video.id)
        });
        setLikeCount(prev => prev - 1);
      } else {
        // Like
        await updateDoc(videoRef, {
          likes: arrayUnion(auth.currentUser.uid)
        });
        await updateDoc(userRef, {
          likedVideos: arrayUnion(video.id)
        });
        setLikeCount(prev => prev + 1);
      }

      setIsLiked(!isLiked);
      await toggleLike(video.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update like status',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.username}>@{video.username}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Video
          source={{ uri: video.videoUrl }}
          style={styles.video}
          useNativeControls
          resizeMode="contain"
          isLooping
          shouldPlay
        />

        <View style={styles.videoInfo}>
          <Text style={styles.caption}>{video.caption}</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              disabled={loading}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#FF2D55" : "#666"}
              />
              <Text style={styles.actionText}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Comments', { videoId: video.id })}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#666" />
              <Text style={styles.actionText}>{video.comments || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  username: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  video: {
    width: '100%',
    aspectRatio: 9/16,
  },
  videoInfo: {
    padding: 15,
  },
  caption: {
    fontSize: 16,
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default VideoDetailScreen; 