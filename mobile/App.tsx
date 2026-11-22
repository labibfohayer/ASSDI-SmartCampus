import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { colors } from './src/theme/colors';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t, isBangla } = useLanguage();
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'notifications'>('today');

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>
          {isBangla ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট' : 'As-Sunnah Skill Development Institute'}
        </Text>
        <Text style={styles.splashSubtitle}>
          {isBangla ? 'শিক্ষার্থী পোর্টাল' : 'Student Portal'}
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" />

      {/* Screen Body */}
      <View style={styles.screenWrapper}>
        {activeTab === 'today' && <HomeScreen />}
        {activeTab === 'progress' && <ProgressScreen />}
        {activeTab === 'notifications' && <NotificationsScreen />}
      </View>

      {/* Modern Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('today')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'today' && styles.iconWrapperActive]}>
            <Ionicons
              name={activeTab === 'today' ? 'calendar' : 'calendar-outline'}
              size={22}
              color={activeTab === 'today' ? colors.primary : '#94A3B8'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'today' && styles.navLabelActive,
            ]}
          >
            {t.tabs.today}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('progress')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'progress' && styles.iconWrapperActive]}>
            <Ionicons
              name={activeTab === 'progress' ? 'stats-chart' : 'stats-chart-outline'}
              size={22}
              color={activeTab === 'progress' ? colors.primary : '#94A3B8'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'progress' && styles.navLabelActive,
            ]}
          >
            {t.tabs.progress}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('notifications')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'notifications' && styles.iconWrapperActive]}>
            <Ionicons
              name={activeTab === 'notifications' ? 'notifications' : 'notifications-outline'}
              size={22}
              color={activeTab === 'notifications' ? colors.primary : '#94A3B8'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'notifications' && styles.navLabelActive,
            ]}
          >
            {t.tabs.notifications}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 28 : 0,
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    paddingVertical: 3,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  iconWrapperActive: {
    backgroundColor: colors.primaryLight,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
