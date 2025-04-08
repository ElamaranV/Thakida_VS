import React from "react";
import { View, Text, Button } from "react-native";

export default function AddVideoScreen({ navigation }) {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Add Video Screen</Text>
        <Button title="Go to Home" onPress={() => navigation.navigate("Home")} />
        </View>
    );
    }