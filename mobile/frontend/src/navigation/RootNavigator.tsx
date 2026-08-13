import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { useApp } from '../context/AppContext';
import { theme } from '../theme';
import { GlobalLoadingHost } from '../components/GlobalLoadingHost';
import { LogoLoader } from '../components/LogoLoader';

const Stack = createNativeStackNavigator<RootStackParamList>();
const ROUTE_LOADING_MS = 430;

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isBootstrapping } = useApp();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigationChange = useCallback(() => {
    if (routeLoadingTimerRef.current) {
      clearTimeout(routeLoadingTimerRef.current);
    }
    setIsRouteLoading(true);
    routeLoadingTimerRef.current = setTimeout(() => {
      setIsRouteLoading(false);
      routeLoadingTimerRef.current = null;
    }, ROUTE_LOADING_MS);
  }, []);

  useEffect(
    () => () => {
      if (routeLoadingTimerRef.current) {
        clearTimeout(routeLoadingTimerRef.current);
      }
    },
    []
  );

  // Restoring a saved session (see AppContext) takes a beat — hold here instead of
  // flashing the login screen first and then jumping to Main once it resolves.
  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <LogoLoader size={48} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer onStateChange={handleNavigationChange}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <GlobalLoadingHost active={isRouteLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
