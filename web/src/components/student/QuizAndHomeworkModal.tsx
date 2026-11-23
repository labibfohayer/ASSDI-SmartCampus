'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Sparkles,
  ExternalLink,
  BookOpen,
  Clock,
  Award,
  RefreshCw,
  FileText,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface QuizQuestionItem {
  id: number;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option?: string;
  explanation?: string;
  points: number;
}

export interface MicroQuizItem {
  id: number;
  session: number;
  session_title: string;
  batch_name: string;
  topic_title?: string;
  title: string;
  instructions: string;
  is_active: boolean;
  questions: QuizQuestionItem[];
  has_attempted: boolean;
  my_attempt?: {
    id: number;
    score: number;
    total_questions: number;
    percentage: number;
    passed: boolean;
    submitted_at: string;
  } | null;
}

export interface HomeworkItem {
  id: number;
  session: number;
  session_title: string;
  batch_name: string;
  title: string;
  instructions: string;
  due_date?: string | null;
  max_score: number;
  created_by_name?: string;
  submissions_count: number;
  my_submission?: {
    id: number;
    status: 'submitted' | 'reviewed' | 'resubmit';
    submission_text: string;
    attachment_url: string;
    score?: number | null;
    teacher_feedback?: string;
    submitted_at: string;
  } | null;
}

interface QuizAndHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: number;
    subject_name?: string;
    topic_title?: string | null;
    teacher_name?: string;
    session_date?: string;
  } | null;
}

export default function QuizAndHomeworkModal({
  isOpen,
  onClose,
  session,
}: QuizAndHomeworkModalProps) {
  const { isBangla } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'quiz' | 'homework'>('quiz');

  // MicroQuiz state
  const [quiz, setQuiz] = useState<MicroQuizItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Homework state
  const [homework, setHomework] = useState<HomeworkItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [hwLoading, setHwLoading] = useState(false);
  const [submittingHw, setSubmittingHw] = useState(false);

  useEffect(() => {
    if (!isOpen || !session?.id) {
      setQuiz(null);
      setHomework(null);
      setSelectedAnswers({});
      setSubmissionText('');
      setAttachmentUrl('');
      return;
    }

    loadData(session.id);
  }, [isOpen, session]);

  const loadData = async (sessionId: number) => {
    setQuizLoading(true);
    setHwLoading(true);
    try {
      const [quizRes, hwRes] = await Promise.all([
        api.get(`/api/v1/quizzes/?session=${sessionId}`).catch(() => ({ data: [] })),
        api.get(`/api/v1/homeworks/?session=${sessionId}`).catch(() => ({ data: [] })),
      ]);

      const quizzes = Array.isArray(quizRes.data)
        ? quizRes.data
        : quizRes.data?.results || [];
      if (quizzes.length > 0) {
        setQuiz(quizzes[0]);
      } else {
        setQuiz(null);
      }

      const homeworks = Array.isArray(hwRes.data)
        ? hwRes.data
        : hwRes.data?.results || [];
      if (homeworks.length > 0) {
        const hwItem = homeworks[0];
        setHomework(hwItem);
        if (hwItem.my_submission) {
          setSubmissionText(hwItem.my_submission.submission_text || '');
          setAttachmentUrl(hwItem.my_submission.attachment_url || '');
        }
      } else {
        setHomework(null);
      }
    } catch (err) {
      console.error('Failed to load assignments/quizzes:', err);
    } finally {
      setQuizLoading(false);
      setHwLoading(false);
    }
  };

  const handleOptionSelect = (questionId: number, optionId: string) => {
    if (quiz?.has_attempted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    const unanswered = quiz.questions.filter((q) => !selectedAnswers[String(q.id)]);
    if (unanswered.length > 0) {
      toast.error(
        isBangla
          ? 'অনুগ্রহ করে সবগুলো প্রশ্নের উত্তর নির্বাচন করুন।'
          : 'Please answer all questions before submitting.'
      );
      return;
    }

    setSubmittingQuiz(true);
    try {
      const res = await api.post(`/api/v1/quizzes/${quiz.id}/submit/`, {
        answers: selectedAnswers,
      });
      toast.success(
        isBangla
          ? `মাশাআল্লাহ! কুইজ সম্পন্ন হয়েছে। স্কোর: ${res.data.score}/${res.data.total_questions}`
          : `Quiz submitted! Score: ${res.data.score}/${res.data.total_questions}`
      );
      // Reload quiz data to display correct options & explanations
      if (session?.id) {
        await loadData(session.id);
      }
    } catch (err: any) {
      console.error('Quiz submit failed:', err);
      const detail = err.response?.data?.detail;
      toast.error(detail || (isBangla ? 'কুইজ জমা দিতে সমস্যা হয়েছে।' : 'Failed to submit quiz.'));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homework) return;
    if (!submissionText.trim() && !attachmentUrl.trim()) {
      toast.error(
        isBangla
          ? 'কাজের বিবরণ অথবা ড্রাইভ লিংক যেকোনো একটি প্রদান করুন।'
          : 'Please provide either a submission note or link.'
      );
      return;
    }

    setSubmittingHw(true);
    try {
      await api.post(`/api/v1/homeworks/${homework.id}/submit/`, {
        submission_text: submissionText,
        attachment_url: attachmentUrl,
      });
      toast.success(
        isBangla
          ? 'আলহামদুলিল্লাহ! আপনার হোমওয়ার্ক সফলভাবে জমা হয়েছে।'
          : 'Homework submitted successfully!'
      );
      if (session?.id) {
        await loadData(session.id);
      }
    } catch (err: any) {
      console.error('Homework submit failed:', err);
      const detail = err.response?.data?.detail;
      toast.error(detail || (isBangla ? 'হোমওয়ার্ক জমা দিতে সমস্যা হয়েছে।' : 'Failed to submit homework.'));
    } finally {
      setSubmittingHw(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white px-5 py-4 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {session?.subject_name || (isBangla ? 'ক্লাস মূল্যায়ন' : 'Class Assessment')}
              </h3>
              <p className="text-xs text-slate-500">
                {session?.topic_title || (isBangla ? 'দৈনিক মূল্যায়ন ও হোমওয়ার্ক' : 'Daily Quiz & Homework')}{' '}
                {session?.session_date && `• ${session.session_date}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title={isBangla ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveSubTab('quiz')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeSubTab === 'quiz'
                ? 'border-[#B45309] text-[#B45309]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBangla ? 'তাত্ক্ষণিক কুইজ (MCQ)' : 'Micro-Quiz'}</span>
            {quiz?.has_attempted ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {quiz.my_attempt?.score}/{quiz.my_attempt?.total_questions}
              </span>
            ) : (
              quiz && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                  {isBangla ? 'নতুন' : 'New'}
                </span>
              )
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('homework')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeSubTab === 'homework'
                ? 'border-[#B45309] text-[#B45309]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isBangla ? 'বাড়ির কাজ (Homework)' : 'Homework Submission'}</span>
            {homework?.my_submission && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  homework.my_submission.status === 'reviewed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {homework.my_submission.status === 'reviewed'
                  ? isBangla
                    ? `গ্রেড: ${homework.my_submission.score}/${homework.max_score}`
                    : `Grade: ${homework.my_submission.score}/${homework.max_score}`
                  : isBangla
                  ? 'জমাকৃত'
                  : 'Submitted'}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Micro-Quiz */}
          {activeSubTab === 'quiz' && (
            <div>
              {quizLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-amber-300 border-t-[#B45309] rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">
                    {isBangla ? 'কুইজ লোড হচ্ছে...' : 'Loading quiz...'}
                  </p>
                </div>
              ) : !quiz ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isBangla ? 'কোনো কুইজ নির্ধারিত হয়নি' : 'No Quiz Scheduled'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isBangla
                      ? 'শিক্ষক এই সেশনের জন্য এখনো কোনো কুইজ যুক্ত করেননি।'
                      : 'The instructor has not added a micro-quiz for this session yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Attempt Summary Banner if attempted */}
                  {quiz.has_attempted && quiz.my_attempt && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-900">
                            {isBangla ? 'আপনি এই কুইজটি সম্পন্ন করেছেন' : 'You have completed this quiz'}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {isBangla ? 'অর্জিত স্কোর:' : 'Your Score:'}{' '}
                            <strong className="text-emerald-900">
                              {quiz.my_attempt.score} / {quiz.my_attempt.total_questions} ({quiz.my_attempt.percentage}%)
                            </strong>{' '}
                            • {quiz.my_attempt.passed ? (isBangla ? 'সফল (Passed)' : 'Passed') : (isBangla ? 'পুনঃপ্রচেষ্টা প্রয়োজন' : 'Needs Review')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-mono">
                        {new Date(quiz.my_attempt.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {!quiz.has_attempted && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900">
                        <p className="font-bold">
                          {isBangla ? '১০-১৫ সেকেন্ডের কুইক টেস্ট' : '10-15s Quick Quiz'}
                        </p>
                        <p className="text-amber-800/90 text-[11px] mt-0.5">
                          {quiz.instructions ||
                            (isBangla
                              ? 'ক্লাসের মূল বিষয়ের ওপর দ্রুত উত্তর দিন। ভুল হলে সঠিক ব্যাখ্যা জেনে নিন।'
                              : 'Test your understanding of today’s key topics.')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-4">
                    {quiz.questions.map((q, idx) => {
                      const userChoice = selectedAnswers[String(q.id)];
                      const hasResult = quiz.has_attempted && q.correct_option;

                      return (
                        <div
                          key={q.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-extrabold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {isBangla ? `প্রশ্ন ${idx + 1}` : `Question ${idx + 1}`}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {q.points} {isBangla ? 'পয়েন্ট' : 'pt'}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-900">{q.question_text}</p>

                          {/* Options */}
                          <div className="space-y-2 pt-1">
                            {q.options.map((opt) => {
                              const isSelected = userChoice === opt.id;
                              const isCorrect = hasResult && q.correct_option === opt.id;
                              const isWrongSelection = hasResult && isSelected && !isCorrect;

                              let cardStyle =
                                'border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-slate-700';
                              if (isSelected && !hasResult) {
                                cardStyle =
                                  'border-[#B45309] bg-amber-50/60 text-[#92400E] font-bold shadow-2xs';
                              } else if (isCorrect) {
                                cardStyle =
                                  'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold';
                              } else if (isWrongSelection) {
                                cardStyle =
                                  'border-red-400 bg-red-50/70 text-red-900 font-medium line-through';
                              }

                              return (
                                <button
                                  type="button"
                                  key={opt.id}
                                  onClick={() => handleOptionSelect(q.id, opt.id)}
                                  disabled={quiz.has_attempted}
                                  className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : isSelected
                                          ? 'bg-[#B45309] text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {opt.id}
                                    </span>
                                    <span>{opt.text}</span>
                                  </div>

                                  {isCorrect && (
                                    <span className="text-emerald-700 text-[11px] flex items-center gap-1 font-bold">
                                      <Check className="w-3.5 h-3.5" />
                                      {isBangla ? 'সঠিক উত্তর' : 'Correct'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation if attempted */}
                          {hasResult && q.explanation && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <HelpCircle className="w-3.5 h-3.5 text-[#B45309]" />
                                <span>{isBangla ? 'বিশ্লেষণ ও কারণ:' : 'Explanation:'}</span>
                              </p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Button */}
                  {!quiz.has_attempted && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                        className="px-5 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingQuiz ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isBangla ? 'যাচাই করা হচ্ছে...' : 'Grading...'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{isBangla ? 'কুইজ উত্তর জমা দিন' : 'Submit Answers'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Homework Submission */}
          {activeSubTab === 'homework' && (
            <div>
              {hwLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-amber-300 border-t-[#B45309] rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">
                    {isBangla ? 'হোমওয়ার্ক লোড হচ্ছে...' : 'Loading homework...'}
                  </p>
                </div>
              ) : !homework ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isBangla ? 'কোনো বাড়ির কাজ দেওয়া হয়নি' : 'No Homework Assigned'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isBangla
                      ? 'এই সেশনের জন্য কোনো বাড়ির কাজ নির্ধারিত নেই।'
                      : 'No homework has been assigned for this class session.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Homework Description Box */}
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/90 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-slate-900 font-heading">
                        {homework.title}
                      </span>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {isBangla ? `পূর্ণমান: ${homework.max_score}` : `Max Score: ${homework.max_score}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {homework.instructions}
                    </p>

                    {homework.due_date && (
                      <p className="text-[11px] text-amber-800 flex items-center gap-1 font-medium pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {isBangla ? 'জমা দেওয়ার শেষ তারিখ:' : 'Due Date:'} {homework.due_date}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Teacher Feedback Review Card if reviewed */}
                  {homework.my_submission?.status === 'reviewed' && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <Award className="w-4 h-4 text-emerald-700" />
                          <span>{isBangla ? 'শিক্ষকের মূল্যায়ন ও গ্রেড' : 'Teacher Review & Grade'}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white">
                          {isBangla
                            ? `স্কোর: ${homework.my_submission.score} / ${homework.max_score}`
                            : `Score: ${homework.my_submission.score} / ${homework.max_score}`}
                        </span>
                      </div>

                      {homework.my_submission.teacher_feedback ? (
                        <p className="text-xs text-emerald-800 bg-white/70 p-3 rounded-lg border border-emerald-200">
                          "{homework.my_submission.teacher_feedback}"
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-700 italic">
                          {isBangla ? 'শিক্ষক কোনো অতিরিক্ত মন্তব্য প্রদান করেননি।' : 'No teacher remarks provided.'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submission Form */}
                  <form onSubmit={handleSubmitHomework} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {homework.my_submission
                        ? isBangla
                          ? 'আপনার জমাকৃত কাজ'
                          : 'Your Submission'
                        : isBangla
                        ? 'হোমওয়ার্ক জমা দেওয়ার ফর্ম'
                        : 'Submit Your Homework'}
                    </h5>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isBangla ? 'সংক্ষিপ্ত বিবরণ বা নোট' : 'Submission Note / Summary'}
                      </label>
                      <textarea
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder={
                          isBangla
                            ? 'আপনার অ্যাসাইনমেন্ট বা কাজের মূল বিষয় সংক্ষেপে লিখুন...'
                            : 'Brief summary of your completed assignment...'
                        }
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isBangla
                          ? 'ফাইল বা ড্রাইভ লিংক (Google Drive / Github / Dropbox)'
                          : 'Attachment or Drive URL'}
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={attachmentUrl}
                          onChange={(e) => setAttachmentUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full text-xs p-2.5 pr-8 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309]"
                        />
                        {attachmentUrl && (
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#B45309]"
                            title="Open Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {homework.my_submission ? (
                        <span className="text-[11px] text-slate-500">
                          {isBangla ? 'সর্বশেষ জমা:' : 'Last submitted:'}{' '}
                          {new Date(homework.my_submission.submitted_at).toLocaleDateString()}
                        </span>
                      ) : <div />}

                      <button
                        type="submit"
                        disabled={submittingHw}
                        className="px-5 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingHw ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isBangla ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {homework.my_submission
                                ? isBangla
                                  ? 'আপডেট করুন'
                                  : 'Update Submission'
                                : isBangla
                                ? 'হোমওয়ার্ক জমা দিন'
                                : 'Submit Homework'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{isBangla ? 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট' : 'As-Sunnah SDI'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-white transition cursor-pointer"
          >
            {isBangla ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
