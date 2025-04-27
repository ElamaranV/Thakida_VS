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
} from 'firebase/firestore';
import { Video } from 'expo-av';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { firestore, auth } from '../services/firebase';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
                const currentUserId = auth.currentUser?.uid;
                setIsCurrentUser(currentUserId === userId);
    
                const userDoc = await getDoc(doc(firestore, 'users', userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser(userData);
    
                    // Fetch posts after user data is set
                    const postsCount = await fetchUserPosts();
    
                    if (currentUserId && currentUserId !== userId) {
                        const followDoc = await getDoc(
                            doc(firestore, 'followers', userId, 'userFollowers', currentUserId)
                        );
                        setIsFollowing(followDoc.exists());
                    }
    
                    const followerSnapshot = await getDocs(
                        collection(firestore, 'followers', userId, 'userFollowers')
                    );
                    const followingSnapshot = await getDocs(
                        collection(firestore, 'following', userId, 'userFollowing')
                    );
    
                    setStats({
                        posts: postsCount,
                        followers: followerSnapshot.size,
                        following: followingSnapshot.size,
                    });
                } else {
                    Alert.alert('Error', 'User not found');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                Alert.alert('Error', 'Failed to load profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };
    
        loadUserData();
    }, [userId]);
    
    // Add this effect to fetch posts when user data changes
    useEffect(() => {
        if (user?.username) {
            fetchUserPosts();
        }
    }, [user?.username]);

    const fetchUserPosts = async () => {
        try {
            if (!user?.username) return 0; // Add this check
            
            const postsQuery = query(
                collection(firestore, 'videos'),
                where('username', '==', user.username), // Remove optional chaining
                orderBy('createdAt', 'desc'),
                limit(50)
            );
    
            const querySnapshot = await getDocs(postsQuery);
            const postsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
    
            setPosts(postsData);
            return postsData.length;
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return 0;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const postsCount = await fetchUserPosts();

            const userDoc = await getDoc(doc(firestore, 'users', userId));
            if (userDoc.exists()) {
                setUser(userDoc.data());
            }

            const followerSnapshot = await getDocs(
                collection(firestore, 'followers', userId, 'userFollowers')
            );
            const followingSnapshot = await getDocs(
                collection(firestore, 'following', userId, 'userFollowing')
            );

            setStats({
                posts: postsCount,
                followers: followerSnapshot.size,
                following: followingSnapshot.size,
            });
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleFollow = async () => {
        // Implement follow/unfollow functionality
        setIsFollowing(!isFollowing);
    };

    const renderVideoItem = ({ item, index }) => {
        // Calculate delay for staggered animation
        return (
            <Animated.View style={styles.videoItem}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('VideoDetail', { videoId: item.id })}
                >
                    <View style={styles.videoThumbnail}>
                        <Video
                            source={{ uri: item.videoUrl }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                            shouldPlay={false}
                            isMuted={true}
                            useNativeControls={false}
                        />
                        
                        <View style={styles.videoStats}>
                            <View style={styles.videoStatItem}>
                                <Ionicons name="play" size={12} color="#fff" />
                                <Text style={styles.videoStatText}>{item.likes || 0}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <Text numberOfLines={1} style={styles.videoCaption}>
                        {item.caption || 'No caption'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff416c" />
            </View>
        );
    }

    return (
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
                            {user?.profilePicture ? (
                                <Image 
                                    source={{ uri: user.profilePicture }} 
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
                            
                            <TouchableOpacity style={styles.messageButton}>
                                <Feather name="send" size={18} color="#ff416c" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </LinearGradient>
            </Animated.View>
            
            {/* Collapsible Header Title */}
            <Animated.View style={[
                styles.collapsedHeader,
                { 
                    opacity: titleOpacity,
                    paddingTop: insets.top
                }
            ]}>
                <Text style={styles.collapsedHeaderTitle}>{user?.username || 'username'}</Text>
            </Animated.View>
            
            <Animated.ScrollView
                contentContainerStyle={styles.scrollContainer}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#ff416c"
                    />
                }
            >
                <View style={{ height: HEADER_MAX_HEIGHT }} />
                
                {/* Stats Section */}
                <View style={styles.statsSection}>
                    <Pressable style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.posts}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </Pressable>
                    
                    <Pressable
                        style={styles.statItem}
                        onPress={() => navigation.navigate('FollowersList', { userId })}
                    >
                        <Text style={styles.statValue}>{stats.followers}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </Pressable>
                    
                    <Pressable
                        style={styles.statItem}
                        onPress={() => navigation.navigate('FollowingList', { userId })}
                    >
                        <Text style={styles.statValue}>{stats.following}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </Pressable>
                </View>
                
                {/* Tab Navigation */}
                <View style={styles.tabNavigation}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'videos' && styles.activeTabButton
                        ]}
                        onPress={() => setActiveTab('videos')}
                    >
                        <MaterialIcons 
                            name="grid-on" 
                            size={24} 
                            color={activeTab === 'videos' ? '#ff416c' : '#888'} 
                        />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'liked' && styles.activeTabButton
                        ]}
                        onPress={() => setActiveTab('liked')}
                    >
                        <MaterialIcons 
                            name="favorite-border" 
                            size={24} 
                            color={activeTab === 'liked' ? '#ff416c' : '#888'} 
                        />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'saved' && styles.activeTabButton
                        ]}
                        onPress={() => setActiveTab('saved')}
                    >
                        <MaterialIcons 
                            name="bookmark-border" 
                            size={24} 
                            color={activeTab === 'saved' ? '#ff416c' : '#888'} 
                        />
                    </TouchableOpacity>
                </View>
                
                {/* Videos Grid */}
                {activeTab === 'videos' && (
                    posts.length > 0 ? (
                        <FlatList
                            data={posts}
                            renderItem={renderVideoItem}
                            keyExtractor={(item) => item.id}
                            numColumns={3}
                            style={styles.contentGrid}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View style={styles.emptyStateContainer}>
                            <MaterialCommunityIcons name="video-off" size={60} color="#ddd" />
                            <Text style={styles.emptyStateText}>No videos yet</Text>
                            {isCurrentUser && (
                                <TouchableOpacity 
                                    style={styles.uploadButton}
                                    onPress={() => navigation.navigate('Add')}
                                >
                                    <Text style={styles.uploadButtonText}>Upload your first video</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                )}
                
                {/* Liked Videos - Could be implemented similar to the videos grid */}
                {activeTab === 'liked' && (
                    <View style={styles.emptyStateContainer}>
                        <MaterialIcons name="favorite" size={60} color="#ddd" />
                        <Text style={styles.emptyStateText}>No liked videos yet</Text>
                    </View>
                )}
                
                {/* Saved Videos - Could be implemented similar to the videos grid */}
                {activeTab === 'saved' && (
                    <View style={styles.emptyStateContainer}>
                        <MaterialIcons name="bookmark" size={60} color="#ddd" />
                        <Text style={styles.emptyStateText}>No saved videos yet</Text>
                    </View>
                )}
                
                {/* Add padding at bottom for better UX */}
                <View style={{ height: 20 }} />
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        zIndex: 10,
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 100,
    },
    settingsButton: {
        position: 'absolute',
        right: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 100,
    },
    profileBannerContent: {
        alignItems: 'center',
    },
    profileImageContainer: {
        marginBottom: 10,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    username: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 2,
        fontWeight: '500',
    },
    displayName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    bio: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        maxWidth: '80%',
        marginBottom: 15,
    },
    profileActionButtons: {
        flexDirection: 'row',
        marginTop: 5,
    },
    editProfileButton: {
        paddingHorizontal: 30,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 10,
    },
    editProfileButtonText: {
        color: '#ff416c',
        fontWeight: '600',
    },
    followButton: {
        paddingHorizontal: 30,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 10,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#fff',
    },
    followButtonText: {
        color: '#ff416c',
        fontWeight: '600',
    },
    followingButtonText: {
        color: '#fff',
    },
    messageButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    collapsedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_MIN_HEIGHT,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 10,
        zIndex: 5,
        backgroundColor: '#ff416c',
    },
    collapsedHeaderTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    statsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 13,
        color: '#888',
        marginTop: 3,
    },
    tabNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: '#ff416c',
    },
    contentGrid: {
        paddingHorizontal: 2,
        paddingTop: 2,
    },
    videoItem: {
        flex: 1 / 3,
        aspectRatio: 0.8,
        padding: 1,
    },
    videoThumbnail: {
        flex: 1,
        borderRadius: 5,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoStats: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        flexDirection: 'row',
    },
    videoStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    videoStatText: {
        color: '#fff',
        fontSize: 11,
        marginLeft: 2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    videoCaption: {
        fontSize: 12,
        color: '#444',
        marginTop: 4,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    emptyStateContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
        marginTop: 10,
        marginBottom: 20,
    },
    uploadButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#ff416c',
        borderRadius: 20,
    },
    uploadButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});