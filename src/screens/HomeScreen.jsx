import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  Text,
  TouchableOpacity,
  Pressable,
  Platform,
  SafeAreaView,
  AppState,
  Image,
  Share
} from 'react-native';
import { collection, getDocs, query, orderBy, limit, startAfter, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import VideoPlayer from '../components/VideoPlayer';
import { isVideoVisible, getVideoErrorMessage } from '../utils/videoHelpers';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLikedVideos } from '../context/LikedVideosContext';
import Toast from 'react-native-toast-message';

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); 
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [orientationIsLandscape, setOrientationIsLandscape] = useState(
    dimensions.width > dimensions.height
  );
  const [appState, setAppState] = useState(AppState.currentState);
  const [error, setError] = useState(null);
  
  const flatListRef = useRef(null);
  const videoRefs = useRef({});
  const lastDocRef = useRef(null);
  const { likedVideos, toggleLike } = useLikedVideos();

  // Handle dimension changes for responsive layout
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setOrientationIsLandscape(window.width > window.height);
    });
    
    return () => subscription?.remove();
  }, []);

  // App state change handler
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background - pause videos
        pauseCurrentVideo();
      } else if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground - resume playing if needed
        if (isPlaying && videoRefs.current[videos[currentIndex]?.id]) {
          try {
            videoRefs.current[videos[currentIndex]?.id].playAsync();
          } catch (error) {
            console.error('Error resuming video:', error);
          }
        }
      }
      
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, currentIndex, videos, isPlaying]);

  // Initial video fetch
  useEffect(() => {
    fetchVideos();
    
    // Lock orientation to portrait by default
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .catch(error => console.error('Error locking orientation:', error));
    }
    
    return () => {
      // Clean up video players when component unmounts
      Object.values(videoRefs.current).forEach(videoRef => {
        if (videoRef) {
          try {
            videoRef.unloadAsync();
          } catch (error) {
            console.error('Error unloading video:', error);
          }
        }
      });
    };
  }, []);

  const fetchVideos = async (fetchMore = false) => {
    try {
      if (fetchMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const videosCollection = collection(firestore, 'videos');
      let videosQuery;
      
      if (fetchMore && lastDocRef.current) {
        videosQuery = query(
          videosCollection,
          orderBy('createdAt', 'desc'),
          startAfter(lastDocRef.current),
          limit(10)
        );
      } else {
        videosQuery = query(
          videosCollection,
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }
      
      const querySnapshot = await getDocs(videosQuery);
      
      if (querySnapshot.empty) {
        setHasMoreVideos(false);
        setLoadingMore(false);
        setLoading(false);
        
        if (!fetchMore && videos.length === 0) {
          setError('No videos found');
        }
        return;
      }
      
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      const videosList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: Array.isArray(data.comments) ? data.comments : [],
          createdAt: data.createdAt || new Date(),
          username: data.username || 'Unknown',
          caption: data.caption || '',
          videoUrl: data.videoUrl || '',
          userProfilePic: data.userProfilePic || null,
          userId: data.userId || null
        };
      });
      
      if (fetchMore) {
        setVideos(prevVideos => [...prevVideos, ...videosList]);
        setLoadingMore(false);
      } else {
        setVideos(videosList);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos. Pull down to refresh.');
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    if (!loadingMore && hasMoreVideos && !error) {
      fetchVideos(true);
    }
  };

  const pauseCurrentVideo = async () => {
    if (videos[currentIndex]?.id && videoRefs.current[videos[currentIndex]?.id]) {
      try {
        await videoRefs.current[videos[currentIndex]?.id].pauseAsync();
      } catch (error) {
        console.error('Error pausing video:', error);
      }
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      
      // Pause previous video
      if (currentIndex !== newIndex && videos[currentIndex]?.id && videoRefs.current[videos[currentIndex]?.id]) {
        try {
          videoRefs.current[videos[currentIndex]?.id].pauseAsync();
        } catch (error) {
          console.error('Error pausing previous video:', error);
        }
      }
      
      setCurrentIndex(newIndex);
      
      // Play current video if isPlaying is true
      if (isPlaying && viewableItems[0].item.id && videoRefs.current[viewableItems[0].item.id]) {
        try {
          videoRefs.current[viewableItems[0].item.id].playAsync();
        } catch (error) {
          console.error('Error playing current video:', error);
        }
      }
    }
  }).current;

  const togglePlayPause = async (videoId) => {
    if (!videoRefs.current[videoId]) return;
    
    try {
      const status = await videoRefs.current[videoId].getStatusAsync();
      
      if (status.isPlaying) {
        await videoRefs.current[videoId].pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRefs.current[videoId].playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const toggleMute = async (videoId) => {
    if (!videoRefs.current[videoId]) return;

    try {
      setIsMuted(prev => !prev);
      
      // Apply mute state to current video
      await videoRefs.current[videoId].setIsMutedAsync(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleLike = async (videoId) => {
    if (!auth.currentUser) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please login to like videos',
      });
      return;
    }

    try {
      const result = await toggleLike(videoId);
      if (!result.success) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error || 'Failed to update like status',
        });
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

  const handleDoubleTap = (videoId) => {
    handleLike(videoId);
  };

  const handleVideoError = (error, videoId) => {
    console.error(`Error loading video ${videoId}:`, error);
    // We don't set global error state here to avoid affecting the whole list
    // Instead, each video component handles its own error state
  };
  
  const setVideoRef = (ref, videoId) => {
    if (ref) {
      videoRefs.current[videoId] = ref;
    }
  };

  const handleShare = async (video) => {
    try {
      const shareOptions = {
        message: `Check out this video by @${video.username} on Thakida: ${video.videoUrl}`,
        title: 'Share Video',
      };
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing video:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to share video',
      });
    }
  };

  const handleNavigateToComments = async (videoId) => {
    try {
      // Fetch the video data first
      const videoDoc = await getDoc(doc(firestore, 'videos', videoId));
      if (videoDoc.exists()) {
        const videoData = videoDoc.data();
        const video = {
          id: videoDoc.id,
          ...videoData,
          likes: Array.isArray(videoData.likes) ? videoData.likes : [],
          comments: Array.isArray(videoData.comments) ? videoData.comments : [],
          createdAt: videoData.createdAt || new Date(),
          username: videoData.username || 'Unknown',
          caption: videoData.caption || '',
          videoUrl: videoData.videoUrl || '',
          userProfilePic: videoData.userProfilePic || null,
          userId: videoData.userId || null
        };
        navigation.navigate('VideoDetail', { video });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Video not found',
        });
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load video',
      });
    }
  };

  const renderVideo = ({ item, index }) => {
    const isCurrentVideo = index === currentIndex;
    const isLiked = likedVideos.has(item.id);
    const likeCount = Array.isArray(item.likes) ? item.likes.length : 0;
    const commentCount = Array.isArray(item.comments) ? item.comments.length : 0;
    
    return (
      <View style={[styles.videoContainer, { 
        width: dimensions.width, 
        height: dimensions.height
      }]}>
        <Pressable 
          onPress={() => togglePlayPause(item.id)}
          delayLongPress={150}
          onLongPress={() => handleDoubleTap(item.id)}
          style={styles.videoWrapper}
        >
          <VideoPlayer 
            uri={item.videoUrl}
            shouldPlay={isCurrentVideo && isPlaying}
            isMuted={isMuted}
            isActive={isVideoVisible(index, currentIndex, 0)}
            style={styles.video}
            onRef={(ref) => setVideoRef(ref, item.id)}
            onError={(error) => handleVideoError(error, item.id)}
          />
        </Pressable>
        
        {/* Play/Pause Indicator */}
        {!isPlaying && isCurrentVideo && (
          <View style={styles.playPauseContainer}>
            <TouchableOpacity 
              style={styles.playPauseButton}
              onPress={() => togglePlayPause(item.id)}
            >
              <Ionicons name="play" size={50} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Video Info Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        >
          <View style={styles.userInfo}>
            <View style={styles.userDetails}>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
            </View>
          </View>
        </LinearGradient>
        
        {/* Interaction Buttons */}
        <View style={styles.interactionContainer}>
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={30} 
              color={isLiked ? "#FF2D55" : "white"} 
            />
            <Text style={styles.interactionText}>{likeCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => handleNavigateToComments(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={28} color="white" />
            <Text style={styles.interactionText}>{commentCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-social-outline" size={28} color="white" />
            <Text style={styles.interactionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => toggleMute(item.id)}
          >
            <Ionicons 
              name={isMuted ? "volume-mute-outline" : "volume-high-outline"} 
              size={28} 
              color="white" 
            />
            <Text style={styles.interactionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Profile', { userId: item.userId })}
          >
            <View style={styles.profileImageContainer}>
              {item.userProfilePic ? (
                <Image 
                  source={{ uri: item.userProfilePic }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={[styles.profileImage, styles.noProfileImage]}>
                  <Text style={styles.profileInitial}>{item.username ? item.username[0].toUpperCase() : '?'}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff416c" />
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            lastDocRef.current = null;
            fetchVideos();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <FlatList
          ref={flatListRef}
          data={videos}
          renderItem={renderVideo}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={dimensions.height}
          snapToAlignment="start"
          decelerationRate="fast"
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 300
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          onRefresh={() => {
            lastDocRef.current = null;
            setHasMoreVideos(true);
            setError(null);
            fetchVideos();
          }}
          refreshing={loading}
          onEndReached={loadMoreVideos}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#ff416c" />
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No videos found</Text>
            </View>
          )}
        />
        
        {/* Top Navigation */}
        <View style={[styles.topNav, {
          paddingTop: Platform.OS === 'ios' ? 0 : 30
        }]}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={[styles.navText, styles.activeNavText]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navText}>Following</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff416c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  videoContainer: {
    width: '100%',
    height: '100%', // Ensure full screen height
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  playPauseContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
  },
  interactionContainer: {
    position: 'absolute',
    right: 10,
    bottom: 100,
    alignItems: 'center',
  },
  interactionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  interactionText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
  profileButton: {
    marginTop: 10,
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  noProfileImage: {
    backgroundColor: '#ff416c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#ff416c',
  },
  topNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 10,
  },
  navItem: {
    paddingHorizontal: 20,
  },
  navText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
  }
});

export default HomeScreen;