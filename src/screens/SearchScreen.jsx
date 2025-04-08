import React from "react";

export default function SearchScreen({ navigation }) {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Search Screen</Text>
        <Button title="Go to Home" onPress={() => navigation.navigate("Home")} />
        </View>
    );
    }