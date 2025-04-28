import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { auth, firestore } from "../services/firebase"; // Import Firestore and Auth
import { addDoc, doc, getDoc, collection, serverTimestamp } from "firebase/firestore"; // Import Firestore methods
import { TextInput } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function AddVideoScreen({ navigation }) {
  const [video, setVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [userData, setUserData] = useState(null); // State for user data
  const videoRef = useRef(null);

  const filters = [
    { id: 1, name: "Normal", value: "" },
    { id: 2, name: "Vintage", value: "e_sepia:80" },
    { id: 3, name: "B&W", value: "e_blackwhite" },
    { id: 4, name: "Vibrant", value: "e_vibrance:50" },
    { id: 5, name: "Warm", value: "e_auto_color" },
  ];

  // Fetch user data from Firestore
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Toast.show({
            type: "error",
            text1: "Not Logged In",
            text2: "Please log in to upload videos.",
          });
          navigation.replace("Login");
          return;
        }
  
        const userDocRef = doc(firestore, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
  
        if (!userDocSnap.exists()) {
          // No user document found - just return early
          // The NavigationContainer will handle showing the CompleteProfile screen
          return;
        }
  
        const userData = userDocSnap.data();
        if (!userData.username || !userData.phoneNumber || !userData.userProfilePic) {
          // Profile is incomplete - just return early
          // The NavigationContainer will handle showing the CompleteProfile screen
          return;
        }
  
        // Only set userData if profile is complete
        setUserData(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to fetch user data. Please try again.",
        });
      }
    };
  
    fetchUserData();
  }, [navigation]);

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (!permissionResult.granted) {
        Toast.show({
          type: "error",
          text1: "Permission Required",
          text2: "You need to allow access to your media library",
        });
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
        videoMaxDuration: 60,
      });
  
      if (!result.canceled) {
        // Use the URI directly without converting to blob here
        setVideo(result.assets[0].uri);
        setVideoReady(true);
        setActiveFilter(filters[0]);
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Toast.show({
        type: "error",
        text1: "Error selecting video",
        text2: "Please try again",
      });
    }
  };

  const uploadToCloudinary = async () => {
    if (!video) {
      Toast.show({ type: "error", text1: "No video selected", text2: "Please select a video first" });
      return;
    }
  
    if (!caption.trim()) {
      Toast.show({ type: "error", text1: "Caption required", text2: "Please add a caption for your video" });
      return;
    }
  
    if (!userData) {
      Toast.show({
        type: "error",
        text1: "User Data Not Loaded",
        text2: "Please wait while we load your profile data",
      });
      return;
    }
  
    setUploading(true);
  
    try {
      const localUri = video;
      let formData = new FormData();
      
      // Handle file differently for mobile vs web
      if (Platform.OS === 'web') {
        const response = await fetch(localUri);
        const blob = await response.blob();
        formData.append("file", blob);
      } else {
        // For mobile, we need to append the file differently
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `video/${match[1]}` : 'video';
        
        formData.append("file", {
          uri: localUri,
          name: filename,
          type: type
        });
      }

      formData.append("upload_preset", "thakida_uploads");

      if (activeFilter && activeFilter.value) {
        formData.append("transformation", activeFilter.value);
      }

      console.log("Uploading video to Cloudinary...");
      const cloudinaryResponse = await fetch(
        "https://api.cloudinary.com/v1_1/dgsqldkve/video/upload",
        {
          method: "POST",
          body: formData,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        throw new Error(errorData.error?.message || 'Failed to upload video to Cloudinary');
      }

      const responseData = await cloudinaryResponse.json();
      console.log("Cloudinary response:", responseData);

      if (!responseData.secure_url) {
        throw new Error('No secure URL returned from Cloudinary');
      }

      await addDoc(collection(firestore, "videos"), {
        caption: caption,
        comments: 0,
        createdAt: serverTimestamp(),
        likes: 0,
        userProfilePic: userData.userProfilePic,
        username: userData.username,
        videoUrl: responseData.secure_url,
      });
  
      Toast.show({
        type: "success",
        text1: "Video uploaded!",
        text2: "Your video has been shared successfully",
      });
  
      setVideo(null);
      setCaption("");
      setActiveFilter(null);
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error uploading video:", error);
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.message || "Please try again later",
      });
    } finally {
      setUploading(false);
    }
  };
  

  const handleCancel = () => {
    setVideo(null);
    setCaption("");
    setActiveFilter(null);
    setVideoReady(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!video ? (
        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
            <Ionicons name="videocam" size={48} color="#FF2D55" />
            <Text style={styles.uploadText}>Select Video</Text>
          </TouchableOpacity>
          <Text style={styles.infoText}>
            Upload videos up to 10MB (Free Plan Limit)
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.editContainer}>
          {videoReady && (
            <>
              <View style={styles.videoPreviewContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: video }}
                  style={styles.videoPreview}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                  shouldPlay
                />
              </View>

              <View style={styles.captionContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption... Add #hashtags"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={150}
                />
                <Text style={styles.characterCount}>{caption.length}/150</Text>
              </View>

              <Text style={styles.sectionTitle}>Filters</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
              >
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      activeFilter?.id === filter.id && styles.activeFilter,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text style={styles.filterText}>{filter.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.buttonContainer}>
                {uploading ? (
                  <ActivityIndicator size="large" color="#FF2D55" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postButton}
                      onPress={uploadToCloudinary}
                    >
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  uploadContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  uploadButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoText: {
    color: "#666",
    textAlign: "center",
  },
  editContainer: {
    paddingBottom: 20,
  },
  videoPreviewContainer: {
    width: width,
    height: width * 1.5, // 9:16 aspect ratio
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  captionContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  captionInput: {
    fontSize: 16,
    minHeight: 60,
    maxHeight: 120,
  },
  characterCount: {
    textAlign: "right",
    color: "#666",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    padding: 15,
  },
  filtersContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  activeFilter: {
    backgroundColor: "#FF2D55",
  },
  filterText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    padding: 15,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  postButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    backgroundColor: "#FF2D55",
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});