import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";

import { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl } from "../StudioAvatar";
export { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl };

export interface AvatarImageProps {
  src: string | null;
  style?: React.CSSProperties;
  className?: string;
  user?: any;
  userId?: string;
  onClick?: () => void;
  activePlatform?: string;
}

// --- ANTI-FLICKER AVATAR SYSTEM ---
export const AvatarImage = React.memo(({ 
  src, 
  style, 
  className, 
  user, 
  userId, 
  onClick, 
  activePlatform 
}: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(user?.instrument || null);

  useEffect(() => {
    if (user && user.role === "student" && (!user.instrument || user.instrument === "Allgemein") && user.teacher_id) {
      supabase
        .from("users")
        .select("instrument")
        .eq("id", user.teacher_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.instrument) {
            setResolvedInstrument(data.instrument);
          }
        });
    } else {
      setResolvedInstrument(user?.instrument || null);
    }
  }, [user]);

  const displaySrc = useMemo(() => {
    const activePlat = activePlatform || (typeof window !== "undefined" ? localStorage.getItem("groovelab_active_platform") : "groovelab");
    const targetUser = user;
    
    const r = (targetUser?.role || "").toLowerCase();
    if (activePlat === "secretary") {
      return "/campus_login_hero.png";
    }
    
    if (activePlat === "campus") {
      if (targetUser && (resolvedInstrument || targetUser.role === "student" || targetUser.role === "teacher")) {
        return getInstrumentAvatarUrl(resolvedInstrument);
      }
      if (src && !src.includes("_avatar.png") && !src.includes("avatar_ghost")) {
        return "/avatars/neutral_instrument_avatar.png";
      }
    } else {
      const isStudent = src && (
        src.includes("student_") ||
        src.includes("bandstyle_") ||
        src.includes("teen_") ||
        src.includes("avatar_boy") ||
        src.includes("avatar_girl")
      );
      const isInstrument = !isStudent && src && (
        src.includes("avatar.png") || 
        src.includes("avatar_new") ||
        src.includes("_avatar") ||
        src.includes("guitar_avatar") || 
        src.includes("gitarre_avatar") || 
        src.includes("ebass_avatar") || 
        src.includes("egitarre_avatar") || 
        src.includes("kontrabass_avatar") || 
        src.includes("bass_avatar") || 
        src.includes("drums_avatar") || 
        src.includes("schlagzeug_avatar") || 
        src.includes("piano_avatar") || 
        src.includes("klavier_avatar") || 
        src.includes("vocals_avatar") || 
        src.includes("gesang_avatar") || 
        src.includes("trumpet_avatar") || 
        src.includes("trompete_avatar") || 
        src.includes("trombone_avatar") || 
        src.includes("posaune_avatar") || 
        src.includes("horn_avatar") || 
        src.includes("cello_avatar") || 
        src.includes("violin_avatar") || 
        src.includes("violine_avatar") || 
        src.includes("clarinet_avatar") || 
        src.includes("klarinette_avatar") || 
        src.includes("flute_avatar") || 
        src.includes("querfloete_avatar") || 
        src.includes("saxophone_avatar") || 
        src.includes("saxophon_avatar") || 
        src.includes("blockfloete_avatar") || 
        src.includes("bariton_avatar") || 
        src.includes("oboe_avatar")
      );
      if (r === "teacher" || r === "admin" || r === "secretary") {
        return (src && src !== "/campus_login_hero.png") ? src : "/avatar_ghost.jpg";
      }
      if (!src || isInstrument || src === "/avatar_ghost.jpg") {
        return "/avatar_ghost.jpg";
      }
    }
    if (hasError || !src) return "/avatar_ghost.jpg";
    return src;
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
         prev.user?.id === next.user?.id &&
         prev.user?.photo_url === next.user?.photo_url &&
         prev.user?.role === next.user?.role &&
         prev.user?.instrument === next.user?.instrument;
});

export default AvatarImage;
