import React from 'react';
import { UserRole, ModuleType } from '@groovelab/shared';

export interface AvatarProps {
  role: UserRole;
  currentModule: ModuleType;
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isHero?: boolean;
}

export const Avatar: React.FC<AvatarProps> = React.memo(({
  role,
  currentModule,
  src,
  alt,
  size = 'md',
  className = '',
  isHero = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const isVerwaltungUser = role === 'admin' || role === 'secretary';
  const allowMusicianAvatar = (role === 'teacher' || role === 'student') && currentModule === 'groovelab';

  let finalSrc = src;
  if (isVerwaltungUser) {
    finalSrc = '/campus_login_hero.png';
  } else if (!allowMusicianAvatar && !src) {
    finalSrc = '/campus_login_hero.png';
  }

  return (
    <div 
      className={`relative inline-block rounded-full overflow-hidden border border-gray-200 ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={alt}
    >
      {finalSrc ? (
        <img 
          src={finalSrc} 
          alt={alt} 
          className="w-full h-full object-cover"
          loading={isHero ? "eager" : "lazy"}
          decoding={isHero ? "sync" : "async"}
          {...(isHero ? { fetchPriority: 'high' } : {})}
        />
      ) : (
        <div 
          className="w-full h-full bg-gray-300 flex items-center justify-center font-bold text-gray-700"
          aria-hidden="true"
        >
          {alt.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
});
