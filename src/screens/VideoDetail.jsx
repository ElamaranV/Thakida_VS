import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
  KeyboardAvoidingView
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome,
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
  increment,
  orderBy,
  limit,
  deleteDoc,
  setDoc,
  arrayRemove,
  arrayUnion
} from 'firebase/firestore';
import { firestore, auth } from '../services/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import VideoPlayer from '../components/VideoPlayer';
import ErrorBoundary from '../components/ErrorBoundary';

const { width, height } = Dimensions.get('window');

export default function VideoDetail({ navigation, route }) {
  const { videoId } = route.params;
  const insets = useSafeAreaInsets();
  const videoRef = useRef(null);
  const commentInputRef = useRef(null);
  
  const [video, setVideo] = useState(null);
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get video data
        const videoDoc = await getDoc(doc(firestore, 'videos', videoId));
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          
          // Ensure we have all required fields with proper defaults
          const formattedVideoData = {
            id: videoDoc.id,
            videoUrl: videoData.videoUrl,
            username: videoData.username,
            userId: videoData.userId,
            caption: videoData.caption || '',
            likes: Array.isArray(videoData.likes) ? videoData.likes : [],
            comments: Array.isArray(videoData.comments) ? videoData.comments : [],
            createdAt: videoData.createdAt || new Date(),
            userProfilePic: videoData.userProfilePic || 'https://via.placeholder.com/100'
          };
          
          setVideo(formattedVideoData);
          setLikesCount(formattedVideoData.likes.length);

          // Fetch user data
          if (formattedVideoData.userId) {
            const userDoc = await getDoc(doc(firestore, 'users', formattedVideoData.userId));
            if (userDoc.exists()) {
              setUser(userDoc.data());
            }
          }

          // Fetch related videos
          if (formattedVideoData.userId) {
            const relatedVideosQuery = query(
              collection(firestore, 'videos'),
              where('userId', '==', formattedVideoData.userId),
              where('id', '!=', videoId),
              orderBy('createdAt', 'desc'),
              limit(6)
            );
            
            const relatedVideosSnapshot = await getDocs(relatedVideosQuery);
            const relatedVideosData = relatedVideosSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                videoUrl: data.videoUrl,
                username: data.username,
                userId: data.userId,
                caption: data.caption || '',
                likes: Array.isArray(data.likes) ? data.likes : [],
                comments: Array.isArray(data.comments) ? data.comments : [],
                createdAt: data.createdAt || new Date(),
                userProfilePic: data.userProfilePic || 'https://via.placeholder.com/100'
              };
            });
            
            setRelatedVideos(relatedVideosData);
          }
        } else {
          setError('Video not found');
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();

    // Cleanup function
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pauseAsync();
        } catch (error) {
          console.error('Error cleaning up video:', error);
        }
      }
    };
  }, [videoId]);

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    
    try {
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;

    try {
      setIsMuted(prev => !prev);
      await videoRef.current.setIsMutedAsync(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please login to like videos',
      });
      return;
    }

    try {
      const videoRef = doc(firestore, 'videos', videoId);
      const currentLikes = video.likes || [];
      const isCurrentlyLiked = currentLikes.includes(auth.currentUser.uid);

      if (isCurrentlyLiked) {
        // Unlike
        await updateDoc(videoRef, {
          likes: arrayRemove(auth.currentUser.uid)
        });
        setLikesCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        await updateDoc(videoRef, {
          likes: arrayUnion(auth.currentUser.uid)
        });
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update like status',
      });
    }
  };

  const handleFollow = async () => {
    // Follow/unfollow functionality would go here
    console.log('Follow toggled');
  };

  const handleAddComment = async () => {
    // Add comment functionality would go here
    console.log('Comment added');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff416c" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 10 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {video && (
            <Pressable onPress={togglePlayPause} style={styles.videoWrapper}>
              <VideoPlayer
                uri={video.videoUrl}
                style={styles.video}
                shouldPlay={isPlaying}
                isMuted={isMuted}
                isActive={true}
                isLooping={true}
                onRef={(ref) => (videoRef.current = ref)}
              />
              
              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <View style={styles.playOverlay}>
                  <TouchableOpacity onPress={togglePlayPause}>
                    <Ionicons name="play" size={50} color="rgba(255, 255, 255, 0.8)" />
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          )}
          
          {/* Video Controls */}
          <View style={styles.videoControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? "volume-mute" : "volume-high"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Video Info */}
        <ScrollView style={styles.infoContainer}>
          {video && (
            <>
              <View style={styles.videoInfo}>
                <Text style={styles.videoCaption}>{video.caption}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>
                    {video.views || 0} views • {new Date(video.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              {/* User Info */}
              <View style={styles.userInfoContainer}>
                <View style={styles.userInfo}>
                  <Image 
                    source={{ 
                      uri: video.userProfilePic || 'https://via.placeholder.com/100'
                    }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userTextInfo}>
                    <Text style={styles.username}>@{video.username}</Text>
                    <Text style={styles.userFollowers}>
                      {video.followerCount || 0} followers
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.followButton, 
                    isFollowing ? styles.followingButton : {}
                  ]}
                  onPress={handleFollow}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowing ? styles.followingButtonText : {}
                  ]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleLike}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={28} 
                    color={isLiked ? "#ff416c" : "#fff"} 
                  />
                  <Text style={styles.actionButtonText}>
                    {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setShowComments(true)}
                >
                  <Ionicons name="chatbubble-outline" size={26} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-social-outline" size={26} color="#fff" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              {/* Related Videos */}
              <View style={styles.relatedVideosContainer}>
                <Text style={styles.sectionTitle}>More from @{video.username}</Text>
                
                <View style={styles.relatedVideosGrid}>
                  {relatedVideos.length > 0 ? (
                    relatedVideos.map(relatedVideo => (
                      <TouchableOpacity 
                        key={relatedVideo.id}
                        style={styles.relatedVideoItem}
                        onPress={() => navigation.push('VideoDetail', { videoId: relatedVideo.id })}
                      >
                        <View style={styles.relatedVideoThumbnail}>
                          <VideoPlayer
                            uri={relatedVideo.videoUrl}
                            style={styles.relatedVideoPlayer}
                            shouldPlay={false}
                            isMuted={true}
                            isActive={false}
                          />
                          <View style={styles.relatedVideoOverlay}>
                            <Ionicons name="play" size={24} color="#fff" />
                          </View>
                        </View>
                        <Text numberOfLines={2} style={styles.relatedVideoTitle}>
                          {relatedVideo.caption}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noRelatedVideos}>No other videos from this user.</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    color: '#ff416c',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#ff416c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 5,
  },
  videoContainer: {
    width: '100%',
    height: width * (9/16), // 16:9 aspect ratio
    backgroundColor: '#000',
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoInfo: {
    padding: 15,
  },
  videoCaption: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#aaa',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userTextInfo: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userFollowers: {
    color: '#aaa',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: '#ff416c',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff416c',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#ff416c',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
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
  relatedVideosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  relatedVideoItem: {
    width: (width - 45) / 2,
    marginBottom: 15,
  },
  relatedVideoThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  relatedVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  relatedVideoTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  noRelatedVideos: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
  }
});