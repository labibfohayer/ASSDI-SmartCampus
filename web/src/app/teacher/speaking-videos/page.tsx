'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Award,
  Filter,
  User,
  Sliders,
  X,
  Send,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface SpeakingVideoItem {
  id: number;
  student: number;
  student_name: string;
  student_id_number: string;
  batch: number;
  batch_name: string;
  level: string;
  subject: number;
  subject_name: string;
  title: string;
  topic: string;
  video_url: string;
  original_video_url?: string;
  file_size_mb: number;
  duration_seconds: number;
  student_notes: string;
  submitted_at: string;
  status: 'submitted' | 'under_review' | 'evaluated' | 'revision_requested';
  score_body_language: number;
  score_pronunciation_fluency: number;
  score_content_vocabulary: number;
  score_presentation_delivery: number;
  total_score: number;
  grade: string;
  teacher_feedback?: string;
  revision_reason?: string;
  evaluated_by_name?: string;
  evaluated_at?: string;
}

export default function TeacherSpeakingVideosPage() {
  const { isBangla, d } = useLanguage();

  const [videos, setVideos] = useState<SpeakingVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'under_review' | 'evaluated' | 'revision_requested'>('all');

  // Evaluation Rubric Modal
  const [evaluatingVideo, setEvaluatingVideo] = useState<SpeakingVideoItem | null>(null);
  const [scoreBody, setScoreBody] = useState<number>(20);
  const [scorePronunciation, setScorePronunciation] = useState<number>(20);
  const [scoreVocab, setScoreVocab] = useState<number>(20);
  const [scoreDelivery, setScoreDelivery] = useState<number>(20);
  const [feedback, setFeedback] = useState<string>('');
  const [evalStatus, setEvalStatus] = useState<'evaluated' | 'revision_requested'>('evaluated');
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/speaking-videos/');
      const data = Array.isArray(res.data) ? res.data : res.data?.results || res.data?.data || [];
      setVideos(data);
    } catch (err) {
      console.error('Failed to load speaking videos:', err);
      toast.error(isBangla ? 'ভিডিও তালিকা লোড করা যায়নি' : 'Failed to load speaking videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const totalScore = scoreBody + scorePronunciation + scoreVocab + scoreDelivery;
  const calculatedGrade =
    totalScore >= 80 ? 'A+' : totalScore >= 70 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 50 ? 'C' : 'F';

  const openEvaluationModal = (vid: SpeakingVideoItem) => {
    setEvaluatingVideo(vid);
    setScoreBody(vid.score_body_language || 20);
    setScorePronunciation(vid.score_pronunciation_fluency || 20);
    setScoreVocab(vid.score_content_vocabulary || 20);
    setScoreDelivery(vid.score_presentation_delivery || 20);
    setFeedback(vid.teacher_feedback || '');
    setEvalStatus(vid.status === 'revision_requested' ? 'revision_requested' : 'evaluated');
    setRevisionReason(vid.revision_reason || '');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingVideo) return;

    if (!feedback.trim()) {
      toast.error(isBangla ? 'অনুগ্রহ করে গঠনমূলক মূল্যায়ন মন্তব্য লিখুন' : 'Please provide constructive feedback');
      return;
    }

    setSubmittingEvaluation(true);
    try {
      await api.post(`/api/v1/speaking-videos/${evaluatingVideo.id}/evaluate/`, {
        score_body_language: scoreBody,
        score_pronunciation_fluency: scorePronunciation,
        score_content_vocabulary: scoreVocab,
        score_presentation_delivery: scoreDelivery,
        teacher_feedback: feedback.trim(),
        status: evalStatus,
        revision_reason: revisionReason.trim(),
      });

      toast.success(
        isBangla
          ? 'মাশাআল্লাহ! স্পিকিং ভিডিও মূল্যায়ন ও রুব্রিক স্কোর সফলভাবে সংরক্ষিত হয়েছে।'
          : 'Speaking video evaluation and rubric score saved!'
      );
      setEvaluatingVideo(null);
      fetchVideos();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (isBangla ? 'মূল্যায়ন সংরক্ষণ করা যায়নি' : 'Failed to save evaluation'));
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  const submittedList = videos.filter((v) => v.status === 'submitted');
  const underReviewList = videos.filter((v) => v.status === 'under_review');
  const evaluatedList = videos.filter((v) => v.status === 'evaluated');
  const revisionList = videos.filter((v) => v.status === 'revision_requested');

  const displayedList =
    activeTab === 'all'
      ? videos
      : activeTab === 'submitted'
      ? submittedList
      : activeTab === 'under_review'
      ? underReviewList
      : activeTab === 'evaluated'
      ? evaluatedList
      : revisionList;

  return (
    <div className="space-y-6">
      {/* Top Banner Architecture */}
      <div className="bg-[#FFFBEB] p-6 sm:p-7 rounded-2xl border border-[#FCD34D] border-l-4 border-l-[#D97706] text-[#0F172A] shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CCFBF1] rounded-full text-xs font-semibold text-[#0F766E] mb-2.5">
            <Video className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>{isBangla ? 'স্পিকিং ভিডিও মূল্যায়ন বোর্ড' : 'Speaking Video Assessment Desk'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            {isBangla ? 'শিক্ষার্থীদের স্পিকিং ভিডিও ও রুব্রিক মূল্যায়ন' : 'Student Speaking Presentations'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-xl">
            {isBangla
              ? 'শিক্ষার্থীদের দাখিলকৃত প্রেজেন্টেশন ভিডিও দেখুন, মূল কোয়ালিটিতে ডাউনলোড করুন এবং ৪-স্তরের রুব্রিক্সে নম্বর দিন।'
              : 'Assess student presentations with 4-criteria rubrics and download in original high definition.'}
          </p>
        </div>

        {/* Tab Filter Controls */}
        <div className="flex flex-wrap items-center gap-1 bg-white border border-[#FCD34D] p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'all' ? 'bg-[#FFFBEB] text-[#0F766E] border border-[#FCD34D] shadow-xs' : 'text-[#475569] hover:text-[#0F766E]'
            }`}
          >
            {isBangla ? 'সকল' : 'All'} ({d(videos.length)})
          </button>
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'submitted' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#475569] hover:text-amber-700'
            }`}
          >
            {isBangla ? 'অমীমাংসিত' : 'Pending'} ({d(submittedList.length)})
          </button>
          <button
            onClick={() => setActiveTab('evaluated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'evaluated' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-[#475569] hover:text-[#16A34A]'
            }`}
          >
            {isBangla ? 'মূল্যায়িত' : 'Evaluated'} ({d(evaluatedList.length)})
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase">{isBangla ? 'মোট দাখিলকৃত ভিডিও' : 'Total Videos'}</span>
          <p className="text-xl font-black text-gray-900 mt-1">{videos.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase">{isBangla ? 'মূল্যায়নের অপেক্ষায়' : 'Awaiting Review'}</span>
          <p className="text-xl font-black text-amber-800 mt-1">{submittedList.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">{isBangla ? 'মূল্যায়িত ভিডিও' : 'Evaluated'}</span>
          <p className="text-xl font-black text-emerald-800 mt-1">{evaluatedList.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase">{isBangla ? 'রিভিশন অনুরোধ' : 'Needs Revision'}</span>
          <p className="text-xl font-black text-blue-800 mt-1">{revisionList.length}</p>
        </div>
      </div>

      {/* Videos List Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-700 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">{isBangla ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">
            {isBangla ? 'কোনো স্পিকিং ভিডিও পাওয়া যায়নি' : 'No Speaking Videos Found'}
          </h3>
          <p className="text-xs text-gray-500">
            {isBangla ? 'এই ফিল্টারে বর্তমানে কোনো ভিডিও জমা নেই।' : 'No submissions found under this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedList.map((vid) => {
            const isEvaluated = vid.status === 'evaluated';

            return (
              <div
                key={vid.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">
                          {vid.student_name}
                        </h4>
                        <p className="text-[10.5px] text-gray-500 font-mono">
                          {vid.student_id_number} • {vid.batch_name}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isEvaluated
                          ? 'bg-emerald-100 text-emerald-800'
                          : vid.status === 'under_review'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isEvaluated
                        ? isBangla ? '✓ মূল্যায়িত' : 'Evaluated'
                        : vid.status === 'under_review'
                        ? isBangla ? 'পর্যালোচনা চলছে' : 'Under Review'
                        : isBangla ? 'অমীমাংসিত' : 'Pending'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mb-1">{vid.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {vid.subject_name}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {vid.level === 'level_2' ? 'Level 2' : 'Level 1'}
                    </span>
                    {vid.duration_seconds > 0 && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        {Math.floor(vid.duration_seconds / 60)}m {vid.duration_seconds % 60}s
                      </span>
                    )}
                  </div>

                  {vid.student_notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 mb-3 italic">
                      "{vid.student_notes}"
                    </div>
                  )}

                  {/* Video Player */}
                  {vid.video_url && (
                    <div className="rounded-xl overflow-hidden bg-black/90 aspect-video relative flex items-center justify-center border border-slate-200">
                      {vid.video_url.endsWith('.mp4') || vid.video_url.includes('sample') ? (
                        <video src={vid.video_url} controls className="w-full h-full object-contain" preload="metadata" />
                      ) : (
                        <a
                          href={vid.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{isBangla ? 'ভিডিও স্ট্রিম ওপেন করুন' : 'Watch Stream'}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Existing Rubric Evaluation Summary */}
                  {isEvaluated && (
                    <div className="mt-3 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900">{isBangla ? 'প্রদত্ত মূল্যায়ন ফলাফল:' : 'Assessment Result:'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-xs">
                            গ্রেড: {vid.grade}
                          </span>
                          <span className="font-extrabold text-emerald-950 text-xs">
                            {vid.total_score}/১০০
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <span className="text-gray-600">শারীরিক ভঙ্গি: <b>{vid.score_body_language}/২৫</b></span>
                        <span className="text-gray-600">উচ্চারণ: <b>{vid.score_pronunciation_fluency}/২৫</b></span>
                        <span className="text-gray-600">ভোকাবুলারি: <b>{vid.score_content_vocabulary}/২৫</b></span>
                        <span className="text-gray-600">ডেলিভারি: <b>{vid.score_presentation_delivery}/২৫</b></span>
                      </div>

                      {vid.teacher_feedback && (
                        <p className="text-emerald-950 text-xs pt-1 border-t border-emerald-200/50">
                          <b>শিক্ষকের মন্তব্য:</b> {vid.teacher_feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={vid.original_video_url || vid.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'মূল কোয়ালিটি ডাউনলোড' : 'Original Download'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => openEvaluationModal(vid)}
                    className="px-4 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isEvaluated ? (isBangla ? 'পুনর্মূল্যায়ন করুন' : 'Re-evaluate') : (isBangla ? 'রুব্রিক্সে মূল্যায়ন করুন' : 'Evaluate Rubric')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rubric Assessment Modal */}
      {evaluatingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isBangla ? 'স্পিকিং ভিডিও ৪-স্তরের রুব্রিক মূল্যায়ন' : '4-Criteria Rubric Assessment'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {evaluatingVideo.student_name} • {evaluatingVideo.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingVideo(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              {/* Score Display Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold block">{isBangla ? 'সর্বমোট স্কোর:' : 'Calculated Total:'}</span>
                  <span className="text-2xl font-black text-emerald-950">{totalScore} <span className="text-xs font-normal text-gray-500">/ ১০০</span></span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-800 font-bold block">{isBangla ? 'অর্জিত গ্রেড:' : 'Grade:'}</span>
                  <span className="text-xl font-black px-3 py-1 rounded-lg bg-emerald-600 text-white inline-block">{calculatedGrade}</span>
                </div>
              </div>

              {/* Slider 1: Body Language & Posture */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>১. শারীরিক ভঙ্গি ও আত্মবিশ্বাস (Body Language & Eye Contact)</span>
                  <span className="text-emerald-700 font-black">{scoreBody} / ২৫</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={scoreBody}
                  onChange={(e) => setScoreBody(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Pronunciation & Fluency */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>২. উচ্চারণ ও সাবলীলতা (Pronunciation, Pacing & Fluency)</span>
                  <span className="text-emerald-700 font-black">{scorePronunciation} / ২৫</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={scorePronunciation}
                  onChange={(e) => setScorePronunciation(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Content Relevance & Vocabulary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>৩. বিষয়বস্তুর গভীরতা ও শব্দভাণ্ডার (Content & Business Vocabulary)</span>
                  <span className="text-emerald-700 font-black">{scoreVocab} / ২৫</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={scoreVocab}
                  onChange={(e) => setScoreVocab(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider 4: Presentation Delivery */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>৪. উপস্থাপনা ও শ্রোতা আকর্ষণ (Presentation Delivery & Engagement)</span>
                  <span className="text-emerald-700 font-black">{scoreDelivery} / ২৫</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={scoreDelivery}
                  onChange={(e) => setScoreDelivery(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Feedback Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'শিক্ষকের গঠনমূলক মূল্যায়ন মন্তব্য ও পরামর্শ *' : 'Teacher Constructive Feedback *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={isBangla ? 'শিক্ষার্থীর বাচনভঙ্গি, স্পষ্টতা এবং উন্নতির জায়গাগুলো উল্লেখ করুন...' : 'Provide feedback on pacing, articulation and content...'}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvaluatingVideo(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingEvaluation}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingEvaluation ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'মূল্যায়ন প্রকাশ করুন' : 'Publish Evaluation')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
