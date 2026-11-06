import { Platform } from 'react-native';

export const brand = {
  name: 'MOVA$',
  orange: Platform.OS === 'web' ? '#C75B35' : '#F26A3A',
  orangeDark: Platform.OS === 'web' ? '#A84726' : '#B54220',
  orangeSoft: Platform.OS === 'web' ? '#F0E2D7' : '#FFF0E8',
  green: Platform.OS === 'web' ? '#586E58' : '#2E8B68',
  greenSoft: Platform.OS === 'web' ? '#E6EAE1' : '#EAF4EE',
  navy: Platform.OS === 'web' ? '#292D29' : '#454A4F',
  ink: Platform.OS === 'web' ? '#292B28' : '#41464B',
  muted: Platform.OS === 'web' ? '#656962' : '#6A7176',
  background: Platform.OS === 'web' ? '#F4F1E9' : '#F7F6F2',
  surface: Platform.OS === 'web' ? '#FAF8F2' : '#FFFFFF',
  border: Platform.OS === 'web' ? '#C9C5BA' : '#E5E3DE',
  success: Platform.OS === 'web' ? '#52634E' : '#276246',
  successSoft: Platform.OS === 'web' ? '#E5EBE0' : '#EAF4EE',
};

export const categories = [
  { name: 'Limpeza', icon: '🧹', color: '#F5D98F' },
  { name: 'Reparos', icon: '🛠️', color: '#A9D5D4' },
  { name: 'Elétrica', icon: '⚡', color: '#F4C66A' },
  { name: 'Pintura', icon: '🖌️', color: '#F0B8A8' },
  { name: 'Instalação', icon: '🔧', color: '#B4D8B1' },
  { name: 'Babá', icon: '🧸', color: '#D2C3E8' },
  { name: 'Automação', icon: '📡', color: '#AFCFE6' },
  { name: 'Outro', icon: '✦', color: '#E8C6A7' },
];

