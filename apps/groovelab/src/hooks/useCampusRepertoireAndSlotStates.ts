import React, { useState } from 'react';

export interface UseCampusRepertoireAndSlotStatesReturn {
  userSongs: any[];
  setUserSongs: React.Dispatch<React.SetStateAction<any[]>>;
  userBands: any[];
  setUserBands: React.Dispatch<React.SetStateAction<any[]>>;
  allBands: any[];
  setAllBands: React.Dispatch<React.SetStateAction<any[]>>;
  wallSongs: any[];
  setWallSongs: React.Dispatch<React.SetStateAction<any[]>>;
  globalSongs: any[];
  setGlobalSongs: React.Dispatch<React.SetStateAction<any[]>>;
  plannedSlots: string[];
  setPlannedSlots: React.Dispatch<React.SetStateAction<string[]>>;
  globalPlannedSlots: any[];
  setGlobalPlannedSlots: React.Dispatch<React.SetStateAction<any[]>>;
  showMobileInfo: boolean;
  setShowMobileInfo: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useCampusRepertoireAndSlotStates = (): UseCampusRepertoireAndSlotStatesReturn => {
  const [userSongs, setUserSongs] = useState<any[]>([]);
  const [userBands, setUserBands] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [globalSongs, setGlobalSongs] = useState<any[]>([]);
  const [plannedSlots, setPlannedSlots] = useState<string[]>([]);
  const [globalPlannedSlots, setGlobalPlannedSlots] = useState<any[]>([]);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  return {
    userSongs,
    setUserSongs,
    userBands,
    setUserBands,
    allBands,
    setAllBands,
    wallSongs,
    setWallSongs,
    globalSongs,
    setGlobalSongs,
    plannedSlots,
    setPlannedSlots,
    globalPlannedSlots,
    setGlobalPlannedSlots,
    showMobileInfo,
    setShowMobileInfo,
  };
};
