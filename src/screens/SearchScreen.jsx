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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestore } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Video } from 'expo-av';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('videos');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

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
});

export default SearchScreen;