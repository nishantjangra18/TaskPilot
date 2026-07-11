
import {
  Folder,
  Rocket,
  Laptop,
  Smartphone,
  Zap,
  Target,
  BarChart2,
  Gamepad2,
  ShoppingCart,
  Palette,
  FileText,
  Microscope,
  Construction,
  Globe,
  Package,
  TestTube,
  GraduationCap,
  Megaphone,
  Sparkles,
  Shield
} from 'lucide-react';

const iconMap = {
  // Legacy Emojis (for backwards compatibility with existing database records)
  '📁': Folder,
  '🚀': Rocket,
  '💻': Laptop,
  '📱': Smartphone,
  '⚡': Zap,
  '🎯': Target,
  '📊': BarChart2,
  '🎮': Gamepad2,
  '🛒': ShoppingCart,
  '🎨': Palette,
  '📝': FileText,
  '🔬': Microscope,
  '🏗️': Construction,
  '🏗': Construction,
  '🌐': Globe,
  '📦': Package,
  '🧪': TestTube,
  '🎓': GraduationCap,
  '📣': Megaphone,
  '✨': Sparkles,
  '🛡️': Shield,
  '🛡': Shield,

  // Modern string identifiers
  'folder': Folder,
  'rocket': Rocket,
  'laptop': Laptop,
  'smartphone': Smartphone,
  'zap': Zap,
  'target': Target,
  'barchart': BarChart2,
  'gamepad': Gamepad2,
  'shoppingcart': ShoppingCart,
  'palette': Palette,
  'filetext': FileText,
  'microscope': Microscope,
  'construction': Construction,
  'globe': Globe,
  'package': Package,
  'testtube': TestTube,
  'graduationcap': GraduationCap,
  'megaphone': Megaphone,
  'sparkles': Sparkles,
  'shield': Shield
};

/**
 * Returns a Lucide React component for the given project icon name/key.
 * Falls back to Folder if not matched.
 */
export const getProjectIcon = (iconName, props = {}) => {
  const IconComponent = iconMap[iconName] || Folder;
  return <IconComponent {...props} />;
};
