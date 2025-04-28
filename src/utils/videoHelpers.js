/**
 * Utility functions for video handling
 */

/**
 * Handles video loading errors and provides descriptive error messages
 * 
 * @param {Object} error The error object from video loading
 * @returns {string} A user-friendly error message
 */
export const getVideoErrorMessage = (error) => {
    if (!error) return 'Unknown video error occurred';
  
    const errorCode = error.code || '';
    const errorMessage = error.message || '';
  
    // Check for common video errors
    if (errorMessage.includes('network') || errorCode.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
  
    if (errorMessage.includes('format') || errorCode.includes('format')) {
      return 'Video format not supported.';
    }
  
    if (errorMessage.includes('decode') || errorCode.includes('decode')) {
      return 'Unable to decode this video.';
    }
  
    if (errorMessage.includes('permission') || errorCode.includes('permission')) {
      return 'Permission denied to access this video.';
    }
  
    if (errorMessage.includes('404') || errorCode.includes('404')) {
      return 'Video not found.';
    }
  
    // Return a generic error message if no specific match
    return 'Failed to load video. Please try again later.';
  };
  
  /**
   * Optimizes video quality based on network and device capabilities
   * 
   * @param {string} videoUrl The original video URL
   * @param {Object} deviceInfo Information about the device
   * @returns {string} Optimized video URL
   */
  export const optimizeVideoQuality = (videoUrl, deviceInfo = {}) => {
    if (!videoUrl) return '';
  
    // If it's a Cloudinary URL, we can add transformation parameters
    if (videoUrl.includes('cloudinary.com')) {
      try {
        const isLowPowerDevice = deviceInfo.lowPower || false;
        const isLowBandwidth = deviceInfo.lowBandwidth || false;
        
        let qualityParam = 'q_auto';
        
        // Adjust quality based on device/network constraints
        if (isLowPowerDevice || isLowBandwidth) {
          qualityParam = 'q_auto:low';
        }
        
        // For Cloudinary URLs, insert transformation parameters before the /upload/ part
        const parts = videoUrl.split('/upload/');
        if (parts.length === 2) {
          return `${parts[0]}/upload/${qualityParam}/${parts[1]}`;
        }
      } catch (error) {
        console.error('Error optimizing video URL:', error);
      }
    }
    
    // Return original URL if not Cloudinary or if there was an error
    return videoUrl;
  };
  
  /**
   * Extracts a thumbnail URL from a Cloudinary video URL
   * 
   * @param {string} videoUrl The Cloudinary video URL
   * @param {Object} options Options for thumbnail generation
   * @returns {string} Thumbnail URL
   */
  export const extractThumbnailFromVideo = (videoUrl, options = {}) => {
    if (!videoUrl) return '';
    
    const { time = '0.1', format = 'jpg' } = options;
    
    // If it's a Cloudinary URL, we can generate a thumbnail
    if (videoUrl.includes('cloudinary.com')) {
      try {
        // Replace /video/upload with /image/upload and add thumbnail parameters
        if (videoUrl.includes('/video/upload/')) {
          return videoUrl
            .replace('/video/upload/', '/image/upload/')
            .replace(/\.[^/.]+$/, `.${format}`) // Change extension
            + `?t=${time}`; // Add time parameter
        }
        
        // Alternative approach for standard Cloudinary URLs
        const parts = videoUrl.split('/upload/');
        if (parts.length === 2) {
          return `${parts[0]}/upload/c_thumb,w_480,g_face/${parts[1].split('.')[0]}.${format}`;
        }
      } catch (error) {
        console.error('Error generating thumbnail URL:', error);
      }
    }
    
    // Return empty string if not a Cloudinary URL or if there was an error
    return '';
  };
  
  /**
   * Checks if a video is currently visible in the viewport
   * 
   * @param {number} index Current item index
   * @param {number} currentIndex The currently active visible index
   * @param {number} tolerance Number of items to consider "visible" in each direction
   * @returns {boolean} Whether the video is in the visible range
   */
  export const isVideoVisible = (index, currentIndex, tolerance = 0) => {
    return Math.abs(index - currentIndex) <= tolerance;
  };
  
  /**
   * Manages playback state based on app state changes
   * 
   * @param {string} currentAppState Current app state ('active', 'background', 'inactive')
   * @param {string} previousAppState Previous app state
   * @param {Object} videoRef Video reference object
   * @returns {Promise<void>} Promise that resolves when operation is complete
   */
  export const managePlaybackOnAppStateChange = async (currentAppState, previousAppState, videoRef) => {
    if (!videoRef) return;
    
    try {
      if (previousAppState === 'active' && currentAppState !== 'active') {
        // App is going to background, pause the video
        await videoRef.pauseAsync();
      } else if (previousAppState !== 'active' && currentAppState === 'active') {
        // App is coming to foreground, play the video if needed
        // Check current status first to determine if video was playing
        const status = await videoRef.getStatusAsync();
        if (!status.isPlaying && status.shouldPlay) {
          await videoRef.playAsync();
        }
      }
    } catch (error) {
      console.error('Error managing playback on app state change:', error);
    }
  };