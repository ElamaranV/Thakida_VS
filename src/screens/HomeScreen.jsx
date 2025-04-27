import React, { useState, useEffect, useRef } from 'react';
import { Image } from 'react-native';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  SafeAreaView
} from 'react-native';
import { Video } from 'expo-av';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

const HomeScreen = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [orientationIsLandscape, setOrientationIsLandscape] = useState(
    dimensions.width > dimensions.height
  );
  
  const flatListRef = useRef(null);
  const videoRefs = useRef({});
  const lastDocRef = useRef(null);

  // Handle dimension changes for responsive layout
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setOrientationIsLandscape(window.width > window.height);
    });
    
    return () => subscription?.remove();
  }, []);

  // Initial video fetch
  useEffect(() => {
    fetchVideos();
    
    // Lock orientation to portrait by default
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    
    return () => {
      // Clean up video players when component unmounts
      Object.values(videoRefs.current).forEach(videoRef => {
        if (videoRef) {
          videoRef.unloadAsync();
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
        return;
      }
      
      // Save the last document for pagination
      lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      const videosList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (fetchMore) {
        setVideos(prevVideos => [...prevVideos, ...videosList]);
        setLoadingMore(false);
      } else {
        setVideos(videosList);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    if (!loadingMore && hasMoreVideos) {
      fetchVideos(true);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      
      // Pause previous video
      if (currentIndex !== newIndex && videoRefs.current[videos[currentIndex]?.id]) {
        videoRefs.current[videos[currentIndex]?.id].pauseAsync();
      }
      
      setCurrentIndex(newIndex);
      
      // Play current video if isPlaying is true
      if (isPlaying && videoRefs.current[viewableItems[0].item.id]) {
        videoRefs.current[viewableItems[0].item.id].playAsync();
      }
    }
  }).current;

  const togglePlayPause = async (videoId) => {
    if (!videoRefs.current[videoId]) return;
    
    const status = await videoRefs.current[videoId].getStatusAsync();
    
    if (status.isPlaying) {
      await videoRefs.current[videoId].pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRefs.current[videoId].playAsync();
      setIsPlaying(true);
    }
  };

  const renderVideo = ({ item, index }) => {
    const isCurrentVideo = index === currentIndex;
    
    return (
      <View style={[styles.videoContainer, { 
        width: dimensions.width, 
        height: orientationIsLandscape ? dimensions.height : dimensions.height
      }]}>
        <TouchableWithoutFeedback onPress={() => togglePlayPause(item.id)}>
          <Video
            ref={ref => videoRefs.current[item.id] = ref}
            source={{ uri: item.videoUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={isCurrentVideo && isPlaying}
            isLooping
            style={styles.video}
            useNativeControls={false}
            onPlaybackStatusUpdate={(status) => {
              // You can use this to track video playback progress
              // console.log(status);
            }}
          />
        </TouchableWithoutFeedback>
        
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
          >
            <Ionicons name="heart-outline" size={30} color="white" />
            <Text style={styles.interactionText}>{item.likes || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={28} color="white" />
            <Text style={styles.interactionText}>{item.comments || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.interactionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={28} color="white" />
            <Text style={styles.interactionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            activeOpacity={0.7}
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

  return (
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
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 300
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        onRefresh={() => {
          lastDocRef.current = null;
          setHasMoreVideos(true);
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
      />
      
      {/* Top Navigation */}
      <View style={[styles.topNav, {
        paddingTop: Platform.OS === 'ios' ? 0 : 30
      }]}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navText, styles.activeNavText]}>For You</Text>
          <View style={styles.activeIndicator} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navText}>Following</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  videoContainer: {
    backgroundColor: '#101010',
    justifyContent: 'center',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  playPauseContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    justifyContent: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    paddingRight: 80, // Make space for interaction buttons
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: 'white',
    fontSize: 14,
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  interactionContainer: {
    position: 'absolute',
    right: 15,
    bottom: Platform.OS === 'ios' ? 120 : 100,
    alignItems: 'center',
    zIndex: 10,
  },
  interactionButton: {
    alignItems: 'center',
    marginBottom: 18,
  },
  interactionText: {
    color: 'white',
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  profileButton: {
    marginTop: 8,
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  navItem: {
    marginHorizontal: 18,
    alignItems: 'center',
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
  activeIndicator: {
    width: 20,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 3,
    marginTop: 5,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  }
});

export default HomeScreen;