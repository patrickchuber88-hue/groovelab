import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";

import { 
  getInstrumentAvatarUrl, 
  getDefaultMusicianAvatarUrl, 
  resolveCampusStudentAvatar, 
  resolveGrooveLabTeacherAvatar,
  getEffectiveInstrument, 
  isGenericInstrument 
} from "../StudioAvatar";
export { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl, resolveCampusStudentAvatar, resolveGrooveLabTeacherAvatar };

export interface AvatarImageProps {
  src: string | null;
  style?: React.CSSProperties;
  className?: string;
  user?: any;
  userId?: string;
  onClick?: () => void;
  activePlatform?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
}

// --- ANTI-FLICKER AVATAR SYSTEM ---
export const AvatarImage = React.memo(({ 
  src, 
  style, 
  className, 
  user, 
  userId, 
  onClick, 
  activePlatform,
  loading = "lazy",
  decoding = "async"
}: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(() => {
    return getEffectiveInstrument(user) || user?.resolved_instrument || user?.instrument || null;
  });

  useEffect(() => {
    if (user && user.role === "student" && isGenericInstrument(user.instrument) && user.teacher_id) {
      supabase
        .from("users")
        .select("instrument, subject, expertise")
        .eq("id", user.teacher_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const inst = data.instrument || data.subject || data.expertise;
            if (inst && !isGenericInstrument(inst)) {
              setResolvedInstrument(inst);
            }
          }
        });
    } else {
      const effective = getEffectiveInstrument(user);
      setResolvedInstrument(effective || user?.resolved_instrument || user?.instrument || null);
    }
  }, [user]);

  const displaySrc = useMemo(() => {
    const activePlat = activePlatform || (typeof window !== "undefined" ? localStorage.getItem("groovelab_active_platform") : "groovelab");
    const targetUser = user;
    
    const r = (targetUser?.role || "").toLowerCase();
    const roles = Array.isArray(targetUser?.roles) ? targetUser.roles.map((x: any) => String(x).toLowerCase()) : [];
    const hasTeacherRole = r === "teacher" || roles.includes("teacher");
    const activeWorkspace = typeof window !== "undefined" ? (sessionStorage.getItem("groovelab_active_workspace") || localStorage.getItem("groovelab_active_workspace")) : null;
    const isExplicitTeacher = targetUser?.isTeacherContext === true || targetUser?.isTeacher === true || hasTeacherRole || (activeWorkspace === "teacher" && (r === "teacher" || roles.includes("teacher")));
    const isVerwaltungContext = (r === "admin" || r === "secretary") && !isExplicitTeacher;

    if (hasError) {
      if (activePlat === "campus") {
        return "/avatars/gitarre_avatar_new.png";
      }
      if (activePlat === "secretary" || isVerwaltungContext) {
        return "/campus_login_hero.png";
      }
      if (r === "student") {
        return getDefaultMusicianAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser) || targetUser?.instrument, "student");
      }
      return "/avatar_ghost.jpg";
    }

    if (isVerwaltungContext || activePlat === "secretary") {
      return "/campus_login_hero.png";
    }
    
    if (activePlat === "campus") {
      // 🏛️ Campus Module SSOT Invariant:
      // 1. Ghost avatar (/avatar_ghost.jpg) belongs EXCLUSIVELY to GrooveLab and is strictly forbidden in Campus.
      // 2. Musician avatars (student_*, teen_*, bandstyle_*) are strictly forbidden in Campus.
      // 3. Admin / Secretary in Campus receive /campus_login_hero.png.
      // 4. All students and teachers in Campus MUST receive their 3D instrument avatar.
      if (targetUser) {
        return resolveCampusStudentAvatar({ 
          ...targetUser, 
          role: isExplicitTeacher ? 'teacher' : (targetUser.role || 'student'),
          isTeacherContext: isExplicitTeacher,
          resolved_instrument: resolvedInstrument || targetUser.resolved_instrument || targetUser.instrument 
        });
      }
      if (src && !src.includes('avatar_ghost') && !src.includes('campus_login_hero')) {
        const isMusicianPic = src.includes('student_') || src.includes('bandstyle_') || src.includes('teen_') || src.includes('avatar_boy') || src.includes('avatar_girl');
        if (!isMusicianPic && (src.includes('_avatar') || src.includes('instrument_avatar') || src.startsWith('data:') || src.startsWith('blob:'))) {
          return src;
        }
      }
      return "/avatars/gitarre_avatar_new.png";
    } else {
      // GrooveLab module: teachers and students MUST display musician avatars, NEVER /campus_login_hero.png
      if (isExplicitTeacher) {
        return resolveGrooveLabTeacherAvatar(targetUser, src);
      }
      if (r === "admin" || r === "secretary") {
        return "/campus_login_hero.png";
      }

      // Student Resolution in GrooveLab
      const effectiveSrc = (src === "/campus_login_hero.png") ? null : src;
      const userPhoto = (targetUser?.photo_url === "/campus_login_hero.png") ? null : targetUser?.photo_url;
      const userAvatar = (targetUser?.avatar_url === "/campus_login_hero.png") ? null : targetUser?.avatar_url;

      const candidate = effectiveSrc || userPhoto || userAvatar;

      const isStudentMusicianAvatar = candidate && (
        candidate.includes("student_") ||
        candidate.includes("bandstyle_") ||
        candidate.includes("teen_") ||
        candidate.includes("avatar_boy") ||
        candidate.includes("avatar_girl") ||
        candidate.startsWith("http://") ||
        candidate.startsWith("https://") ||
        candidate.startsWith("data:") ||
        candidate.startsWith("blob:")
      );

      const isInstrument = candidate && (
        candidate.includes("avatar.png") || 
        candidate.includes("avatar_new") ||
        candidate.includes("_avatar") ||
        candidate.includes("guitar_avatar") || 
        candidate.includes("gitarre_avatar") || 
        candidate.includes("ebass_avatar") || 
        candidate.includes("egitarre_avatar") || 
        candidate.includes("kontrabass_avatar") || 
        candidate.includes("bass_avatar") || 
        candidate.includes("drums_avatar") || 
        candidate.includes("schlagzeug_avatar") || 
        candidate.includes("piano_avatar") || 
        candidate.includes("klavier_avatar") || 
        candidate.includes("vocals_avatar") || 
        candidate.includes("gesang_avatar") || 
        candidate.includes("trumpet_avatar") || 
        candidate.includes("trompete_avatar") || 
        candidate.includes("trombone_avatar") || 
        candidate.includes("posaune_avatar") || 
        candidate.includes("horn_avatar") || 
        candidate.includes("cello_avatar") || 
        candidate.includes("violin_avatar") || 
        candidate.includes("violine_avatar") || 
        candidate.includes("clarinet_avatar") || 
        candidate.includes("klarinette_avatar") || 
        candidate.includes("flute_avatar") || 
        candidate.includes("querfloete_avatar") || 
        candidate.includes("saxophone_avatar") || 
        candidate.includes("saxophon_avatar") || 
        candidate.includes("blockfloete_avatar") || 
        candidate.includes("bariton_avatar") || 
        candidate.includes("oboe_avatar")
      );

      if (isStudentMusicianAvatar) {
        return candidate;
      }

      if (candidate && !isInstrument && candidate !== "/avatar_ghost.jpg") {
        return candidate;
      }

      // Default Didactic Student Musician Avatar
      return getDefaultMusicianAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser) || targetUser?.instrument, r);
    }
  }, [src, hasError, user, resolvedInstrument, activePlatform]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    const target = user || userId;
    if (target && window.openUserProfile) {
      window.openUserProfile(target);
    }
  };

  const hasAction = !!(onClick || user || userId);
  const isPortraitAvatar = displaySrc && (
    displaySrc.includes("teacher_") ||
    displaySrc.includes("avatar_teacher") ||
    displaySrc.includes("student_") ||
    displaySrc.includes("bandstyle_") ||
    displaySrc.includes("teen_") ||
    displaySrc.includes("avatar_boy") ||
    displaySrc.includes("avatar_girl")
  );

  return (
    <div 
      onClick={hasAction ? handleClick : undefined}
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative", 
        background: "#f1f5f9", 
        overflow: "hidden", 
        cursor: hasAction ? "pointer" : "default",
        ...style 
      }} 
      className={`avatar-image-wrapper ${hasAction ? "hover-scale-mini" : ""} ${className || ""}`}
    >
      <img 
        src={displaySrc}
        onError={() => setHasError(true)}
        loading={loading}
        decoding={decoding}
        style={{ 
          width: "100%", 
          height: "100%", 
          objectFit: "cover", 
          objectPosition: isPortraitAvatar ? "center 15%" : "center",
          backfaceVisibility: "hidden",
          transform: isPortraitAvatar ? "scale(1.25)" : "none",
          transformOrigin: "center 20%"
        }} 
        alt=""
      />
    </div>
  );
}, (prev, next) => {
  return prev.src === next.src &&
         prev.userId === next.userId &&
         prev.activePlatform === next.activePlatform &&
         prev.loading === next.loading &&
         prev.decoding === next.decoding &&
         prev.user?.id === next.user?.id &&
         prev.user?.photo_url === next.user?.photo_url &&
         prev.user?.role === next.user?.role &&
         prev.user?.instrument === next.user?.instrument;
});

export default AvatarImage;
