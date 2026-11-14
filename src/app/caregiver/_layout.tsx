import { Stack } from 'expo-router';

export default function CaregiverLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        // Optional: keeps the background consistent during transitions
        contentStyle: { backgroundColor: '#000000' } 
      }}
    >
      {/* 'index' now points to your renamed dashboard file */}
      <Stack.Screen name="index" options={{ title: 'Caregiver Portal' }} />
      
      {/* Profile details for a specific PWD */}
      <Stack.Screen name="[pwd_uid]/index" />
      
      {/* Other dynamic routes within the caregiver folder */}
      <Stack.Screen name="[pwd_uid]/map" />
      <Stack.Screen name="[pwd_uid]/pantry" />
      <Stack.Screen name="[pwd_uid]/settings" />
      
      {/* The handshake screen for new connections */}
      <Stack.Screen name="link-device" />
    </Stack>
  );
}