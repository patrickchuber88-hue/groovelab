export {};

declare global {
  interface Window {
    _cameraPatched?: boolean;
    _activeMediaStreams?: MediaStream[];
    stopAllCameras?: () => void;
    openUserProfile?: (user: any) => void;
    openTageskompass?: (student: any) => void;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    recognitionInstance?: any;
    webkitAudioContext?: typeof AudioContext;
    MSStream?: any;
    pdfjsLib?: any;
    deferredPrompt?: any;
    debugSchoolId?: string;
    debugUserId?: string;
    debugUserData?: string;
    debugAllUsersLength?: number;
    fetchDashboardDataError?: any;
    fetchDashboardDataStack?: any;
  }
}
