import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, isBangla, toggleLanguage } = useLanguage();

  const [loginId, setLoginId] = useState('STD-2026-042-001');
  const [password, setPassword] = useState('StudentPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginId.trim() || !password) {
      setError(isBangla ? 'আইডি এবং পাসওয়ার্ড উভয়ই দিন।' : 'Both ID and password are required.');
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await login(loginId, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || t.login.errorInvalid);
    }
  };

  const handleFillDemo = () => {
    setLoginId('STD-2026-042-001');
    setPassword('StudentPass2026!');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Language Toggle */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langToggle}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
            <Text style={styles.langText}>{isBangla ? 'English' : 'বাংলা'}</Text>
          </TouchableOpacity>
        </View>

        {/* Logo and Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.instituteName}>{t.appName}</Text>
          <Text style={styles.systemName}>{t.appSubtitle}</Text>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText}>{t.courseName}</Text>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.login.title}</Text>
          <Text style={styles.cardSubtitle}>{t.login.subtitle}</Text>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Student ID Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.login.studentIdLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={loginId}
                onChangeText={setLoginId}
                placeholder={t.login.studentIdPlaceholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.login.passwordLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t.login.passwordPlaceholder}
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>{t.login.submit}</Text>
            )}
          </TouchableOpacity>

          {/* Demo Autofill Button */}
          <TouchableOpacity
            onPress={handleFillDemo}
            style={styles.demoButton}
            activeOpacity={0.7}
          >
            <Text style={styles.demoButtonText}>
              {isBangla ? '💡 ডেমো শিক্ষার্থী আইডি সেট করুন' : '💡 Fill Demo Student Credentials'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          © 2026 আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট (ASSDI)
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1E7DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  logo: {
    width: 48,
    height: 48,
  },
  instituteName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  systemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginTop: 2,
    textAlign: 'center',
  },
  courseBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  demoButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 28,
    textAlign: 'center',
  },
});
