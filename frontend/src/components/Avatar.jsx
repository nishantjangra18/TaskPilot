import React, { useState } from 'react';
import { getInitials, getAvatarColor } from '../utils/avatarHelper';

const Avatar = ({ name, avatar, className = "h-8 w-8 text-[11px]" }) => {
  const [hasError, setHasError] = useState(false);

  // If avatar image path is defined and hasn't failed to load
  if (avatar && !hasError) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${className} rounded-full object-cover shrink-0`}
        onError={() => setHasError(true)}
      />
    );
  }

  // Fallback avatar container with initials and name-hashed background color
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white uppercase shrink-0 select-none ${className}`}
      style={{ backgroundColor: getAvatarColor(name) }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
