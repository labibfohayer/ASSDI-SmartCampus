'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileQuestion,
  BookOpen,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  User,
  ExternalLink,
  Award,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export interface QuizQuestionData {
  id?: number;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option: string;
  explanation: string;
  points: number;
}

export interface TeacherQuizData {
  id: number;
  session: number;
  session_title: string;
  batch_name: string;
  topic_title?: string;
  title: string;
  instructions: string;
  questions: QuizQuestionData[];
  created_at: string;
}

export interface TeacherHomeworkSubmission {
  id: number;
  student: number;
  student_name: string;
  student_id_number: string;
  submission_text: string;
  attachment_url: string;
  submitted_at: string;
  status: 'submitted' | 'reviewed' | 'resubmit';
  score?: number | null;
  teacher_feedback?: string;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
}

export interface TeacherHomeworkData {
  id: number;
  session: number;
  session_title: string;
  batch_name: string;
  title: string;
  instructions: string;
  due_date?: string | null;
  max_score: number;
  submissions_count: number;
}

interface QuizAndHomeworkManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: number;
    subject_name?: string;
    topic_title?: string | null;
    session_date?: string;
    batch_name?: string;
  } | null;
}

export default function QuizAndHomeworkManagerModal({
  isOpen,
  onClose,
  session,
}: QuizAndHomeworkManagerModalProps) {
  const { isBangla } = useLanguage();
  const [activeTab, setActiveTab] = useState<'quiz' | 'homework'>('quiz');

  // Quiz state
  const [quiz, setQuiz] = useState<TeacherQuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizInstructions, setNewQuizInstructions] = useState('');
  const [newQuestions, setNewQuestions] = useState<QuizQuestionData[]>([
    {
      question_text: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correct_option: 'A',
      explanation: '',
      points: 1,
    },
  ]);

  // Homework state
  const [homework, setHomework] = useState<TeacherHomeworkData | null>(null);
  const [submissions, setSubmissions] = useState<TeacherHomeworkSubmission[]>([]);
  const [loadingHw, setLoadingHw] = useState(false);
  const [isCreatingHw, setIsCreatingHw] = useState(false);
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwInstructions, setNewHwInstructions] = useState('');
  const [newHwDueDate, setNewHwDueDate] = useState('');
  const [newHwMaxScore, setNewHwMaxScore] = useState(10);

  // Grading state (submission_id -> { score, teacher_feedback })
  const [gradingState, setGradingState] = useState<
    Record<number, { score: number | ''; feedback: string }>
  >({});
  const [savingGradeId, setSavingGradeId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !session?.id) {
      setQuiz(null);
      setHomework(null);
      setSubmissions([]);
      setIsCreatingQuiz(false);
      setIsCreatingHw(false);
      return;
    }

    loadTeacherData(session.id);
  }, [isOpen, session]);

  const loadTeacherData = async (sessionId: number) => {
    setLoadingQuiz(true);
    setLoadingHw(true);
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
        setNewQuizTitle(`${session?.subject_name || 'সেশন'}: তাৎক্ষণিক কুইক টেস্ট`);
        setNewQuizInstructions('ক্লাসের মূল বিষয়ের ওপর ২ মিনিটের কুইক চেক।');
      }

      const homeworks = Array.isArray(hwRes.data)
        ? hwRes.data
        : hwRes.data?.results || [];
      if (homeworks.length > 0) {
        const hwItem = homeworks[0];
        setHomework(hwItem);
        // Fetch submissions
        fetchSubmissions(hwItem.id);
      } else {
        setHomework(null);
        setSubmissions([]);
        setNewHwTitle(`${session?.subject_name || 'সেশন'}: সাপ্তাহিক হোমওয়ার্ক`);
        setNewHwInstructions('ক্লাসের ব্যবহারিক অনুশীলন করে গুগল ড্রাইভ বা গিটহাব লিংক জমা দিন।');
      }
    } catch (err) {
      console.error('Failed to load teacher quiz/homework data:', err);
    } finally {
      setLoadingQuiz(false);
      setLoadingHw(false);
    }
  };

  const fetchSubmissions = async (hwId: number) => {
    try {
      const res = await api.get(`/api/v1/homeworks/${hwId}/submissions/`);
      const subs: TeacherHomeworkSubmission[] = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];
      setSubmissions(subs);

      // Prepopulate grading state
      const initialGrading: Record<number, { score: number | ''; feedback: string }> = {};
      subs.forEach((s) => {
        initialGrading[s.id] = {
          score: s.score ?? '',
          feedback: s.teacher_feedback || '',
        };
      });
      setGradingState(initialGrading);
    } catch (err) {
      console.error('Failed to fetch homework submissions:', err);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id) return;

    if (!newQuizTitle.trim()) {
      toast.error(isBangla ? 'কুইজের নাম লিখুন।' : 'Please enter quiz title.');
      return;
    }

    // Filter valid questions
    const validQuestions = newQuestions.filter((q) => q.question_text.trim());
    if (validQuestions.length === 0) {
      toast.error(
        isBangla
          ? 'কমপক্ষে ১টি প্রশ্ন যোগ করুন।'
          : 'Please add at least 1 question.'
      );
      return;
    }

    try {
      await api.post('/api/v1/quizzes/', {
        session: session.id,
        title: newQuizTitle,
        instructions: newQuizInstructions,
        questions: validQuestions,
      });
      toast.success(
        isBangla ? 'কুইজ সফলভাবে তৈরি হয়েছে!' : 'Quiz created successfully!'
      );
      setIsCreatingQuiz(false);
      loadTeacherData(session.id);
    } catch (err: any) {
      console.error('Create quiz error:', err);
      toast.error(
        err.response?.data?.detail ||
          (isBangla ? 'কুইজ তৈরিতে সমস্যা হয়েছে।' : 'Failed to create quiz.')
      );
    }
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id) return;

    if (!newHwTitle.trim()) {
      toast.error(
        isBangla ? 'হোমওয়ার্কের শিরোনাম লিখুন।' : 'Please enter homework title.'
      );
      return;
    }

    try {
      await api.post('/api/v1/homeworks/', {
        session: session.id,
        title: newHwTitle,
        instructions: newHwInstructions,
        due_date: newHwDueDate || null,
        max_score: Number(newHwMaxScore) || 10,
      });
      toast.success(
        isBangla
          ? 'হোমওয়ার্ক অ্যাসাইনমেন্ট যুক্ত হয়েছে!'
          : 'Homework created successfully!'
      );
      setIsCreatingHw(false);
      loadTeacherData(session.id);
    } catch (err: any) {
      console.error('Create homework error:', err);
      toast.error(
        err.response?.data?.detail ||
          (isBangla ? 'হোমওয়ার্ক তৈরিতে সমস্যা হয়েছে।' : 'Failed to create homework.')
      );
    }
  };

  const handleGradeSubmission = async (subId: number) => {
    if (!homework) return;
    const current = gradingState[subId];
    if (!current || current.score === '') {
      toast.error(
        isBangla ? 'অনুগ্রহ করে নম্বর প্রদান করুন।' : 'Please provide a score.'
      );
      return;
    }

    setSavingGradeId(subId);
    try {
      await api.post(`/api/v1/homeworks/${homework.id}/review/${subId}/`, {
        score: Number(current.score),
        teacher_feedback: current.feedback || '',
      });
      toast.success(
        isBangla ? 'মূল্যায়ন ও ফিডব্যাক সংরক্ষিত হয়েছে!' : 'Grade saved successfully!'
      );
      if (session?.id) {
        fetchSubmissions(homework.id);
      }
    } catch (err: any) {
      console.error('Grade submission error:', err);
      toast.error(
        err.response?.data?.detail ||
          (isBangla ? 'মূল্যায়ন সংরক্ষণ করা যায়নি।' : 'Failed to save grade.')
      );
    } finally {
      setSavingGradeId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white px-5 py-4 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {isBangla ? 'কুইজ ও হোমওয়ার্ক পরিচালনা' : 'Quiz & Homework Management'}
              </h3>
              <p className="text-xs text-slate-500">
                {session?.subject_name} •{' '}
                {session?.topic_title || (isBangla ? 'দৈনিক সেশন' : 'Daily Session')}{' '}
                {session?.session_date && `(${session.session_date})`}
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'quiz'
                ? 'border-[#B45309] text-[#B45309]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBangla ? 'তাত্ক্ষণিক কুইজ (MCQ)' : 'Micro-Quiz'}</span>
            {quiz && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                {quiz.questions.length} Q
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'homework'
                ? 'border-[#B45309] text-[#B45309]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isBangla ? 'হোমওয়ার্ক ও সাবমিশন খাতা' : 'Homework & Submissions'}</span>
            {submissions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {submissions.length} জমা
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Micro-Quiz Management */}
          {activeTab === 'quiz' && (
            <div>
              {loadingQuiz ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-amber-300 border-t-[#B45309] rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">{isBangla ? 'লোড হচ্ছে...' : 'Loading...'}</p>
                </div>
              ) : !quiz && !isCreatingQuiz ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-[#B45309]">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isBangla ? 'এই সেশনে কোনো কুইজ নেই' : 'No Micro-Quiz for this Session'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isBangla
                      ? 'শিক্ষার্থীদের ক্লাসের গভীরতা যাচাই করতে ১ বা ২টি বহুনির্বাচনী প্রশ্ন (MCQ) যুক্ত করুন। ১০-১৫ সেকেন্ডের দ্রুত টেস্ট।'
                      : 'Add 1-2 rapid MCQ questions to gauge student understanding.'}
                  </p>
                  <button
                    onClick={() => setIsCreatingQuiz(true)}
                    className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isBangla ? 'নতুন কুইজ তৈরি করুন' : 'Create Micro-Quiz'}</span>
                  </button>
                </div>
              ) : isCreatingQuiz ? (
                /* Create Quiz Form */
                <form onSubmit={handleCreateQuiz} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {isBangla ? 'নতুন কুইজ যোগ করুন' : 'New Micro-Quiz'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingQuiz(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      {isBangla ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBangla ? 'কুইজের শিরোনাম' : 'Quiz Title'}
                    </label>
                    <input
                      type="text"
                      value={newQuizTitle}
                      onChange={(e) => setNewQuizTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#B45309]/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBangla ? 'নির্দেশনা (ঐচ্ছিক)' : 'Instructions (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={newQuizInstructions}
                      onChange={(e) => setNewQuizInstructions(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#B45309]/30"
                    />
                  </div>

                  {/* Question Inputs */}
                  <div className="space-y-4 pt-2">
                    {newQuestions.map((q, qIndex) => (
                      <div
                        key={qIndex}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                            {isBangla ? `প্রশ্ন ${qIndex + 1}` : `Question ${qIndex + 1}`}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            {isBangla ? 'প্রশ্নের বিবরণ' : 'Question Text'}
                          </label>
                          <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => {
                              const updated = [...newQuestions];
                              updated[qIndex].question_text = e.target.value;
                              setNewQuestions(updated);
                            }}
                            placeholder={isBangla ? 'প্রশ্নটি লিখুন...' : 'Enter question...'}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#B45309]/30"
                            required
                          />
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIndex) => (
                            <div key={opt.id} className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {opt.id}
                              </span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...newQuestions];
                                  updated[qIndex].options[optIndex].text = e.target.value;
                                  setNewQuestions(updated);
                                }}
                                placeholder={isBangla ? `অপশন ${opt.id}` : `Option ${opt.id}`}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                                required
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              {isBangla ? 'সঠিক উত্তর কোনটি?' : 'Correct Option'}
                            </label>
                            <select
                              value={q.correct_option}
                              onChange={(e) => {
                                const updated = [...newQuestions];
                                updated[qIndex].correct_option = e.target.value;
                                setNewQuestions(updated);
                              }}
                              className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              {isBangla ? 'সঠিক উত্তরের ব্যাখ্যা' : 'Explanation'}
                            </label>
                            <input
                              type="text"
                              value={q.explanation}
                              onChange={(e) => {
                                const updated = [...newQuestions];
                                updated[qIndex].explanation = e.target.value;
                                setNewQuestions(updated);
                              }}
                              placeholder={isBangla ? 'সংক্ষিপ্ত ব্যাখ্যা...' : 'Why is this correct?'}
                              className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    {newQuestions.length < 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewQuestions([
                            ...newQuestions,
                            {
                              question_text: '',
                              options: [
                                { id: 'A', text: '' },
                                { id: 'B', text: '' },
                                { id: 'C', text: '' },
                                { id: 'D', text: '' },
                              ],
                              correct_option: 'A',
                              explanation: '',
                              points: 1,
                            },
                          ])
                        }
                        className="text-xs text-[#B45309] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'আরেকটি প্রশ্ন যোগ করুন' : 'Add Question 2'}</span>
                      </button>
                    )}

                    <div className="flex gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsCreatingQuiz(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        {isBangla ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                      >
                        {isBangla ? 'কুইজ প্রকাশ করুন' : 'Publish Quiz'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : quiz ? (
                /* Existing Quiz View */
                <div className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 font-heading">
                        {quiz.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{quiz.instructions}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {quiz.questions.length} {isBangla ? 'টি প্রশ্ন সক্রিয়' : 'Questions Active'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {quiz.questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {isBangla ? `প্রশ্ন ${idx + 1}` : `Question ${idx + 1}`}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {isBangla ? `সঠিক উত্তর: ${q.correct_option}` : `Correct: ${q.correct_option}`}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900">{q.question_text}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                                opt.id === q.correct_option
                                  ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900 font-bold'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  opt.id === q.correct_option
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: Homework & Grading */}
          {activeTab === 'homework' && (
            <div>
              {loadingHw ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-amber-300 border-t-[#B45309] rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">{isBangla ? 'লোড হচ্ছে...' : 'Loading...'}</p>
                </div>
              ) : !homework && !isCreatingHw ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-[#B45309]">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isBangla ? 'কোনো বাড়ির কাজ নির্ধারিত নেই' : 'No Homework Assigned'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isBangla
                      ? 'শিক্ষার্থীদের জন্য একটি ব্যবহারিক হোমওয়ার্ক বা অ্যাসাইনমেন্ট নির্ধারণ করুন।'
                      : 'Assign a practical task or project for students to submit.'}
                  </p>
                  <button
                    onClick={() => setIsCreatingHw(true)}
                    className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isBangla ? 'হোমওয়ার্ক যুক্ত করুন' : 'Create Homework'}</span>
                  </button>
                </div>
              ) : isCreatingHw ? (
                /* Create Homework Form */
                <form onSubmit={handleCreateHomework} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {isBangla ? 'নতুন হোমওয়ার্ক তৈরি' : 'New Homework'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingHw(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      {isBangla ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBangla ? 'অ্যাসাইনমেন্টের শিরোনাম' : 'Title'}
                    </label>
                    <input
                      type="text"
                      value={newHwTitle}
                      onChange={(e) => setNewHwTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBangla ? 'কাজের বিবরণ ও নির্দেশাবলী' : 'Instructions'}
                    </label>
                    <textarea
                      value={newHwInstructions}
                      onChange={(e) => setNewHwInstructions(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isBangla ? 'জমা দেওয়ার শেষ তারিখ' : 'Due Date'}
                      </label>
                      <input
                        type="date"
                        value={newHwDueDate}
                        onChange={(e) => setNewHwDueDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isBangla ? 'পূর্ণমান (Max Score)' : 'Max Score'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newHwMaxScore}
                        onChange={(e) => setNewHwMaxScore(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingHw(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      {isBangla ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-lg shadow-md cursor-pointer"
                    >
                      {isBangla ? 'হোমওয়ার্ক সংরক্ষণ করুন' : 'Save Homework'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Existing Homework & Submissions Board */
                <div className="space-y-4">
                  {/* Homework Info */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 font-heading">
                        {homework?.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{homework?.instructions}</p>
                      {homework?.due_date && (
                        <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'শেষ তারিখ:' : 'Due:'} {homework.due_date}</span>
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {isBangla ? `পূর্ণমান: ${homework?.max_score}` : `Max: ${homework?.max_score}`}
                    </span>
                  </div>

                  {/* Submissions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {isBangla ? 'শিক্ষার্থীদের জমাকৃত কাজসমূহ' : 'Student Submissions'} (
                        {submissions.length})
                      </h5>
                    </div>

                    {submissions.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center italic">
                        {isBangla ? 'এখনো কোনো শিক্ষার্থী হোমওয়ার্ক জমা দেয়নি।' : 'No submissions received yet.'}
                      </p>
                    ) : (
                      submissions.map((sub) => {
                        const grade = gradingState[sub.id] || { score: '', feedback: '' };
                        const isSaving = savingGradeId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {sub.student_name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({sub.student_id_number})
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'reviewed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {sub.status === 'reviewed'
                                  ? isBangla
                                    ? `মূল্যায়িত (${sub.score}/${homework?.max_score})`
                                    : `Reviewed (${sub.score}/${homework?.max_score})`
                                  : isBangla
                                  ? 'নতুন জমাকৃত'
                                  : 'New Submission'}
                              </span>
                            </div>

                            {/* Submission Text */}
                            {sub.submission_text && (
                              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                {sub.submission_text}
                              </p>
                            )}

                            {/* Attachment Link */}
                            {sub.attachment_url && (
                              <a
                                href={sub.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#B45309] font-bold hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{isBangla ? 'শিক্ষার্থীর ড্রাইভ/ফাইল লিংক খুলুন' : 'Open Attached Link'}</span>
                              </a>
                            )}

                            {/* Teacher Grading & Feedback Inputs */}
                            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                              <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                  {isBangla ? `স্কোর (${homework?.max_score} এর মধ্যে)` : `Score (out of ${homework?.max_score})`}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={homework?.max_score || 10}
                                  value={grade.score}
                                  onChange={(e) =>
                                    setGradingState((prev) => ({
                                      ...prev,
                                      [sub.id]: {
                                        ...prev[sub.id],
                                        score: e.target.value === '' ? '' : Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full text-xs p-1.5 rounded-md border border-slate-300 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                  {isBangla ? 'শিক্ষকের মন্তব্য / পরামর্শ' : 'Feedback / Remarks'}
                                </label>
                                <input
                                  type="text"
                                  value={grade.feedback}
                                  onChange={(e) =>
                                    setGradingState((prev) => ({
                                      ...prev,
                                      [sub.id]: {
                                        ...prev[sub.id],
                                        feedback: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={isBangla ? 'যেমন: মাশাআল্লাহ, সুন্দর হয়েছে...' : 'Remarks...'}
                                  className="w-full text-xs p-1.5 rounded-md border border-slate-300"
                                />
                              </div>

                              <div className="sm:pt-3 flex justify-end">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleGradeSubmission(sub.id)}
                                  className="w-full sm:w-auto px-3.5 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {isSaving ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{isBangla ? 'গ্রেড সংরক্ষণ' : 'Save Grade'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
