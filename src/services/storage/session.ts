import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'reapers.token';

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
