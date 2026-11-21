import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  session: {
    id: number;
    subject_name?: string;
  } | null;
  onSuccess: () => void;
}

export default function QRScannerModal({
  visible,
  onClose,
  session,
  onSuccess,
}: QRScannerModalProps) {
  const { t, isBangla } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setProcessing(false);
      setManualToken('');
    }
  }, [visible]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || !session) return;
    setScanned(true);
    setProcessing(true);

    try {
      let token = data;
      // In case data is a JSON payload like {"token": "...", "session_id": ...}
      try {
        const parsed = JSON.parse(data);
        if (parsed.token || parsed.qr_token) {
          token = parsed.token || parsed.qr_token;
        }
      } catch {
        // Plain string token
      }

      const res = await api.post('/attendance/qr/scan/', {
        session_id: session.id,
        qr_token: token,
      });

      const attendanceStatus = res.data?.status || 'present';
      const isLate = attendanceStatus.toLowerCase() === 'late';

      Alert.alert(
        isLate ? (isBangla ? 'দেরিতে উপস্থিত' : 'Late Attendance') : (isBangla ? 'আলহামদুলিল্লাহ!' : 'Success!'),
        isLate ? t.scanner.scanLate : t.scanner.scanSuccess,
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
        }}]
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert(
          isBangla ? 'বিজ্ঞপ্তি' : 'Notice',
          t.scanner.alreadyMarked,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          t.scanner.invalidToken;
        Alert.alert(isBangla ? 'ত্রুটি' : 'Error', msg, [
          { text: isBangla ? 'পুনরায় চেষ্টা করুন' : 'Retry', onPress: () => setScanned(false) },
        ]);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    handleBarcodeScanned({ data: manualToken.trim() });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t.scanner.title}</Text>
            <Text style={styles.headerSubtitle}>
              {session?.subject_name || 'Class Attendance'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Camera or Fallback */}
        {Platform.OS === 'web' || !permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#64748B" />
            <Text style={styles.permissionText}>
              {Platform.OS === 'web'
                ? (isBangla ? 'ওয়েব মোডে ক্যামেরা সরাসরি টেস্ট ইনপুটের মাধ্যমে কিউআর টোকেন দিন:' : 'In web preview, enter the rotating QR token directly:')
                : t.scanner.permissionDenied}
            </Text>

            {!permission?.granted && Platform.OS !== 'web' && (
              <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
                <Text style={styles.grantBtnText}>{t.scanner.requestPermission}</Text>
              </TouchableOpacity>
            )}

            {/* Manual Token Input Fallback */}
            <View style={styles.manualBox}>
              <TextInput
                style={styles.manualInput}
                value={manualToken}
                onChangeText={setManualToken}
                placeholder={isBangla ? 'টোকেন লিখুন বা পেস্ট করুন' : 'Paste QR token here'}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                onPress={handleManualSubmit}
                disabled={processing || !manualToken.trim()}
                style={[styles.manualSubmitBtn, (!manualToken.trim() || processing) && { opacity: 0.5 }]}
              >
                {processing ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.manualSubmitText}>
                    {isBangla ? 'যাচাই করুন' : 'Verify'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Scanner Viewfinder Overlay */}
            <View style={styles.overlayArea}>
              <Text style={styles.instructionText}>{t.scanner.instruction}</Text>
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              {processing && (
                <View style={styles.processingBadge}>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={styles.processingText}>{t.scanner.scanning}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    textAlign: 'center',
    marginTop: 2,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayArea: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.accent,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F8FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 300,
  },
  grantBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  grantBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  manualBox: {
    width: '100%',
    maxWidth: 320,
    marginTop: 24,
    gap: 10,
  },
  manualInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  manualSubmitBtn: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
