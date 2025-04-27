import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  FlatList
} from 'react-native';
import { Video } from 'expo-av';
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  MaterialCommunityIcons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { firestore, auth } from '../services/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function VideoDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { videoId } = route.params;
  const insets = useSafeAreaInsets();
  const videoRef = useRef(null);
  
  const [video, setVideo] = useState(null);
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        // Get video data
        const videoDoc = await getDoc(doc(firestore, 'videos', videoId));
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          setVideo({
            id: videoDoc.id,
            ...videoData
          });
          setLikesCount(videoData.likes || 0);

          // Check if current user liked this video
          if (auth.currentUser) {
            const likeDoc = await getDoc(
              doc(firestore, 'likes', videoDoc.id, 'userLikes', auth.currentUser.uid)
            );
            setIsLiked(likeDoc.exists());
          }

          // Get user data
          const userQuery = query(
            collection(firestore, 'users'),
            where('username', '==', videoData.username)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUser({
              id: userSnapshot.docs[0].id,
              ...userData
            });

            // Check if current user is following this user
            if (auth.currentUser && auth.currentUser.uid !== userSnapshot.docs[0].id) {
              const followDoc = await getDoc(
                doc(firestore, 'followers', userSnapshot.docs[0].id, 'userFollowers', auth.currentUser.uid)
              );
              setIsFollowing(followDoc.exists());
            }
          }

          // Get comments
          const commentsQuery = query(
            collection(firestore, 'videos', videoDoc.id, 'comments'),
            orderBy('createdAt', 'desc')
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          const commentsData = commentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setComments(commentsData);

          // Get related videos
          const relatedQuery = query(
            collection(firestore, 'videos'),
            where('username', '==', videoData.username),
            where('__name__', '!=', videoDoc.id),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const relatedSnapshot = await getDocs(relatedQuery);
          const relatedData = relatedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRelatedVideos(relatedData);
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load video. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  const handleLike = async () => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to like videos',
      });
      return;
    }

    try {
      const likeRef = doc(firestore, 'likes', videoId, 'userLikes', auth.currentUser.uid);
      
      if (isLiked) {
        // Unlike
        await updateDoc(doc(firestore, 'videos', videoId), {
          likes: increment(-1)
        });
        setLikesCount(prev => prev - 1);
      } else {
        // Like
        await updateDoc(doc(firestore, 'videos', videoId), {
          likes: increment(1)
        });
        setLikesCount(prev => prev + 1);
      }
      
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to follow users',
      });
      return;
    }

    try {
      const followerRef = doc(firestore, 'followers', user.id, 'userFollowers', auth.currentUser.uid);
      const followingRef = doc(firestore, 'following', auth.currentUser.uid, 'userFollowing', user.id);
      
      if (isFollowing) {
        // Unfollow
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
      } else {
        // Follow
        await setDoc(followerRef, {
          createdAt: serverTimestamp()
        });
        await setDoc(followingRef, {
          createdAt: serverTimestamp()
        });
      }
      
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow:', error);
    }
  };

  const handleAddComment = async () => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to comment',
      });
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentRef = collection(firestore, 'videos', videoId, 'comments');
      const newCommentRef = await addDoc(commentRef, {
        text: newComment,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        userProfilePic: auth.currentUser.photoURL || null,
        createdAt: serverTimestamp()
      });

      setComments(prev => [{
        id: newCommentRef.id,
        text: newComment,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        userProfilePic: auth.currentUser.photoURL || null,
        createdAt: new Date()
      }, ...prev]);

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.userProfilePic || 'https://via.placeholder.com/40' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{item.username}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
        <Text style={styles.commentTime}>
          {new Date(item.createdAt?.toDate()).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const renderRelatedVideo = ({ item }) => (
    <TouchableOpacity
      style={styles.relatedVideoItem}
      onPress={() => navigation.replace('VideoDetail', { videoId: item.id })}
    >
      <Video
        source={{ uri: item.videoUrl }}
        style={styles.relatedVideoThumbnail}
        resizeMode="cover"
        shouldPlay={false}
        isMuted={true}
        useNativeControls={false}
      />
      <Text numberOfLines={2} style={styles.relatedVideoTitle}>
        {item.caption || 'No caption'}
      </Text>
    </TouchableOpacity>
  );

  if (loading || !video) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff416c" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      
      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: video.videoUrl }}
          style={styles.videoPlayer}
          resizeMode="cover"
          shouldPlay
          isLooping
          isMuted={isMuted}
          useNativeControls={false}
        />
        
        {/* Video Overlay Controls */}
        <View style={styles.videoOverlay}>
          {/* Mute Button */}
          <TouchableOpacity
            style={styles.muteButton}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          
          {/* Right Side Action Buttons */}
          <View style={styles.rightActions}>
            {/* User Profile */}
            <TouchableOpacity
              style={styles.userButton}
              onPress={() => navigation.navigate('Profile', { userId: user.id })}
            >
              <Image
                source={{ uri: user.userProfilePic || 'https://via.placeholder.com/60' }}
                style={styles.userAvatar}
              />
            </TouchableOpacity>
            
            {/* Like Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <FontAwesome
                name={isLiked ? 'heart' : 'heart-o'}
                size={30}
                color={isLiked ? '#ff416c' : '#fff'}
              />
              <Text style={styles.actionCount}>{likesCount}</Text>
            </TouchableOpacity>
            
            {/* Comment Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(!showComments)}
            >
              <MaterialCommunityIcons
                name="comment-outline"
                size={28}
                color="#fff"
              />
              <Text style={styles.actionCount}>{comments.length}</Text>
            </TouchableOpacity>
            
            {/* Share Button */}
            <TouchableOpacity style={styles.actionButton}>
              <Feather name="send" size={26} color="#fff" />
            </TouchableOpacity>
            
            {/* Follow Button */}
            {auth.currentUser?.uid !== user?.id && (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
                onPress={handleFollow}
              >
                <Text style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText
                ]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Video Info Section */}
      <View style={styles.videoInfo}>
        <Text style={styles.videoCaption}>{video.caption}</Text>
        <Text style={styles.videoUsername}>@{video.username}</Text>
        <Text style={styles.videoTime}>
          {new Date(video.createdAt?.toDate()).toLocaleString()}
        </Text>
      </View>
      
      {/* Comments Section */}
      {showComments && (
        <View style={styles.commentsContainer}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            style={styles.commentsList}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
          
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity
              style={styles.commentButton}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Text style={styles.commentButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Related Videos Section */}
      {!showComments && relatedVideos.length > 0 && (
        <View style={styles.relatedVideosContainer}>
          <Text style={styles.sectionTitle}>More from @{video.username}</Text>
          <FlatList
            data={relatedVideos}
            renderItem={renderRelatedVideo}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedVideosList}
          />
        </View>
      )}
      
      <Toast />
    </SafeAreaView>
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
  backButton: {
    position: 'absolute',
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9/16,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 15,
  },
  muteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  rightActions: {
    alignItems: 'center',
    marginRight: 10,
  },
  userButton: {
    marginBottom: 20,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  followButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ff416c',
    marginTop: 10,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  followingButtonText: {
    color: '#fff',
  },
  videoInfo: {
    padding: 15,
  },
  videoCaption: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  videoUsername: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  videoTime: {
    color: '#888',
    fontSize: 12,
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
    zIndex: 10,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentsList: {
    flex: 1,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 3,
  },
  commentTime: {
    fontSize: 12,
    color: '#888',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  commentButton: {
    backgroundColor: '#ff416c',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  commentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  relatedVideosContainer: {
    padding: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  relatedVideosList: {
    paddingBottom: 15,
  },
  relatedVideoItem: {
    width: width * 0.45,
    marginRight: 15,
  },
  relatedVideoThumbnail: {
    width: '100%',
    aspectRatio: 9/16,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  relatedVideoTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
});