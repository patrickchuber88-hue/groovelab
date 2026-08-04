import React from 'react';
import { UserRole, ModuleType } from '@groovelab/shared';

export interface AvatarProps {
  role: UserRole;
  currentModule: ModuleType;
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  role,
  currentModule,
  src,
  alt,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  // Rule: Admin & Secretary MUST use briefing board image /campus_login_hero.png
  const isVerwaltungUser = role === 'admin' || role === 'secretary';
  // Rule: Musician avatars only allowed for teacher & student in groovelab module
  const allowMusicianAvatar = (role === 'teacher' || role === 'student') && currentModule === 'groovelab';

  let finalSrc = src;
  if (isVerwaltungUser) {
    finalSrc = '/campus_login_hero.png';
  } else if (!allowMusicianAvatar && !src) {
    finalSrc = '/campus_login_hero.png';
  }

  return (
    <div className={`relative inline-block rounded-full overflow-hidden border border-gray-200 ${sizeClasses[size]} ${className}`}>
      {finalSrc ? (
        <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center font-bold text-gray-700">
          {alt.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};
