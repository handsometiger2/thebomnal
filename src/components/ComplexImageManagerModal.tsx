import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  HardDrive, 
  Image as ImageIcon,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  Settings,
  Layers,
  Sparkles,
  FileText,
  RotateCcw,
  Check,
  Building2
} from 'lucide-react';
import { APARTMENT_COMPLEXES } from '../data/mockData';
import { HERO_SLIDES } from './BomnalCoverStory';
import { ApartmentComplex } from '../types';
import { 
  saveComplexImageToCloud, 
  saveHeroImageToCloud, 
  optimizeImageFile,
  saveComplexCommentToCloud,
  ComplexCommentData
} from '../services/firebaseMedia';

export function getDefaultComment(complex: ApartmentComplex): { comment1: string; comment2: string } {
  const lastChar = complex.name.charCodeAt(complex.name.length - 1);
  const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
  const topicParticle = hasBatchim ? '은' : '는';
  const objectParticle = hasBatchim ? '을' : '를';

  const comment1 = `${complex.name}${topicParticle} 대구 달서구 신월성 생활권 내에서도 탄탄한 실거주 선호도와 안정적인 환금성을 자랑하는 단지입니다. 남향 위주의 단지 배치로 사계절 일조권이 우수하며, ${complex.locationDesc}을 갖추어 학부모님들의 통학 선호도가 매우 높습니다.`;

  let comment2 = '';
  if (complex.id === 'epyeonhan-wolbae') {
    comment2 = `봄날공인중개사사무소는 e편한세상월배 단지 내 상가(B103호)에 11년째 입점하여 해당 단지의 동호수별 일조량, 소음 여부, 최근 실거래 추이 및 급매물 현황을 실시간으로 가장 정확하게 꿰뚫고 있습니다. 허위매물 없는 검증된 실매물 상담을 약속드립니다.`;
  } else {
    comment2 = `봄날공인중개사사무소는 e편한세상월배 상가동 B103호에서 11년째 ${complex.name}${objectParticle} 포함한 신월성 전 단지의 동호수별 일조량, 소음 여부, 최근 실거래 추이 및 급매물 현황을 실시간으로 가장 정확하게 꿰뚫고 있습니다. 허위매물 없는 검증된 실매물 상담을 약속드립니다.`;
  }

  return { comment1, comment2 };
}

interface ComplexImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customImages: Record<string, string>;
  onImageUpdated: (complexId: string, newUrl: string) => void;
  customHeroImages: Record<string, string>;
  onHeroImageUpdated: (slideId: string, newUrl: string) => void;
  customComments?: Record<string, ComplexCommentData>;
  onCommentUpdated?: (complexId: string, comment1: string, comment2: string) => void;
  initialTab?: 'complexes' | 'hero' | 'comments';
  initialCommentComplexId?: string;
}

// Helper to match Korean filenames to complex IDs
export function matchFilenameToComplex(filename: string): ApartmentComplex | undefined {
  const clean = filename.toLowerCase().replace(/[\s\-_]/g, '');
  
  if (clean.includes('월드메르디앙') || clean.includes('월드')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolseong-world-meridian');
  }
  if (clean.includes('푸르지오')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolseong-prugio');
  }
  if (clean.includes('휴포레') || clean.includes('협성')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolseong-hyupsung');
  }
  if (clean.includes('e편한') || clean.includes('이편한') || clean.includes('월배e')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'epyeonhan-wolbae');
  }
  if (clean.includes('에듀파크') || (clean.includes('삼정') && (clean.includes('월성') || clean.includes('에듀')))) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolseong-samjeong');
  }
  if (clean.includes('아이파크1') || clean.includes('아이파크1차') || clean.includes('ipark1')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolbae-ipark-1');
  }
  if (clean.includes('아이파크2') || clean.includes('아이파크2차') || clean.includes('ipark2')) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolbae-ipark-2');
  }
  if (clean.includes('포레스트') || (clean.includes('삼정') && clean.includes('포레'))) {
    return APARTMENT_COMPLEXES.find(c => c.id === 'wolbae-samjeong-forest');
  }
  return undefined;
}

export const ComplexImageManagerModal: React.FC<ComplexImageManagerModalProps> = ({
  isOpen,
  onClose,
  customImages,
  onImageUpdated,
  customHeroImages,
  onHeroImageUpdated,
  customComments = {},
  onCommentUpdated,
  initialTab,
  initialCommentComplexId,
}) => {
  const [activeTab, setActiveTab] = useState<'complexes' | 'hero' | 'comments'>(initialTab || 'complexes');

  // Comment Editor State
  const [selectedCommentComplexId, setSelectedCommentComplexId] = useState<string>(initialCommentComplexId || 'epyeonhan-wolbae');
  const [commentDraft1, setCommentDraft1] = useState<string>('');
  const [commentDraft2, setCommentDraft2] = useState<string>('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState<string | null>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('bomnal_admin_authed') === 'true';
  });
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [adminPin, setAdminPin] = useState<string>(() => {
    return sessionStorage.getItem('bomnal_admin_pin') || '';
  });

  // Change PIN Sub-view
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [changePinMsg, setChangePinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Focus PIN input when opening in unauthenticated state
  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [isOpen, isAuthenticated]);

  // Sync initial tab and complex ID
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialCommentComplexId) setSelectedCommentComplexId(initialCommentComplexId);
  }, [initialTab, initialCommentComplexId, isOpen]);

  // Sync comment drafts when complex or customComments changes
  useEffect(() => {
    const complex = APARTMENT_COMPLEXES.find(c => c.id === selectedCommentComplexId) || APARTMENT_COMPLEXES[0];
    const saved = customComments?.[selectedCommentComplexId];
    const def = getDefaultComment(complex);
    setCommentDraft1(saved?.comment1 !== undefined && saved.comment1 !== '' ? saved.comment1 : def.comment1);
    setCommentDraft2(saved?.comment2 !== undefined && saved.comment2 !== '' ? saved.comment2 : def.comment2);
    setCommentSuccessMsg(null);
  }, [selectedCommentComplexId, customComments]);

  const handleSaveComment = async () => {
    setIsSavingComment(true);
    setCommentSuccessMsg(null);
    try {
      await saveComplexCommentToCloud(selectedCommentComplexId, commentDraft1.trim(), commentDraft2.trim());
      onCommentUpdated?.(selectedCommentComplexId, commentDraft1.trim(), commentDraft2.trim());
      setCommentSuccessMsg('Google Cloud 영구 데이터베이스에 성공적으로 저장되었습니다!');
      setTimeout(() => setCommentSuccessMsg(null), 3500);
    } catch (e: any) {
      alert('저장 중 오류가 발생했습니다: ' + (e?.message || '다시 시도해 주세요.'));
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleResetToDefault = () => {
    const complex = APARTMENT_COMPLEXES.find(c => c.id === selectedCommentComplexId) || APARTMENT_COMPLEXES[0];
    const def = getDefaultComment(complex);
    setCommentDraft1(def.comment1);
    setCommentDraft2(def.comment2);
  };

  if (!isOpen) return null;

  // Handle server-side PIN verification
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/verify-admin-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin.trim() }),
      });

      if (!res.ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setAdminPin(inputPin.trim());
        sessionStorage.setItem('bomnal_admin_authed', 'true');
        sessionStorage.setItem('bomnal_admin_pin', inputPin.trim());
        setInputPin('');
      } else {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setPinError(err.message || '인증에 실패했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPin('');
    sessionStorage.removeItem('bomnal_admin_authed');
    sessionStorage.removeItem('bomnal_admin_pin');
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinMsg(null);

    if (!newPin || newPin.trim().length < 4) {
      setChangePinMsg({ type: 'error', text: '새 비밀번호는 4자리 이상으로 입력해 주세요.' });
      return;
    }

    try {
      const res = await fetch('/api/change-admin-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: adminPin,
          newPin: newPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '비밀번호 변경 실패');
      }

      setAdminPin(newPin.trim());
      sessionStorage.setItem('bomnal_admin_pin', newPin.trim());
      setNewPin('');
      setChangePinMsg({ type: 'success', text: '비밀번호가 안전하게 변경되었습니다.' });
      setTimeout(() => {
        setIsChangingPin(false);
        setChangePinMsg(null);
      }, 1500);
    } catch (err: any) {
      setChangePinMsg({ type: 'error', text: err.message || '변경 실패' });
    }
  };

  // Single file upload handler for complex
  const handleUploadComplexFile = async (complexId: string, file: File) => {
    setUploadingId(complexId);
    setUploadStatusMsg(null);

    try {
      // 1. Optimize and compress for cloud database
      const optimizedDataUrl = await optimizeImageFile(file);

      // 2. Save directly to Google Cloud Firestore (Permanent)
      await saveComplexImageToCloud(complexId, optimizedDataUrl);
      onImageUpdated(complexId, optimizedDataUrl);

      // 3. Fallback sync to local server container
      fetch('/api/upload-complex-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          complexId,
          filename: file.name,
          dataUrl: optimizedDataUrl,
          adminPin,
        }),
      }).catch(() => {});

      setUploadStatusMsg({
        type: 'success',
        text: `[${file.name}] 사진이 클라우드 영구 데이터베이스(Firebase)에 안전하게 저장되었습니다!`,
      });
    } catch (err: any) {
      console.error(err);
      setUploadStatusMsg({
        type: 'error',
        text: `업로드 실패: ${err.message || '파일을 다시 확인해주세요.'}`,
      });
    } finally {
      setUploadingId(null);
    }
  };

  // Single file upload handler for hero slide
  const handleUploadHeroFile = async (slideId: string, file: File) => {
    setUploadingId(slideId);
    setUploadStatusMsg(null);

    try {
      const optimizedDataUrl = await optimizeImageFile(file);
      // 1. Save to Google Cloud Firestore (Permanent)
      await saveHeroImageToCloud(slideId, optimizedDataUrl);
      onHeroImageUpdated(slideId, optimizedDataUrl);

      // 2. Fallback sync to local server container
      fetch('/api/upload-hero-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({
          slideId,
          dataUrl: optimizedDataUrl,
          adminPin,
        }),
      }).catch(() => {});

      setUploadStatusMsg({
        type: 'success',
        text: `메인 히어로 사진이 클라우드 영구 데이터베이스(Firebase)에 안전하게 저장되었습니다!`,
      });
    } catch (err: any) {
      console.error(err);
      setUploadStatusMsg({
        type: 'error',
        text: `업로드 실패: ${err.message || '파일을 다시 확인해주세요.'}`,
      });
    } finally {
      setUploadingId(null);
    }
  };

  // Batch files upload handler for complexes
  const handleBatchFiles = async (files: FileList | File[]) => {
    setBatchUploading(true);
    setUploadStatusMsg(null);
    let matchedCount = 0;
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const matched = matchFilenameToComplex(file.name);
      if (matched) {
        try {
          const optimizedDataUrl = await optimizeImageFile(file);
          // Save directly to Google Cloud Firestore (Permanent)
          await saveComplexImageToCloud(matched.id, optimizedDataUrl);
          onImageUpdated(matched.id, optimizedDataUrl);
          matchedCount++;

          // Fallback sync to local server
          fetch('/api/upload-complex-image', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-pin': adminPin,
            },
            body: JSON.stringify({
              complexId: matched.id,
              filename: file.name,
              dataUrl: optimizedDataUrl,
              adminPin,
            }),
          }).catch(() => {});
        } catch (e: any) {
          errors.push(file.name);
        }
      }
    }

    setBatchUploading(false);
    if (matchedCount > 0) {
      setUploadStatusMsg({
        type: 'success',
        text: `총 ${matchedCount}개 단지 사진이 클라우드 영구 데이터베이스(Firebase)에 보존되었습니다!`,
      });
    } else {
      setUploadStatusMsg({
        type: 'error',
        text: '파일명을 인식하지 못했습니다. 아래 단지별 [사진 변경] 버튼으로 개별 등록해 주세요.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col border border-[#E5DDD2] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* If Not Authenticated: Security PIN Gate */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center text-center max-w-md mx-auto my-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#7A0016]/10 text-[#7A0016] flex items-center justify-center mb-5">
              <Lock className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-serif-luxury tracking-widest text-[#7A0016] font-bold uppercase mb-1">
              BOMNAL SYSTEM SECURITY
            </span>
            <h3 className="font-korean-serif text-2xl font-bold text-[#141414] mb-2">
              관리자 보안 인증
            </h3>
            <p className="text-xs text-[#666666] leading-relaxed mb-6">
              인가된 관리자 전용 화면입니다.<br />
              비밀번호를 입력하여 잠금을 해제해 주세요.
            </p>

            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={pinInputRef}
                  type="password"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="관리자 비밀번호 입력"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#7A0016] rounded-xl text-sm font-sans-clean outline-none transition-colors"
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-600 font-medium flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-[#444444] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-3 bg-[#7A0016] hover:bg-[#580010] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>확인 중...</span>
                    </>
                  ) : (
                    <span>인증 확인</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Manager View */
          <>
            {/* Header */}
            <div className="px-6 py-5 bg-[#FAF8F5] border-b border-[#EAE4DC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7A0016]/10 text-[#7A0016] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-korean-serif text-lg sm:text-xl font-bold text-[#141414]">
                      봄날 부동산 미디어 관리 센터
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#03C75A]/15 text-[#008A3D] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      보안 인증됨
                    </span>
                  </div>
                  <p className="text-xs text-[#666666] mt-0.5">
                    업로드 사진은 <strong>웹 서버 고정 디렉토리</strong>에 영구 보관되며 모든 방문 고객에게 동일하게 표출됩니다.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPin(!isChangingPin)}
                  className="text-xs text-[#666666] hover:text-[#141414] p-2 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="비밀번호 변경"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">비밀번호 변경</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-[#666666] hover:text-[#7A0016] p-2 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="관리자 로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">잠금</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 border border-[#E5E0D8] flex items-center justify-center text-[#555555] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Change PIN Dropdown Box */}
            {isChangingPin && (
              <div className="p-4 bg-[#F5F0E6] border-b border-[#E5DDD2]">
                <form onSubmit={handleChangePin} className="max-w-md mx-auto flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="새 관리자 비밀번호 (4자리 이상)"
                    className="w-full sm:flex-1 px-3 py-2 bg-white border border-[#D5CCC0] rounded-lg text-xs outline-none focus:border-[#7A0016]"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="submit"
                      className="flex-1 sm:flex-initial py-2 px-4 bg-[#7A0016] hover:bg-[#580010] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      변경 저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      className="py-2 px-3 bg-neutral-200 text-[#444444] text-xs font-medium rounded-lg"
                    >
                      취소
                    </button>
                  </div>
                </form>
                {changePinMsg && (
                  <p className={`text-xs text-center mt-2 font-medium ${
                    changePinMsg.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {changePinMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* Navigation Tabs (Complexes vs Hero) */}
            <div className="flex items-center gap-4 border-b border-[#EAE4DC] px-6 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setActiveTab('complexes')}
                className={`pb-3 pt-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'complexes'
                    ? 'border-[#7A0016] text-[#7A0016]'
                    : 'border-transparent text-[#666666] hover:text-[#141414]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>신월성 8개 단지 대표 사진</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hero')}
                className={`pb-3 pt-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'hero'
                    ? 'border-[#7A0016] text-[#7A0016]'
                    : 'border-transparent text-[#666666] hover:text-[#141414]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>메인 히어로 슬라이드 사진 (5장)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`pb-3 pt-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'border-[#7A0016] text-[#7A0016]'
                    : 'border-transparent text-[#666666] hover:text-[#141414]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>단지별 브리핑 코멘트 편집</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status Message Banner */}
              {uploadStatusMsg && (
                <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 font-medium ${
                  uploadStatusMsg.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {uploadStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{uploadStatusMsg.text}</span>
                </div>
              )}

              {/* TAB 1: Complexes Manager */}
              {activeTab === 'complexes' && (
                <>
                  {/* Storage Information Notice Box */}
                  <div className="p-4 bg-[#F5F2EB] border border-[#DDD5C7] rounded-xl text-xs text-[#444444] flex items-start gap-3">
                    <HardDrive className="w-5 h-5 text-[#7A0016] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-[#141414]">
                        신월성 8개 단지 대표 사진 저장 안내
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#555555]">
                        업로드된 사진은 웹 서버의 <code>/public/complexes/</code> 디렉토리에 저장되어 모든 방문 고객에게 100% 동일하게 고화질로 반영됩니다.
                      </p>
                    </div>
                  </div>

                  {/* Fast Batch Drag & Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleBatchFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => batchFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      isDragOver 
                        ? 'border-[#7A0016] bg-[#7A0016]/5 scale-[0.99]' 
                        : 'border-[#D5CCC0] hover:border-[#7A0016] bg-[#FAF8F5] hover:bg-[#F5EFEB]'
                    }`}
                  >
                    <input
                      ref={batchFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBatchFiles(e.target.files);
                        }
                      }}
                    />

                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-[#E5DDD2] flex items-center justify-center text-[#7A0016]">
                      {batchUploading ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : (
                        <UploadCloud className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <p className="font-korean-serif text-base sm:text-lg font-bold text-[#141414]">
                        {batchUploading ? '서버에 저장 중입니다...' : '8개 사진 파일을 여기에 한 번에 끌어다 놓으세요'}
                      </p>
                      <p className="text-xs text-[#777777] mt-1">
                        파일명(예: <code>월성월드메르디앙.jpg</code>, <code>e편한세상월배.jpg</code> 등)을 분석하여 해당 단지와 1초 만에 자동 매칭합니다.
                      </p>
                    </div>

                    <span className="text-xs font-bold text-[#7A0016] underline underline-offset-4">
                      또는 클릭하여 PC에서 여러 파일 한 번에 선택
                    </span>
                  </div>

                  {/* Complex Individual Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#141414] font-korean-serif flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#7A0016]" />
                        <span>단지별 등록 현황 (총 {APARTMENT_COMPLEXES.length}개)</span>
                      </h4>
                      <span className="text-[11px] text-[#777777]">
                        개별 사진만 따로 변경하실 수도 있습니다
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {APARTMENT_COMPLEXES.map((complex) => {
                        const currentImg = customImages[complex.id] || complex.image;
                        const isCustom = Boolean(customImages[complex.id]);
                        const isItemUploading = uploadingId === complex.id;

                        return (
                          <div
                            key={complex.id}
                            className="p-3.5 bg-white border border-[#E5E0D8] rounded-xl flex items-center gap-3.5 shadow-2xs hover:border-[#C5BCB0] transition-colors"
                          >
                            <div className="w-20 h-16 rounded-lg overflow-hidden relative shrink-0 bg-neutral-100 border border-[#EAEAEA]">
                              <img
                                src={currentImg}
                                alt={complex.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-bold text-xs text-[#141414] truncate font-korean-serif">
                                  {complex.name}
                                </p>
                                <span className="text-[10px] text-[#888888] shrink-0">
                                  {complex.totalUnits}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#777777] mt-0.5 truncate">
                                {isCustom ? '✓ 대표 실사진 저장됨' : '기본 이미지 적용 중'}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <label className="cursor-pointer text-[11px] font-bold py-1 px-2.5 bg-[#FAF8F5] hover:bg-[#F0EBE1] border border-[#D5CCC0] rounded-md text-[#7A0016] transition-colors flex items-center gap-1">
                                  {isItemUploading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>저장 중...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="w-3 h-3" />
                                      <span>사진 변경</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isItemUploading}
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUploadComplexFile(complex.id, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: Hero Slides Manager */}
              {activeTab === 'hero' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F5F2EB] border border-[#DDD5C7] rounded-xl text-xs text-[#444444] flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#7A0016] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-[#141414]">
                        메인 히어로 슬라이드(상단 대형 배경) 사진 교체 안내
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#555555]">
                        홈페이지 최상단에 자동으로 전환되는 <strong>5장의 대형 배경 사진</strong>을 대표님이 원하시는 실제 사진(상가 외관, 단지 조경, 내부 인테리어 등)으로 교체하실 수 있습니다.<br />
                        업로드된 사진은 <strong>웹 서버 <code>/public/hero/</code> 디렉토리에 영구 보관</strong>됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {HERO_SLIDES.map((slide, idx) => {
                      const currentHeroImg = customHeroImages[slide.id] || slide.image;
                      const isCustomHero = Boolean(customHeroImages[slide.id]);
                      const isItemUploading = uploadingId === slide.id;

                      return (
                        <div
                          key={slide.id}
                          className="p-4 bg-white border border-[#E5E0D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-[#C5BCB0] transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {/* Slide 16:9 Thumbnail Preview */}
                            <div className="w-32 sm:w-40 aspect-[16/9] rounded-lg overflow-hidden relative shrink-0 bg-neutral-100 border border-[#EAEAEA]">
                              <img
                                src={currentHeroImg}
                                alt={slide.title}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Slide Info */}
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-[#7A0016] uppercase tracking-wider block">
                                {slide.category}
                              </span>
                              <h5 className="font-korean-serif font-bold text-xs sm:text-sm text-[#141414] truncate">
                                {slide.title}
                              </h5>
                              <p className="text-[11px] text-[#777777] mt-0.5 line-clamp-1">
                                {slide.caption}
                              </p>
                              <span className="text-[10px] text-[#888888] block mt-1">
                                {isCustomHero ? '✓ 대표님 지정 실사진 등록됨' : '기본 이미지 적용 중'}
                              </span>
                            </div>
                          </div>

                          {/* Upload Action */}
                          <div className="shrink-0 flex items-center justify-end">
                            <label className="cursor-pointer text-xs font-bold py-2 px-4 bg-[#FAF8F5] hover:bg-[#7A0016] hover:text-white border border-[#D5CCC0] hover:border-[#7A0016] rounded-xl text-[#7A0016] transition-colors flex items-center gap-1.5 shadow-2xs">
                              {isItemUploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>저장 중...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>슬라이드 {idx + 1} 사진 변경</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isItemUploading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadHeroFile(slide.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Complex Briefing Comments Manager */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {/* Guide banner */}
                  <div className="p-4 bg-[#F5F2EB] border border-[#DDD5C7] rounded-xl text-xs text-[#444444] flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[#7A0016] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-[#141414]">
                        단지별 브리핑 코멘트 (BOMNAL REALTOR INSIGHT) 편집 안내
                      </p>
                      <p className="text-[11px] leading-relaxed text-[#555555]">
                        단지 상세 정보 모달에 노출되는 <strong>대표님만의 전문 브리핑 글(단지 가치 분석 &amp; 중개사 소개 문구)</strong>을 자유롭게 수정하실 수 있습니다.<br />
                        수정 후 [클라우드 영구 저장]을 누르시면 <strong>Google Cloud Firestore</strong>에 즉시 영구 저장되어 모든 방문 고객에게 반영됩니다.
                      </p>
                    </div>
                  </div>

                  {/* Complex Selector Pills */}
                  <div>
                    <label className="text-xs font-bold text-[#141414] block mb-2 font-korean-serif">
                      편집할 단지 선택:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {APARTMENT_COMPLEXES.map((c) => {
                        const isSelected = c.id === selectedCommentComplexId;
                        const hasCustom = Boolean(customComments?.[c.id]?.comment1 || customComments?.[c.id]?.comment2);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCommentComplexId(c.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#7A0016] text-white border-[#7A0016] shadow-sm'
                                : 'bg-[#FAF8F5] hover:bg-[#F3EDE2] text-[#333333] border-[#E0D8CB]'
                            }`}
                          >
                            <span className="font-bold text-xs truncate block font-korean-serif">
                              {c.name}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className={isSelected ? 'text-white/80' : 'text-[#777777]'}>
                                {c.totalUnits}
                              </span>
                              {hasCustom && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isSelected ? 'bg-white text-[#7A0016]' : 'bg-[#03C75A]/15 text-[#008A3D]'
                                }`}>
                                  수정됨
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment Editor Fields */}
                  <div className="bg-white border border-[#E5E0D8] rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#7A0016]" />
                        <h4 className="font-korean-serif font-bold text-sm sm:text-base text-[#141414]">
                          [{APARTMENT_COMPLEXES.find(c => c.id === selectedCommentComplexId)?.name}] 코멘트 작성
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="text-xs text-[#666666] hover:text-[#7A0016] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        title="기본 추천 문구로 재설정"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>기본 추천문구 불러오기</span>
                      </button>
                    </div>

                    {/* Paragraph 1 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7A0016]" />
                          1번 문단: 단지 입지 &amp; 실거주 가치 분석
                        </label>
                        <span className="text-[11px] text-[#888888]">
                          {commentDraft1.length}자
                        </span>
                      </div>
                      <textarea
                        value={commentDraft1}
                        onChange={(e) => setCommentDraft1(e.target.value)}
                        rows={4}
                        placeholder="단지의 입지, 학군, 조망, 일조권, 실거주 선호도 등을 작성해 주세요."
                        className="w-full p-3.5 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#7A0016] focus:bg-white rounded-xl text-xs sm:text-sm font-sans-clean outline-none leading-relaxed transition-all resize-y"
                      />
                    </div>

                    {/* Paragraph 2 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7A0016]" />
                          2번 문단: 봄날부동산 전문 중개 역량 &amp; 책임 약속
                        </label>
                        <span className="text-[11px] text-[#888888]">
                          {commentDraft2.length}자
                        </span>
                      </div>
                      <textarea
                        value={commentDraft2}
                        onChange={(e) => setCommentDraft2(e.target.value)}
                        rows={4}
                        placeholder="봄날공인중개사사무소의 단지 내 전문성, 급매물 분석, 11년 무사고 중개 약속 등을 작성해 주세요."
                        className="w-full p-3.5 bg-[#FAF8F5] border border-[#D5CCC0] focus:border-[#7A0016] focus:bg-white rounded-xl text-xs sm:text-sm font-sans-clean outline-none leading-relaxed transition-all resize-y"
                      />
                    </div>

                    {/* Save Action */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F0EBE1]">
                      {commentSuccessMsg ? (
                        <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{commentSuccessMsg}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-[#888888]">
                          저장 시 상세 모달 화면에 즉시 적용됩니다.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveComment}
                        disabled={isSavingComment}
                        className="w-full sm:w-auto py-2.5 px-6 bg-[#7A0016] hover:bg-[#580010] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSavingComment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>클라우드 저장 중...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>[{APARTMENT_COMPLEXES.find(c => c.id === selectedCommentComplexId)?.name}] 코멘트 영구 저장</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Live Preview of Detail Page */}
                  <div className="bg-[#FAF8F5] border border-[#E5DDD2] rounded-2xl p-5 space-y-3">
                    <span className="text-[10px] font-serif-luxury tracking-widest text-[#7A0016] font-bold uppercase block">
                      LIVE PREVIEW · 상세 페이지 미리보기
                    </span>
                    <div className="bg-white p-5 rounded-xl border border-[#EAE4DC] space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#7A0016]/10 text-[#7A0016] flex items-center justify-center font-bold text-xs">
                          봄날
                        </div>
                        <div>
                          <p className="font-serif-luxury text-[10px] font-bold text-[#7A0016] uppercase">
                            BOMNAL REALTOR INSIGHT
                          </p>
                          <p className="font-korean-serif font-bold text-sm text-[#141414]">
                            봄날부동산의 브리핑 코멘트
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-[#444444] leading-relaxed space-y-2 border-t border-[#F0EBE1] pt-3">
                        <p className="pl-2 border-l-2 border-[#7A0016]/40">
                          "{commentDraft1.trim() || '1번 문단 내용을 입력해 주세요.'}"
                        </p>
                        <p className="pl-2 border-l-2 border-[#7A0016]/40">
                          "{commentDraft2.trim() || '2번 문단 내용을 입력해 주세요.'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#EAE4DC] flex items-center justify-between">
              <span className="text-xs text-[#666666]">
                모든 사진은 즉시 웹사이트 전체에 반영됩니다.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-6 bg-[#7A0016] hover:bg-[#580010] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                닫기 및 완료
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
