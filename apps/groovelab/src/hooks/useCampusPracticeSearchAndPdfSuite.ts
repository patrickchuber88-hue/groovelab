import React, { useState, useEffect } from 'react';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface UseCampusPracticeSearchAndPdfSuiteReturn {
  bandSearchText: string;
  setBandSearchText: React.Dispatch<React.SetStateAction<string>>;
  bandSearchLetter: string | null;
  setBandSearchLetter: React.Dispatch<React.SetStateAction<string | null>>;
  expandedMatchingSong: string | null;
  setExpandedMatchingSong: React.Dispatch<React.SetStateAction<string | null>>;
  showQR: boolean;
  setShowQR: React.Dispatch<React.SetStateAction<boolean>>;
  toastMessage: ToastMessage | null;
  setToastMessage: React.Dispatch<React.SetStateAction<ToastMessage | null>>;
  activePdfFolderUrl: string | null;
  setActivePdfFolderUrl: React.Dispatch<React.SetStateAction<string | null>>;
  activePdfSong: any;
  setActivePdfSong: React.Dispatch<React.SetStateAction<any>>;
  showConfetti: any;
  setShowConfetti: React.Dispatch<React.SetStateAction<any>>;
  selectedEqCat: string;
  setSelectedEqCat: React.Dispatch<React.SetStateAction<string>>;
  practiceSearchQuery: string;
  setPracticeSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  practiceAlphaFilter: string | null;
  setPracticeAlphaFilter: React.Dispatch<React.SetStateAction<string | null>>;
  practiceSearchType: 'title' | 'artist';
  setPracticeSearchType: React.Dispatch<React.SetStateAction<'title' | 'artist'>>;
  activeStudentsCount: number;
  setActiveStudentsCount: React.Dispatch<React.SetStateAction<number>>;
  personalRejections: any[];
  teachers: any[];
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useCampusPracticeSearchAndPdfSuite = (): UseCampusPracticeSearchAndPdfSuiteReturn => {
  const [bandSearchText, setBandSearchText] = useState('');
  const [bandSearchLetter, setBandSearchLetter] = useState<string | null>(null);
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [activePdfFolderUrl, setActivePdfFolderUrl] = useState<string | null>(null);
  const [activePdfSong, setActivePdfSong] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [practiceSearchQuery, setPracticeSearchQuery] = useState('');
  const [practiceAlphaFilter, setPracticeAlphaFilter] = useState<string | null>(null);
  const [practiceSearchType, setPracticeSearchType] = useState<'title' | 'artist'>('title');
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [personalRejections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  return {
    bandSearchText,
    setBandSearchText,
    bandSearchLetter,
    setBandSearchLetter,
    expandedMatchingSong,
    setExpandedMatchingSong,
    showQR,
    setShowQR,
    toastMessage,
    setToastMessage,
    activePdfFolderUrl,
    setActivePdfFolderUrl,
    activePdfSong,
    setActivePdfSong,
    showConfetti,
    setShowConfetti,
    selectedEqCat,
    setSelectedEqCat,
    practiceSearchQuery,
    setPracticeSearchQuery,
    practiceAlphaFilter,
    setPracticeAlphaFilter,
    practiceSearchType,
    setPracticeSearchType,
    activeStudentsCount,
    setActiveStudentsCount,
    personalRejections,
    teachers,
    setTeachers,
  };
};
