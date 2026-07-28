import React from 'react';
import * as Icons from 'lucide-react';

interface RoleIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const RoleIcon: React.FC<RoleIconProps> = ({ name, className = 'w-5 h-5', size }) => {
  // Dynamically map icon component
  const IconComponent = (Icons as unknown as Record<string, React.FC<{ className?: string; size?: number }>>)[name] 
    || Icons.Sparkles;

  return <IconComponent className={className} size={size} />;
};

export const AVAILABLE_ICONS = [
  'Square', 'Wind', 'Milk', 'Utensils', 'BookOpen', 'Recycle', 'Zap', 
  'Tv', 'Users', 'Sparkles', 'Footprints', 'Mail', 'Flower2', 'Leaf', 
  'Sun', 'Check', 'Shield', 'Crown', 'Brush', 'Laptop', 'Smile', 
  'Heart', 'Award', 'Star', 'Bell', 'Volume2', 'Globe', 'Camera'
];
