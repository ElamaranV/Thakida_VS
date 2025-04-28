import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  Text
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

/**
 * A reusable Video Player component that handles common video functionality
 * 
 * @param {Object} props Component props
 * @param {string} props.uri Video URI to play
 * @param {boolean} props.shouldPlay Whether video should autoplay
 * @param {boolean} props.isMuted Whether video is muted
 * @param {function} props.onPlaybackStatusUpdate Callback for playback status updates
 * @param {function} props.onError Callback for errors
 * @param {Object} props.style Additional styles for the video
 * @param {boolean} props.isActive Whether this video is active/visible
 * @param {boolean} props.useNativeControls Whether to use native controls
 * @param {boolean} props.isLooping Whether to loop the video
 * @param {function} props.onRef Callback to get ref
 * @returns {JSX.Element} The video player component
 */
const VideoPlayer = ({ 
  uri, 
  shouldPlay = false, 
  isMuted = true, 
  onPlaybackStatusUpdate,
  onError,
  style = {},
  isActive = false,
  useNativeControls = false,
  isLooping = true,
  onRef
}) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Pass the ref up to parent if needed
  useEffect(() => {
    if (onRef && videoRef.current) {
      onRef(videoRef.current);
    }
  }, [videoRef.current, onRef]);

  // Handle video loading/unloading based on active state
  useEffect(() => {
    const handleVideoVisibility = async () => {
      if (!videoRef.current) return;
      
      try {
        if (!isActive) {
          // Pause and unload when not active
          await videoRef.current.pauseAsync();
          // Don't unload as it causes performance issues when scrolling
          // Only unload when component unmounts
        } else if (shouldPlay && isActive) {
          // Play when active and shouldPlay is true
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error('Error managing video visibility:', error);
      }
    };

    handleVideoVisibility();
  }, [isActive, shouldPlay]);

  // Handle mute state changes
  useEffect(() => {
    const updateMuteState = async () => {
      if (!videoRef.current) return;
      
      try {
        await videoRef.current.setIsMutedAsync(isMuted);
      } catch (error) {
        console.error('Error setting mute state:', error);
      }
    };

    updateMuteState();
  }, [isMuted]);

  const handlePlaybackStatusUpdate = (playbackStatus) => {
    setStatus(playbackStatus);
    
    if (playbackStatus.isLoaded) {
      setLoading(false);
    }
    
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate(playbackStatus);
    }
    
    // Reset error state if video is now playing successfully
    if (isError && playbackStatus.isPlaying) {
      setIsError(false);
      setErrorMessage('');
    }
  };

  const handleVideoError = (error) => {
    console.error('Video error:', error);
    setIsError(true);
    setErrorMessage(error?.error?.message || 'Failed to load video');
    setLoading(false);
    
    if (onError) {
      onError(error);
    }
  };

  const retry = async () => {
    setLoading(true);
    setIsError(false);
    
    try {
      if (videoRef.current) {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync({ uri }, {}, false);
      }
    } catch (error) {
      handleVideoError(error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {errorMessage || 'Error loading video'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={retry}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Video
            ref={videoRef}
            source={{ uri }}
            rate={1.0}
            volume={1.0}
            isMuted={isMuted}
            resizeMode="cover"
            shouldPlay={isActive && shouldPlay}
            isLooping={isLooping}
            style={styles.video}
            useNativeControls={useNativeControls}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={handleVideoError}
            onLoad={() => setLoading(false)}
            onLoadStart={() => setLoading(true)}
          />
          
          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
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
});

export default VideoPlayer;