import { useState, useEffect } from 'react';
import { 
  NetworkProfile, 
  DataSaverPreference,
  getEffectiveNetworkProfile, 
  subscribeNetworkProfile, 
  getDataSaverPreference, 
  setDataSaverPreference,
  formatByteSize 
} from '../services/networkAwarenessService';

export interface UseNetworkProfileResult {
  profile: NetworkProfile;
  isOnline: boolean;
  isCellular: boolean;
  isMetered: boolean;
  tier: NetworkProfile['tier'];
  targetBitrate: number;
  shouldAutoUploadMedia: boolean;
  dataSaverPref: DataSaverPreference;
  setDataSaverPref: (pref: DataSaverPreference) => void;
  formatBytes: (bytes: number) => string;
  badgeText: string;
  badgeSubtext: string;
  badgeColor: string;
}

export function useNetworkProfile(): UseNetworkProfileResult {
  const [profile, setProfile] = useState<NetworkProfile>(() => getEffectiveNetworkProfile());
  const [dataSaverPref, setPrefState] = useState<DataSaverPreference>(() => getDataSaverPreference());

  useEffect(() => {
    const unsubscribe = subscribeNetworkProfile((newProfile) => {
      setProfile(newProfile);
      setPrefState(getDataSaverPreference());
    });
    return unsubscribe;
  }, []);

  const handleSetPref = (pref: DataSaverPreference) => {
    setDataSaverPreference(pref);
    setPrefState(pref);
  };

  // Derive 1% Senior UX badge attributes
  let badgeText = 'WLAN • Studio (320k)';
  let badgeSubtext = 'Volle Dynamik';
  let badgeColor = '#22c55e'; // Green

  if (!profile.isOnline) {
    badgeText = 'Offline-Tresor';
    badgeSubtext = 'Lokal geschützt';
    badgeColor = '#64748b'; // Slate
  } else if (profile.tier === 'cellular_constrained') {
    badgeText = 'Datensparer (80k)';
    badgeSubtext = 'Upload pausiert bis WLAN';
    badgeColor = '#f59e0b'; // Amber
  } else if (profile.tier === 'cellular_fast') {
    badgeText = 'Mobilfunk • Smart-Audio (128k)';
    badgeSubtext = 'Spart 60% Daten • Upload im WLAN';
    badgeColor = '#eab308'; // Yellow/Gold
  }

  return {
    profile,
    isOnline: profile.isOnline,
    isCellular: profile.isCellular,
    isMetered: profile.isMetered,
    tier: profile.tier,
    targetBitrate: profile.targetAudioBitrate,
    shouldAutoUploadMedia: profile.shouldAutoUploadMedia,
    dataSaverPref,
    setDataSaverPref: handleSetPref,
    formatBytes: formatByteSize,
    badgeText,
    badgeSubtext,
    badgeColor
  };
}
