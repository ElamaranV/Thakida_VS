import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestore, auth } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Video } from 'expo-av';
import { useLikedVideos } from '../context/LikedVideosContext';
import Toast from 'react-native-toast-message';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('videos');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { likedVideos, toggleLike } = useLikedVideos();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        if (activeTab === 'videos') {
          const videosQuery = query(
            collection(firestore, 'videos'),
            orderBy('createdAt', 'desc')
          );
          const videosSnapshot = await getDocs(videosQuery);
          const videos = videosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filter videos based on caption using regex
          const filteredVideos = videos.filter(video => {
            const regex = new RegExp(debouncedQuery, 'i');
            return regex.test(video.caption) || regex.test(video.username);
          });

          setSearchResults(filteredVideos);
        } else {
          const usersQuery = query(
            collection(firestore, 'users'),
            orderBy('username', 'asc')
          );
          const usersSnapshot = await getDocs(usersQuery);
          const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filter users based on username using regex
          const filteredUsers = users.filter(user => {
            const regex = new RegExp(debouncedQuery, 'i');
            return regex.test(user.username);
          });

          setSearchResults(filteredUsers);
        }
      } catch (error) {
        console.error('Error performing search:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, activeTab]);

  const handleLike = async (videoId) => {
    const result = await toggleLike(videoId);
    if (!result.success) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error || 'Failed to update like status',
      });
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

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => navigation.navigate('VideoDetail', { video: item })}
    >
      <Video
        source={{ uri: item.videoUrl }}
        style={styles.videoThumbnail}
        resizeMode="cover"
        shouldPlay={false}
        isMuted={true}
      />
      <View style={styles.videoInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {item.caption}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons
              name={likedVideos.has(item.id) ? "heart" : "heart-outline"}
              size={24}
              color={likedVideos.has(item.id) ? "#FF2D55" : "#666"}
            />
            <Text style={styles.actionText}>{item.likes?.length || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Comments', { videoId: item.id })}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#666" />
            <Text style={styles.actionText}>{item.comments || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('Profile', { userId: item.id })}
    >
      <Image
        source={{ uri: item.userProfilePic }}
        style={styles.profilePic}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.name}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos and users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Users
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF2D55" />
        </View>
      ) : searchResults.length === 0 && debouncedQuery ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'videos' ? renderVideoItem : renderUserItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF2D55',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF2D55',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 10,
  },
  videoItem: {
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
  },
  videoInfo: {
    padding: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  name: {
    fontSize: 14,
    color: '#666',
  },
  caption: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default SearchScreen;