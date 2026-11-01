"use client";

import { useScreenTimeManager, ScreenTimeManagerProps } from "./useScreenTimeManager";
import { TimeWarningBanner, DailyLimitScreen } from "./ScreenTimeScreens";
import { BedtimeScreen } from "./BedtimeScreen";

export function ScreenTimeManager({ 
  role: propRole, 
  displayName: propDisplayName, 
  signedIn: propSignedIn, 
  isAdmin: propIsAdmin, 
  isVisitor: propIsVisitor 
}: ScreenTimeManagerProps = {}) {
  const s = useScreenTimeManager({ role: propRole, displayName: propDisplayName, signedIn: propSignedIn, isAdmin: propIsAdmin, isVisitor: propIsVisitor });
  const { status, isLocked, remaining } = s;


  if (!isLocked && (remaining === null || remaining === undefined)) {
    if (!status) return null;
  }

  return (
    <>
      {/* 1. BanniÃ¨re d'avertissement de temps restant (<= 5 min) */}
      
      <TimeWarningBanner s={s} />

      {/* 2. Ã‰CRAN PLEIN Ã‰CRAN : VOYAGE AU PAYS DES SONGES - COCON CÃ‰LESTE & HARMONIE NOCTURNE */}
      
      <BedtimeScreen s={s} />

      {/* 3. Ã‰CRAN PLEIN Ã‰CRAN : LIMITE JOURNALIÃˆRE DE TEMPS ATTEINTE (STRICT TIME LIMIT) */}
      
      <DailyLimitScreen s={s} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sleepFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes sleepBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }
        @keyframes zzzFloat {
          0%, 100% { opacity: 0.3; transform: translate(0, 0) scale(0.9); }
          50% { opacity: 1; transform: translate(6px, -12px) scale(1.18); }
        }
      `}} />
    </>
  );
}
