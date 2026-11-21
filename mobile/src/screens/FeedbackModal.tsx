import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/colors';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  session: {
    id: number;
    subject_name?: string;
    topic_title?: string;
  } | null;
  onSuccess: () => void;
}

export default function FeedbackModal({
  visible,
  onClose,
  session,
  onSuccess,
}: FeedbackModalProps) {
  const { t, isBangla } = useLanguage();

  const [rating, setRating] = useState<number>(5);
  const [needsHelp, setNeedsHelp] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const ratingsConfig = [
    { value: 1, emoji: '😞', labelBn: 'একদম বুঝিনি', labelEn: 'Poor', color: colors.rating[1] },
    { value: 2, emoji: '😕', labelBn: 'সামান্য বুঝেছি', labelEn: 'Slight', color: colors.rating[2] },
    { value: 3, emoji: '😐', labelBn: 'মোটামুটি', labelEn: 'Moderate', color: colors.rating[3] },
    { value: 4, emoji: '🙂', labelBn: 'ভালো বুঝেছি', labelEn: 'Good', color: colors.rating[4] },
    { value: 5, emoji: '😃', labelBn: 'সম্পূর্ণ স্পষ্ট', labelEn: 'Excellent', color: colors.rating[5] },
  ];

  const handleSubmit = async () => {
    if (!session) return;

    setSubmitting(true);
    try {
      await api.post('/feedback/', {
        session: session.id,
        understanding_rating: rating,
        needs_help: needsHelp,
        student_comment: comment.trim(),
      });

      Alert.alert(
        isBangla ? 'আলহামদুলিল্লাহ!' : 'Success!',
        t.feedback.successMsg,
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
        }}]
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert(
          isBangla ? 'বিজ্ঞপ্তি' : 'Notice',
          t.feedback.alreadySubmitted,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        const errorMsg =
          err.response?.data?.detail ||
          err.response?.data?.error?.message ||
          'Failed to submit feedback. Please try again.';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t.feedback.title}</Text>
              <Text style={styles.topicName} numberOfLines={1}>
                {session?.topic_title || session?.subject_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* 1. Rating Question */}
            <Text style={styles.sectionLabel}>{t.feedback.ratingQuestion}</Text>

            <View style={styles.ratingRow}>
              {ratingsConfig.map((item) => {
                const isSelected = rating === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => {
                      setRating(item.value);
                      if (item.value <= 2) {
                        setNeedsHelp(true);
                      }
                    }}
                    style={[
                      styles.ratingButton,
                      isSelected && {
                        borderColor: item.color,
                        backgroundColor: `${item.color}15`,
                        transform: [{ scale: 1.05 }],
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ratingEmoji}>{item.emoji}</Text>
                    <Text
                      style={[
                        styles.ratingValueText,
                        isSelected && { color: item.color, fontWeight: '900' },
                      ]}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={[
                        styles.ratingLabelText,
                        isSelected && { color: item.color, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {isBangla ? item.labelBn : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Needs Help Toggle */}
            <View style={styles.helpSection}>
              <Text style={styles.sectionLabel}>{t.feedback.helpQuestion}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setNeedsHelp(true)}
                  style={[
                    styles.toggleBtn,
                    needsHelp && styles.toggleBtnActiveYes,
                  ]}
                >
                  <Ionicons
                    name={needsHelp ? 'help-circle' : 'help-circle-outline'}
                    size={16}
                    color={needsHelp ? colors.white : '#EA580C'}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      needsHelp && styles.toggleBtnTextActive,
                    ]}
                  >
                    {t.feedback.helpYes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setNeedsHelp(false)}
                  style={[
                    styles.toggleBtn,
                    !needsHelp && styles.toggleBtnActiveNo,
                  ]}
                >
                  <Ionicons
                    name={!needsHelp ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color={!needsHelp ? colors.white : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !needsHelp && styles.toggleBtnTextActive,
                    ]}
                  >
                    {t.feedback.helpNo}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Optional Comment Box */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>
                {needsHelp
                  ? (isBangla ? 'কোন বিষয়ে সহায়তা চান? লিখুন:' : 'What do you need help with?')
                  : (isBangla ? 'মন্তব্য বা প্রশ্ন (ঐচ্ছিক):' : 'Comments or questions (optional):')}
              </Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder={t.feedback.commentPlaceholder}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            </View>

            {/* 4. Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Ionicons name="send" size={16} color={colors.white} />
                  <Text style={styles.submitBtnText}>{t.feedback.submitBtn}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  topicName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
    maxWidth: 280,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 20,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  ratingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  ratingValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  ratingLabelText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  helpSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: colors.white,
  },
  toggleBtnActiveYes: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  toggleBtnActiveNo: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  toggleBtnTextActive: {
    color: colors.white,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
