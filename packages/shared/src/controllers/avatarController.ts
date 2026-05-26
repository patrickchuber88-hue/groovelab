import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Static catalog of avatars and their evolution stages
interface AvatarStage {
  level: number;
  name: string;
  assetPath: string;
  xpThreshold: number;
}

interface HeroClass {
  id: string;
  name: string;
  instrument: string;
  stages: Record<number, AvatarStage>;
}

const PREMIUM_HERO_CLASSES: Record<string, HeroClass> = {
  guitarist: {
    id: 'guitarist',
    name: 'Gitarren-Held',
    instrument: 'Guitar',
    stages: {
      1: { level: 1, name: 'Garagen-Gitarrist', assetPath: '/avatars/hero_guitarist_lvl1.png', xpThreshold: 0 },
      2: { level: 2, name: 'Band-Mitglied', assetPath: '/avatars/hero_guitarist_lvl2.png', xpThreshold: 100 },
      3: { level: 3, name: 'Rockstar', assetPath: '/avatars/hero_guitarist_lvl3.png', xpThreshold: 300 }
    }
  },
  drummer: {
    id: 'drummer',
    name: 'Beat-Master',
    instrument: 'Drums',
    stages: {
      1: { level: 1, name: 'Takt-Anfänger', assetPath: '/avatars/hero_drummer_lvl1.png', xpThreshold: 0 },
      2: { level: 2, name: 'Studio-Drummer', assetPath: '/avatars/hero_drummer_lvl2.png', xpThreshold: 100 },
      3: { level: 3, name: 'Rhythmus-Gott', assetPath: '/avatars/hero_drummer_lvl3.png', xpThreshold: 300 }
    }
  },
  keyboardist: {
    id: 'keyboardist',
    name: 'Tasten-Magier',
    instrument: 'Keys',
    stages: {
      1: { level: 1, name: 'Melodien-Sucher', assetPath: '/avatars/hero_keys_lvl1.png', xpThreshold: 0 },
      2: { level: 2, name: 'Synthie-Pionier', assetPath: '/avatars/hero_keys_lvl2.png', xpThreshold: 100 },
      3: { level: 3, name: 'Tasten-Virtuose', assetPath: '/avatars/hero_keys_lvl3.png', xpThreshold: 300 }
    }
  },
  vocalist: {
    id: 'vocalist',
    name: 'Vocal-Star',
    instrument: 'Vocals',
    stages: {
      1: { level: 1, name: 'Dusch-Sänger', assetPath: '/avatars/hero_vocals_lvl1.png', xpThreshold: 0 },
      2: { level: 2, name: 'Bühnen-Neuling', assetPath: '/avatars/hero_vocals_lvl2.png', xpThreshold: 100 },
      3: { level: 3, name: 'Stimm-König/in', assetPath: '/avatars/hero_vocals_lvl3.png', xpThreshold: 300 }
    }
  }
};

const STANDARD_SILHOUETTE = {
  style: 'Standard_Silhouette',
  name: 'Analoger Schüler (Silhouette)',
  assetPath: '/avatars/silhouette_grey.png',
  description: 'Zugewiesen für analoge Schüler-Konten ohne App-Zugriff.'
};

// 1. GET AVATAR GALLERY
export async function getAvatarGalleryHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    // Query user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, is_app_user, is_premium_user')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    // Two-Class Restriction Check
    if (!profile.is_premium_user) {
      // Blocked: Non-premium user can only access the standard grey silhouette
      res.status(200).json({
        isAppUser: profile.is_app_user ?? false,
        isPremiumUser: false,
        activeStyle: 'Standard_Silhouette',
        gallery: [STANDARD_SILHOUETTE]
      });
      return;
    }

    // Premium Access: Full Comic Hero Gallery
    res.status(200).json({
      isAppUser: true,
      isPremiumUser: true,
      activeStyle: 'Premium_Hero',
      gallery: Object.values(PREMIUM_HERO_CLASSES)
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

// 2. SELECT INITIAL AVATAR HERO
export async function selectAvatarHandler(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    const { heroClassId } = req.body;
    if (!heroClassId || !PREMIUM_HERO_CLASSES[heroClassId]) {
      res.status(400).json({ error: 'Invalid or missing heroClassId in request body.' });
      return;
    }

    // Verify user profile and is_premium_user status
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, is_app_user, is_premium_user')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    if (!profile.is_premium_user) {
      res.status(403).json({ error: 'Access forbidden. Only premium student profiles can select premium heroes.' });
      return;
    }

    const selectedHero = PREMIUM_HERO_CLASSES[heroClassId];
    const initialStage = selectedHero.stages[1];

    // Update avatar record
    const { data: updatedAvatar, error: avatarError } = await supabase
      .from('avatars')
      .upsert({
        user_id: user.id,
        avatar_style: 'Premium_Hero',
        instrument_type: selectedHero.id,
        evolution_level: 1,
        xp: 0,
        asset_path: initialStage.assetPath
      })
      .select('*')
      .single();

    if (avatarError) {
      res.status(500).json({ error: 'Failed to update avatar selection in database.', details: avatarError.message });
      return;
    }

    // Sync asset_path back to users table's avatar_url for app-wide compatibility
    await supabase
      .from('users')
      .update({ avatar_url: initialStage.assetPath })
      .eq('id', user.id);

    res.status(200).json({
      success: true,
      message: 'Avatar hero selected successfully.',
      avatar: updatedAvatar
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

// 3. ADD XP & EVOLVE AVATAR (Teacher trigger)
export async function addXpHandler(req: Request, res: Response): Promise<void> {
  try {
    // Authenticate teacher/admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized or invalid token.' });
      return;
    }

    // Verify that the issuer is a teacher or admin
    const { data: issuerProfile, error: issuerError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (issuerError || !issuerProfile || (issuerProfile.role !== 'teacher' && issuerProfile.role !== 'admin')) {
      res.status(403).json({ error: 'Access forbidden. Only teachers and admins can add XP to students.' });
      return;
    }

    const { studentId, xpAmount } = req.body;
    if (!studentId || typeof xpAmount !== 'number' || xpAmount <= 0) {
      res.status(400).json({ error: 'Invalid or missing studentId or xpAmount in request body.' });
      return;
    }

    // Check student's app status & current avatar info
    const { data: avatarRecord, error: avatarFetchError } = await supabase
      .from('avatars')
      .select('id, user_id, avatar_style, instrument_type, evolution_level, xp, asset_path')
      .eq('user_id', studentId)
      .single();

    if (avatarFetchError || !avatarRecord) {
      res.status(404).json({ error: 'Avatar profile for this student not found.' });
      return;
    }

    // Fetch the student's premium status from users
    const { data: studentUser } = await supabase
      .from('users')
      .select('is_premium_user')
      .eq('id', studentId)
      .single();

    const isPremium = studentUser?.is_premium_user ?? false;

    const currentXp = avatarRecord.xp || 0;
    const newXp = currentXp + xpAmount;
    
    let targetLevel = avatarRecord.evolution_level || 1;
    let nextAssetPath = avatarRecord.asset_path;
    let levelUpOccurred = false;

    if (isPremium) {
      const heroClass = PREMIUM_HERO_CLASSES[avatarRecord.instrument_type];
      if (heroClass) {
        // Calculate level up based on thresholds
        if (newXp >= heroClass.stages[3].xpThreshold) {
          targetLevel = 3;
        } else if (newXp >= heroClass.stages[2].xpThreshold) {
          targetLevel = 2;
        } else {
          targetLevel = 1;
        }
      }
      levelUpOccurred = targetLevel > avatarRecord.evolution_level;
      nextAssetPath = heroClass ? heroClass.stages[targetLevel].assetPath : avatarRecord.asset_path;
    } else {
      // Non-premium: visual level-up remains locked to level 1, avatar is grey silhouette
      targetLevel = 1;
      nextAssetPath = '/avatars/silhouette_grey.png';
      levelUpOccurred = false;
    }

    // Update avatar stats
    const { data: updatedAvatar, error: updateError } = await supabase
      .from('avatars')
      .update({
        xp: newXp,
        evolution_level: targetLevel,
        asset_path: nextAssetPath,
        avatar_style: isPremium ? 'Premium_Hero' : 'Standard_Silhouette'
      })
      .eq('user_id', studentId)
      .select('*')
      .single();

    if (updateError) {
      res.status(500).json({ error: 'Failed to update student XP.', details: updateError.message });
      return;
    }

    // Sync new asset_path back to user profile's avatar_url
    await supabase
      .from('users')
      .update({ avatar_url: nextAssetPath })
      .eq('id', studentId);

    res.status(200).json({
      success: true,
      message: levelUpOccurred ? 'Level-up! Avatar evolved to the next stage!' : 'XP added successfully.',
      levelUp: levelUpOccurred,
      avatar: updatedAvatar
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
