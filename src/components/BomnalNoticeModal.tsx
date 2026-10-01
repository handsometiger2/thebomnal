import React, { useState, useEffect } from 'react';
import { X, Percent, FileText, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { REALTOR_INFO } from '../data/mockData';

const POPUP_STORAGE_KEY = 'bomnal_electronic_contract_popup_hide_until';

export const BomnalNoticeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const hideUntil = localStorage.getItem(POPUP_STORAGE_KEY);
      if (hideUntil) {
        const hideTimestamp = parseInt(hideUntil, 10);
        if (Date.now() < hideTimestamp) {
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    // Show popup after short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDismissForever = () => {
    try {
      // Hide for 7 days (or persistent)
      const expireTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(POPUP_STORAGE_KEY, expireTime.toString());
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const handleActionClick = () => {
    handleClose();
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn select-none">
      <div 
        className="relative w-full max-w-[440px] sm:max-w-[460px] bg-white rounded-3xl shadow-2xl p-6 sm:p-7 pt-5 text-center flex flex-col items-center border border-neutral-100 transform transition-all duration-300 animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Right Close 'X' Button (Exact match with reference image) */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-neutral-900 rounded-full transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-6 h-6 stroke-[1.75]" />
        </button>

        {/* Top Subtitle Copy */}
        <p className="text-[13px] sm:text-sm text-[#444444] font-medium tracking-tight mb-1.5 font-sans-clean">
          더 안전하고, 더 스마트하게 줄이는 비용
        </p>

        {/* Main Logo & Big Title */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="font-serif-luxury text-xl sm:text-2xl font-black tracking-widest text-[#7A0016]">
          </span>
          <h2 className="font-korean-serif text-2xl sm:text-[27px] font-extrabold text-[#111111] tracking-tight leading-none">
            부동산 전자계약
          </h2>
        </div>

        {/* Central Display Screen Mockup (Like the Monitor in the reference image) */}
        <div className="w-full relative mb-6">
          {/* Monitor Screen Frame */}
          <div className="w-full bg-[#1A1A1A] rounded-2xl p-2.5 shadow-xl border-4 border-[#262626]">
            {/* Monitor Glass Inner */}
            <div className="w-full bg-white rounded-xl overflow-hidden text-left flex flex-col">
              
              {/* Screen Top Header */}
              <div className="bg-[#FAF8F5] px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7A0016]" />
                  <span className="text-[10px] font-bold text-[#7A0016] font-serif-luxury tracking-wider">
                    국토교통부 전자계약시스템 연계
                  </span>
                </div>
                <span className="text-[10px] font-medium text-neutral-500">안심공제 100%</span>
              </div>

              {/* Screen Content Hero */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-white to-[#FDFBF7] space-y-3.5">
                <div>
                  <span className="text-[11px] font-bold text-[#7A0016] bg-[#7A0016]/10 px-2 py-0.5 rounded-full inline-block mb-1">
                    고객 맞춤 3대 금융·세무 혜택
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#111111] leading-snug">
                    전자계약 진행 시 금리 인하 &amp; 등기 비용 감면
                  </h3>
                </div>

                {/* 3 Metrics Grid Inside Screen (Matching bottom 3 boxes in monitor mockup) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-neutral-900 text-white rounded-lg p-2.5 text-center flex flex-col justify-between">
                    <span className="text-[10px] text-neutral-400 block">대출 우대금리</span>
                    <span className="text-xs sm:text-sm font-bold text-[#FFD700] block mt-1">
                      0.1~0.2%p↓
                    </span>
                  </div>

                  <div className="bg-neutral-900 text-white rounded-lg p-2.5 text-center flex flex-col justify-between">
                    <span className="text-[10px] text-neutral-400 block">등기 대행료</span>
                    <span className="text-xs sm:text-sm font-bold text-[#00E5FF] block mt-1">
                      30% 감면
                    </span>
                  </div>

                  <div className="bg-neutral-900 text-white rounded-lg p-2.5 text-center flex flex-col justify-between">
                    <span className="text-[10px] text-neutral-400 block">확정일자 부여</span>
                    <span className="text-xs sm:text-sm font-bold text-[#00E676] block mt-1">
                      무료 자동
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
                  <span>봄날공인중개사사무소 안심 인증 매물</span>
                  <span className="text-[#7A0016] font-bold">비대면 전자서명 가능</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monitor Stand Base Mockup */}
          <div className="w-12 h-3 bg-gradient-to-b from-[#C4C4C4] to-[#999999] mx-auto rounded-b-sm" />
          <div className="w-24 h-1.5 bg-[#B0B0B0] mx-auto rounded-full shadow-xs" />
        </div>

        {/* Large Prominent Green Action Button (Exact match with reference image) */}
        <button
          type="button"
          onClick={handleActionClick}
          className="w-full py-4 px-6 bg-[#00C73C] hover:bg-[#00B035] active:scale-[0.99] text-white font-bold text-base sm:text-[17px] rounded-2xl shadow-lg shadow-green-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans-clean mb-3.5 tracking-tight"
        >
          <span>전자계약 혜택 및 안심 상담 바로가기</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Bottom '다시 보지 않기' Text Link (Exact match with reference image) */}
        <button
          type="button"
          onClick={handleDismissForever}
          className="text-xs sm:text-[13px] text-[#4A68AA] hover:text-[#2E477D] underline underline-offset-4 cursor-pointer font-medium transition-colors"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
};
