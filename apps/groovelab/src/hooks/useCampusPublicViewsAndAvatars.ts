import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UseCampusPublicViewsAndAvatarsParams {
  searchParams: URLSearchParams;
  showBandProfile: boolean;
  bandProfileView: 'public' | 'backstage';
  selectedBandForProfile: any;
  setSelectedBandForProfile: React.Dispatch<React.SetStateAction<any>>;
  setShowBandProfile: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export interface UseCampusPublicViewsAndAvatarsReturn {
  selectedStudentForPreview: any;
  setSelectedStudentForPreview: React.Dispatch<React.SetStateAction<any>>;
  customBandName: string;
  setCustomBandName: React.Dispatch<React.SetStateAction<string>>;
  showAvatarPicker: boolean;
  setShowAvatarPicker: React.Dispatch<React.SetStateAction<boolean>>;
  failedAvatarUrls: string[];
  setFailedAvatarUrls: React.Dispatch<React.SetStateAction<string[]>>;
  avatarPickerType: 'band' | 'student' | 'teacher';
  setAvatarPickerType: React.Dispatch<React.SetStateAction<'band' | 'student' | 'teacher'>>;
  avatarInstrumentFilter: 'Alle' | 'E-Gitarre' | 'E-Piano' | 'E-Drum' | 'E-Bass' | 'Gesang';
  setAvatarInstrumentFilter: React.Dispatch<React.SetStateAction<'Alle' | 'E-Gitarre' | 'E-Piano' | 'E-Drum' | 'E-Bass' | 'Gesang'>>;
  bandAvatarSizeFilter: 'Alle' | '3' | '4' | '5';
  setBandAvatarSizeFilter: React.Dispatch<React.SetStateAction<'Alle' | '3' | '4' | '5'>>;
  isSharedView: boolean;
  setIsSharedView: React.Dispatch<React.SetStateAction<boolean>>;
  publicPassUser: any;
  setPublicPassUser: React.Dispatch<React.SetStateAction<any>>;
  loadingPublicPass: boolean;
  setLoadingPublicPass: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useCampusPublicViewsAndAvatars = ({
  searchParams,
  showBandProfile,
  bandProfileView,
  selectedBandForProfile,
  setSelectedBandForProfile,
  setShowBandProfile
}: UseCampusPublicViewsAndAvatarsParams): UseCampusPublicViewsAndAvatarsReturn => {
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState<any>(null);
  const [customBandName, setCustomBandName] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<string[]>([]);
  const [avatarPickerType, setAvatarPickerType] = useState<'band' | 'student' | 'teacher'>('band');
  const [avatarInstrumentFilter, setAvatarInstrumentFilter] = useState<'Alle' | 'E-Gitarre' | 'E-Piano' | 'E-Drum' | 'E-Bass' | 'Gesang'>('Alle');
  const [bandAvatarSizeFilter, setBandAvatarSizeFilter] = useState<'Alle' | '3' | '4' | '5'>('Alle');
  const [isSharedView, setIsSharedView] = useState(false);
  const [publicPassUser, setPublicPassUser] = useState<any>(null);
  const [loadingPublicPass, setLoadingPublicPass] = useState(false);

  // PERSISTENCE LOGIC: Save band profile state
  useEffect(() => {
    localStorage.setItem('groovelab_show_band_profile', showBandProfile.toString());
    localStorage.setItem('groovelab_band_profile_view', bandProfileView);
    if (selectedBandForProfile?.id) {
      localStorage.setItem('groovelab_selected_band_id', selectedBandForProfile.id);
    } else if (!showBandProfile) {
      localStorage.removeItem('groovelab_selected_band_id');
    }
  }, [showBandProfile, bandProfileView, selectedBandForProfile]);

  // URL Deep-Linking & Public Pass/Band Router
  useEffect(() => {
    const urlBandId = searchParams.get('band');
    const isShared = searchParams.get('view') === 'shared';
    const urlCampusPassToken = searchParams.get('campus_pass');
    
    if (urlBandId) {
      if (isShared) setIsSharedView(true);
      console.log(`[PublicView] Detected band ID in URL: ${urlBandId} (Shared: ${isShared})`);
      const fetchPublicBand = async () => {
        try {
          const { data, error } = await supabase
            .from('bands')
            .select('*, songs(*), band_members(*, users!user_id(*)), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!bands_coach_id_fkey(first_name, last_name, photo_url)')
            .eq('id', urlBandId)
            .single();
            
          if (error) {
            console.error('[PublicView] Supabase error fetching band:', error);
            return;
          }
          
          if (data) {
            console.log('[PublicView] Band data loaded successfully:', data.name);
            setSelectedBandForProfile(data);
            setShowBandProfile(true);
            document.title = `${data.name} | GrooveLab Profile`;
          }
        } catch (err) {
          console.error('[PublicView] Unexpected crash during fetch:', err);
        }
      };
      fetchPublicBand();
    }

    if (urlCampusPassToken) {
      console.log(`[PublicPassView] Detected campus pass token in URL: ${urlCampusPassToken}`);
      const fetchPublicPass = async () => {
        try {
          // Stage 0: Tier-1 Server-Side Authentication RPC (Fail-Closed)
          let passData: any = null;
          try {
            const { data: authResult, error: rpcErr } = await supabase.rpc('authenticate_by_credential', {
              p_credential: urlCampusPassToken,
              p_school_id: null
            });
            if (!rpcErr && authResult?.success && authResult?.user) {
              passData = authResult.user;
              if (authResult.lease_token) {
                sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
              }
            }
          } catch (e) {
            console.warn('[PublicPassView] authenticate_by_credential failed:', e);
          }
          
          if (passData) {
            console.log('[PublicPassView] User pass loaded successfully:', passData.first_name);
            setPublicPassUser(passData);
            document.title = `Campus Pass | ${passData.first_name || ''} ${passData.last_name || ''}`.trim();
          }
        } catch (err) {
          console.error('[PublicPassView] Unexpected crash during fetch:', err);
        } finally {
          setLoadingPublicPass(false);
        }
      };
      fetchPublicPass();
    }
  }, [searchParams, setSelectedBandForProfile, setShowBandProfile]);

  return {
    selectedStudentForPreview,
    setSelectedStudentForPreview,
    customBandName,
    setCustomBandName,
    showAvatarPicker,
    setShowAvatarPicker,
    failedAvatarUrls,
    setFailedAvatarUrls,
    avatarPickerType,
    setAvatarPickerType,
    avatarInstrumentFilter,
    setAvatarInstrumentFilter,
    bandAvatarSizeFilter,
    setBandAvatarSizeFilter,
    isSharedView,
    setIsSharedView,
    publicPassUser,
    setPublicPassUser,
    loadingPublicPass,
    setLoadingPublicPass,
  };
};
