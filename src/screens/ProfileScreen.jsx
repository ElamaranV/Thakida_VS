import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Animated,
    RefreshControl,
    SafeAreaView,
    Platform,
    StatusBar,
    Alert,
    Pressable
} from 'react-native';
import {
    Ionicons,
    MaterialIcons,
    Feather,
    FontAwesome5,
    MaterialCommunityIcons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    orderBy,
    limit,
    setDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';
import { firestore, auth } from '../services/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoPlayer from '../components/VideoPlayer';
import { extractThumbnailFromVideo } from '../utils/videoHelpers';
import ErrorBoundary from '../components/ErrorBoundary';

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 320;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function ProfileScreen({ navigation, route }) {
    const [user, setUser] = useState(null);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('videos');
    const [error, setError] = useState(null);
    
    const scrollY = useRef(new Animated.Value(0)).current;
    const userId = route.params?.userId || auth.currentUser?.uid;
    const insets = useSafeAreaInsets();

    // Animated values for header
    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    const profileInfoOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 1.5, HEADER_SCROLL_DISTANCE],
        outputRange: [1, 0.3, 0],
        extrapolate: 'clamp',
    });

    const titleOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        const loadUserData = async () => {
            try {
                setLoading(true);
                setError(null);
                const currentUserId = auth.currentUser?.uid;
                setIsCurrentUser(currentUserId === userId);
    
                const userDoc = await getDoc(doc(firestore, 'users', userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser(userData);
    
                    // Fetch posts after user data is set
                    fetchUserPosts(userData.username);
    
                    if (currentUserId && currentUserId !== userId) {
                        try {
                            const followDoc = await getDoc(
                                doc(firestore, 'followers', userId, 'userFollowers', currentUserId)
                            );
                            setIsFollowing(followDoc.exists());
                        } catch (followError) {
                            console.error('Error checking follow status:', followError);
                        }
                    }
    
                    try {
                        const followerSnapshot = await getDocs(
                            collection(firestore, 'followers', userId, 'userFollowers')
                        );
                        const followingSnapshot = await getDocs(
                            collection(firestore, 'following', userId, 'userFollowing')
                        );
        
                        setStats({
                            posts: 0, // Will be updated after fetching posts
                            followers: followerSnapshot.size,
                            following: followingSnapshot.size,
                        });
                    } catch (statsError) {
                        console.error('Error fetching stats:', statsError);
                        setStats({
                            posts: 0,
                            followers: 0,
                            following: 0,
                        });
                    }
                } else {
                    setError('User not found');
                    Alert.alert('Error', 'User not found');
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                setError('Failed to load profile');
                Alert.alert('Error', 'Failed to load profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };
    
        loadUserData();
    }, [userId]);

    const fetchUserPosts = async (username) => {
        if (!username) {
            console.error('Username is required to fetch posts');
            return;
        }
        
        try {
            const postsQuery = query(
                collection(firestore, 'videos'),
                where('username', '==', username),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
    
            const querySnapshot = await getDocs(postsQuery);
            const postsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
    
            setPosts(postsData);
            
            // Update the stats with post count
            setStats(prev => ({
                ...prev,
                posts: postsData.length
            }));
            
            return postsData.length;
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return 0;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        
        try {
            const userDoc = await getDoc(doc(firestore, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUser(userData);
                
                // Fetch updated posts
                await fetchUserPosts(userData.username);
                
                // Fetch updated follower/following counts
                const followerSnapshot = await getDocs(
                    collection(firestore, 'followers', userId, 'userFollowers')
                );
                const followingSnapshot = await getDocs(
                    collection(firestore, 'following', userId, 'userFollowing')
                );

                setStats(prev => ({
                    ...prev,
                    followers: followerSnapshot.size,
                    following: followingSnapshot.size,
                }));
            } else {
                setError('User not found');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            setError('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    };

    const handleFollow = async () => {
        if (!auth.currentUser) {
            Alert.alert('Login Required', 'Please login to follow users');
            return;
        }

        try {
            const followerRef = doc(firestore, 'followers', userId, 'userFollowers', auth.currentUser.uid);
            const followingRef = doc(firestore, 'following', auth.currentUser.uid, 'userFollowing', userId);
            
            if (isFollowing) {
                // Unfollow
                await deleteDoc(followerRef);
                await deleteDoc(followingRef);
                
                // Update follower count
                setStats(prev => ({
                    ...prev,
                    followers: Math.max(0, prev.followers - 1)
                }));
            } else {
                // Follow
                await setDoc(followerRef, {
                    createdAt: serverTimestamp()
                });
                await setDoc(followingRef, {
                    createdAt: serverTimestamp()
                });
                
                // Update follower count
                setStats(prev => ({
                    ...prev,
                    followers: prev.followers + 1
                }));
            }
            
            setIsFollowing(!isFollowing);
        } catch (error) {
            console.error('Error updating follow status:', error);
            Alert.alert('Error', 'Failed to update follow status. Please try again.');
        }
    };

    const navigateToVideo = (videoId) => {
        navigation.navigate('VideoDetail', { videoId });
    };

    const renderVideoItem = ({ item, index }) => {
        return (
            <Animated.View style={styles.videoItem}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigateToVideo(item.id)}
                >
                    <View style={styles.videoThumbnail}>
                        {item.videoUrl ? (
                            <VideoPlayer
                                uri={item.videoUrl}
                                shouldPlay={false}
                                isMuted={true}
                                isActive={false}
                                style={styles.thumbnailImage}
                            />
                        ) : (
                            <View style={styles.thumbnailPlaceholder}>
                                <MaterialCommunityIcons name="video-off" size={40} color="#ddd" />
                            </View>
                        )}
                        
                        {/* Play Icon Overlay */}
                        <View style={styles.playIconOverlay}>
                            <Ionicons name="play" size={24} color="#fff" />
                        </View>
                    </View>
                    
                    <Text numberOfLines={1} style={styles.videoCaption}>
                        {item.caption || 'No caption'}
                    </Text>
                    
                    <View style={styles.videoStats}>
                        <View style={styles.videoStat}>
                            <Ionicons name="eye-outline" size={14} color="#999" />
                            <Text style={styles.videoStatText}>{item.views || 0}</Text>
                        </View>
                        
                        <View style={styles.videoStat}>
                            <Ionicons name="heart-outline" size={14} color="#999" />
                            <Text style={styles.videoStatText}>{item.likes || 0}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="video-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No videos yet</Text>
            {isCurrentUser && (
                <TouchableOpacity 
                    style={styles.createVideoButton}
                    onPress={() => navigation.navigate('CreateVideo')}
                >
                    <Text style={styles.createVideoButtonText}>Create Video</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff416c" />
            </View>
        );
    }

    if (error && !refreshing && !user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => {
                        setError(null);
                        setLoading(true);
                        const loadUserData = async () => {
                            try {
                                const userDoc = await getDoc(doc(firestore, 'users', userId));
                                if (userDoc.exists()) {
                                    setUser(userDoc.data());
                                    fetchUserPosts(userDoc.data().username);
                                } else {
                                    setError('User not found');
                                }
                            } catch (error) {
                                setError('Failed to load profile');
                            } finally {
                                setLoading(false);
                            }
                        };
                        loadUserData();
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                
                {/* Animated Header */}
                <Animated.View style={[
                    styles.header,
                    { 
                        height: headerHeight,
                        paddingTop: insets.top
                    }
                ]}>
                    <LinearGradient
                        colors={['#ff416c', '#ff4b2b']}
                        style={styles.headerGradient}
                    >
                        {/* Back button */}
                        <TouchableOpacity 
                            style={[styles.backButton, { top: insets.top + 10 }]} 
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        
                        {/* Settings button for current user's profile */}
                        {isCurrentUser && (
                            <TouchableOpacity 
                                style={[styles.settingsButton, { top: insets.top + 10 }]} 
                                onPress={() => navigation.navigate('Settings')}
                            >
                                <Ionicons name="settings-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                        
                        {/* Profile Banner Content */}
                        <Animated.View style={[styles.profileBannerContent, { opacity: profileInfoOpacity }]}>
                            <View style={styles.profileImageContainer}>
                                {user?.userProfilePic ? (
                                    <Image 
                                        source={{ uri: user.userProfilePic }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <View style={styles.profileImagePlaceholder}>
                                        <FontAwesome5 name="user-alt" size={40} color="#fff" />
                                    </View>
                                )}
                            </View>
                            
                            <Text style={styles.username}>@{user?.username || 'username'}</Text>
                            <Text style={styles.displayName}>{user?.displayName || 'Display Name'}</Text>
                            
                            {user?.bio && (
                                <Text style={styles.bio} numberOfLines={2}>
                                    {user.bio}
                                </Text>
                            )}
                            
                            {/* Profile Stats */}
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.posts}</Text>
                                    <Text style={styles.statLabel}>Posts</Text>
                                </View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.followers}</Text>
                                    <Text style={styles.statLabel}>Followers</Text>
                                </View>
                                
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{stats.following}</Text>
                                    <Text style={styles.statLabel}>Following</Text>
                                </View>
                            </View>
                            
                            {/* Profile Action Buttons */}
                            <View style={styles.profileActionButtons}>
                                {isCurrentUser ? (
                                    <TouchableOpacity 
                                        style={styles.editProfileButton}
                                        onPress={() => navigation.navigate('EditProfile')}
                                    >
                                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        style={[
                                            styles.followButton, 
                                            isFollowing ? styles.followingButton : null
                                        ]}
                                        onPress={handleFollow}
                                    >
                                        <Text style={[
                                            styles.followButtonText,
                                            isFollowing ? styles.followingButtonText : null
                                        ]}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                
                                {!isCurrentUser && (
                                    <TouchableOpacity style={styles.messageButton}>
                                        <Feather name="send" size={18} color="#ff416c" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animated.View>
                        
                        {/* Header Title (Appears when scrolled) */}
                        <Animated.Text 
                            style={[
                                styles.headerTitle, 
                                { 
                                    opacity: titleOpacity,
                                    top: insets.top + 10
                                }
                            ]}
                        >
                            @{user?.username || 'username'}
                        </Animated.Text>
                    </LinearGradient>
                </Animated.View>
                
                {/* Content Tabs and Feed */}
                <Animated.ScrollView
                    contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
                    scrollEventThrottle={16}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            progressViewOffset={HEADER_MAX_HEIGHT}
                            colors={['#ff416c']}
                            tintColor="#ff416c"
                        />
                    }
                >
                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity 
                            style={[
                                styles.tab, 
                                activeTab === 'videos' ? styles.activeTab : null
                            ]}
                            onPress={() => setActiveTab('videos')}
                        >
                            <Ionicons
                                name="grid-outline"
                                size={24}
                                color={activeTab === 'videos' ? '#ff416c' : '#888'}
                            />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.tab, 
                                activeTab === 'liked' ? styles.activeTab : null
                            ]}
                            onPress={() => setActiveTab('liked')}
                        >
                            <Ionicons
                                name="heart-outline"
                                size={24}
                                color={activeTab === 'liked' ? '#ff416c' : '#888'}
                            />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.tab, 
                                activeTab === 'saved' ? styles.activeTab : null
                            ]}
                            onPress={() => setActiveTab('saved')}
                        >
                            <Ionicons
                                name="bookmark-outline"
                                size={24}
                                color={activeTab === 'saved' ? '#ff416c' : '#888'}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Content Display */}
                    <View style={styles.contentContainer}>
                        {activeTab === 'videos' && (
                            <>
                                {posts.length > 0 ? (
                                    <View style={styles.videosGrid}>
                                        {posts.map((post, index) => renderVideoItem({ item: post, index }))}
                                    </View>
                                ) : (
                                    renderEmptyState()
                                )}
                            </>
                        )}
                        
                        {activeTab === 'liked' && (
                            <View style={styles.emptyStateContainer}>
                                <Ionicons name="heart" size={60} color="#ccc" />
                                <Text style={styles.emptyStateText}>
                                    No liked videos yet
                                </Text>
                            </View>
                        )}
                        
                        {activeTab === 'saved' && (
                            <View style={styles.emptyStateContainer}>
                                <Ionicons name="bookmark" size={60} color="#ccc" />
                                <Text style={styles.emptyStateText}>
                                    No saved videos yet
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        </ErrorBoundary>
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
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#ff416c',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        overflow: 'hidden',
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 15,
        zIndex: 10,
    },
    settingsButton: {
        position: 'absolute',
        right: 15,
        zIndex: 10,
    },
    headerTitle: {
        position: 'absolute',
        alignSelf: 'center',
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    profileBannerContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    profileImageContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#fff',
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    username: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    displayName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    bio: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
        width: '80%',
    },
    statsContainer: {
        flexDirection: 'row',
        marginVertical: 10,
        width: '80%',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#fff',
        fontSize: 12,
    },
    profileActionButtons: {
        flexDirection: 'row',
        marginTop: 15,
    },
    editProfileButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    editProfileButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    followButton: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
    },
    followButtonText: {
        color: '#ff416c',
        fontWeight: 'bold',
    },
    followingButtonText: {
        color: '#fff',
    },
    messageButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#ff416c',
    },
    contentContainer: {
        flex: 1,
        paddingVertical: 10,
    },
    videosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 2,
    },
    videoItem: {
        width: (width / 3) - 4,
        height: (width / 3) * 1.5,
        margin: 2,
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: '#222',
        position: 'relative',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIconOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoCaption: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: 5,
        fontSize: 12,
    },
    videoStats: {
        position: 'absolute',
        top: 5,
        right: 5,
        flexDirection: 'row',
    },
    videoStat: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
        marginLeft: 5,
    },
    videoStatText: {
        color: '#fff',
        fontSize: 10,
        marginLeft: 2,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        height: 300,
    },
    emptyStateText: {
        color: '#aaa',
        marginTop: 10,
        marginBottom: 20,
    },
    createVideoButton: {
        backgroundColor: '#ff416c',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    createVideoButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});