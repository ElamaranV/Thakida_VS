import { firestore } from '../services/firebase'; // Adjust path as needed
import { collection, addDoc, Timestamp } from "firebase/firestore";

const sampleVideos = [
    {
      username: "dance_star",
      caption: "Check out this new dance routine! #viral #dancechallenge",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-changing-lights-1240-large.mp4",
      likes: 4523,
      comments: 178,
      userProfilePic: "https://randomuser.me/api/portraits/women/12.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-22T14:30:00"))
    },
    {
      username: "travel_addict",
      caption: "Beautiful sunset at the beach! #travel #nature #sunset",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4",
      likes: 8734,
      comments: 342,
      userProfilePic: "https://randomuser.me/api/portraits/men/32.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-24T18:45:00"))
    },
    {
      username: "city_explorer",
      caption: "Walking through downtown at night #citylife #urban #nightwalk",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-traffic-and-people-in-the-night-city-4810-large.mp4",
      likes: 2156,
      comments: 89,
      userProfilePic: "https://randomuser.me/api/portraits/women/22.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-23T09:15:00"))
    },
    {
      username: "fashion_model",
      caption: "New silver look for summer #fashion #model #style",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-fashion-woman-with-silver-makeup-39875-large.mp4",
      likes: 3267,
      comments: 127,
      userProfilePic: null, // Testing null profile pic scenario
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-25T11:20:00"))
    },
    {
      username: "hello_there",
      caption: "Just saying hi to everyone! Have a great day #greeting #positive",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-waving-her-hand-1169-large.mp4",
      likes: 5912,
      comments: 210,
      userProfilePic: "https://randomuser.me/api/portraits/women/65.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-26T07:30:00"))
    },
    {
      username: "coffee_lover",
      caption: "Morning coffee ritual #coffee #morning #routine",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-from-the-pot-into-a-cup-24969-large.mp4",
      likes: 1875,
      comments: 93,
      userProfilePic: "https://randomuser.me/api/portraits/men/45.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-26T08:45:00"))
    },
    {
      username: "plant_enthusiast",
      caption: "Taking care of my indoor jungle #plants #greenthumb",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-plant-in-a-pot-43197-large.mp4",
      likes: 2437,
      comments: 118,
      userProfilePic: "https://randomuser.me/api/portraits/women/76.jpg",
      createdAt: firebase.firestore.Timestamp.fromDate(new Date("2025-04-25T15:20:00"))
    }
  ];

export const populateDatabase = async () => {
  try {
    for (const video of sampleVideos) {
      // Make sure to convert Date objects to Firestore Timestamps
      const videoWithTimestamp = {
        ...video,
        createdAt: Timestamp.fromDate(new Date(video.createdAt.seconds * 1000))
      };
      
      await addDoc(collection(firestore, "videos"), videoWithTimestamp);
    }
    console.log("Sample videos added successfully!");
    return true;
  } catch (error) {
    console.error("Error adding sample videos: ", error);
    return false;
  }
};

export default populateDatabase;