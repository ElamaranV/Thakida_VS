import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';

const LikedVideosContext = createContext();

export function LikedVideosProvider({ children }) {
  const [likedVideos, setLikedVideos] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch liked videos when component mounts
  useEffect(() => {
    const fetchLikedVideos = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLikedVideos(new Set(userData.likedVideos || []));
        }
      } catch (error) {
        console.error('Error fetching liked videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVideos();
  }, []);

  const toggleLike = async (videoId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: 'Not logged in' };
    }

    try {
      const videoRef = doc(firestore, 'videos', videoId);
      const userRef = doc(firestore, 'users', currentUser.uid);
      const isLiked = likedVideos.has(videoId);

      if (isLiked) {
        // Unlike
        await updateDoc(videoRef, {
          likes: arrayRemove(currentUser.uid)
        });
        await updateDoc(userRef, {
          likedVideos: arrayRemove(videoId)
        });
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      } else {
        // Like
        await updateDoc(videoRef, {
          likes: arrayUnion(currentUser.uid)
        });
        await updateDoc(userRef, {
          likedVideos: arrayUnion(videoId)
        });
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.add(videoId);
          return newSet;
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <LikedVideosContext.Provider value={{ likedVideos, toggleLike, loading }}>
      {children}
    </LikedVideosContext.Provider>
  );
}

export function useLikedVideos() {
  const context = useContext(LikedVideosContext);
  if (!context) {
    throw new Error('useLikedVideos must be used within a LikedVideosProvider');
  }
  return context;
} 