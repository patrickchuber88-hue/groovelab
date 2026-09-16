import React, { useState, useCallback } from 'react';

export interface UseCampusBandGatewayNavigationReturn {
  selectedMatchingInsts: Record<string, string>;
  setSelectedMatchingInsts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedBandForProfile: any;
  setSelectedBandForProfile: (val: any) => void;
  selectedBandForGateway: any;
  setSelectedBandForGateway: (val: any) => void;
  expandedSongId: string | null;
  setExpandedSongId: React.Dispatch<React.SetStateAction<string | null>>;
  showBandProfile: boolean;
  setShowBandProfile: (val: any) => void;
  bandProfileView: 'public' | 'backstage';
  setBandProfileView: React.Dispatch<React.SetStateAction<'public' | 'backstage'>>;
}

export const useCampusBandGatewayNavigation = (): UseCampusBandGatewayNavigationReturn => {
  const [selectedMatchingInsts, setSelectedMatchingInsts] = useState<Record<string, string>>({});
  const [selectedBandForProfile, setSelectedBandForProfileRaw] = useState<any>(null);

  const setSelectedBandForProfile = useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForProfileRaw(val);
    });
  }, []);

  const [selectedBandForGateway, setSelectedBandForGatewayRaw] = useState<any>(null);

  const setSelectedBandForGateway = useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForGatewayRaw(val);
    });
  }, []);

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const [showBandProfile, setShowBandProfileRaw] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_show_band_profile') === 'true';
    }
    return false;
  });

  const setShowBandProfile = useCallback((val: any) => {
    React.startTransition(() => {
      setShowBandProfileRaw(val);
    });
  }, []);

  const [bandProfileView, setBandProfileView] = useState<'public' | 'backstage'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('groovelab_band_profile_view');
      return (saved === 'public' || saved === 'backstage') ? saved : 'public';
    }
    return 'public';
  });

  return {
    selectedMatchingInsts,
    setSelectedMatchingInsts,
    selectedBandForProfile,
    setSelectedBandForProfile,
    selectedBandForGateway,
    setSelectedBandForGateway,
    expandedSongId,
    setExpandedSongId,
    showBandProfile,
    setShowBandProfile,
    bandProfileView,
    setBandProfileView,
  };
};
