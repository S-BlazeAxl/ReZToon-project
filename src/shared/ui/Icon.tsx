import {
    Feather, Globe, Rocket, Compass, PlayCircle, BookOpen,
    Music, Moon, Heart, PawPrint, Sparkles, Flame, Mic,
    Info, Search, TrendingUp, Clock, PenTool, LayoutDashboard,
    BookPlus, Library, BarChart3, DollarSign, Shield, Users,
    Flag, Activity, AlertTriangle, CheckCircle2, XCircle,
    Ban, Eye, Bell, MessageSquare, UserCheck, UserX, ShieldCheck,
    Plus,
    Receipt, Coins, BadgeCheck, Camera, Calendar, MapPin,
    Phone, Trash2, AtSign, Languages, Link as LinkIcon, Palette,
    LogOut, User as UserIcon, Mail, Lock, Settings, X, Send,
    ChevronLeft, Inbox, Upload, Image as ImageIcon, Check,
    Star, Trophy, Crown, Award, Swords, Home, Skull, Zap, Vote,
    Timer, CheckCircle, EyeOff, Volume2, VolumeX, Maximize, Minimize,
    Shuffle, Cpu, Database, Server, Wifi, WifiOff, Battery, BatteryCharging
} from 'lucide-react';

export const ICONS = {
    Feather, Globe, Rocket, Compass, PlayCircle, BookOpen,
    Music, Moon, Heart, PawPrint, Sparkles, Flame, Mic,
    Info, Search, TrendingUp, Clock, PenTool, LayoutDashboard,
    BookPlus, Library, BarChart3, DollarSign, Shield, Users,
    Flag, Activity, AlertTriangle, CheckCircle2, XCircle,
    Ban, Eye, Bell, MessageSquare, UserCheck, UserX, ShieldCheck,
    Plus,
    Receipt, Coins, BadgeCheck, Camera, Calendar, MapPin,
    Phone, Trash2, AtSign, Languages, LinkIcon, Palette,
    LogOut, UserIcon, Mail, Lock, Settings, X, Send,
    ChevronLeft, Inbox, Upload, ImageIcon, Check,
    Star, Trophy, Crown, Award, Swords, Home, Skull, Zap, Vote,
    Timer, CheckCircle, EyeOff, Volume2, VolumeX, Maximize, Minimize,
    Shuffle, Cpu, Database, Server, Wifi, WifiOff, Battery, BatteryCharging
} as const;

export type IconName = keyof typeof ICONS;

export function getIcon(name: string) {
    return ICONS[name as IconName] ?? BookOpen;
}