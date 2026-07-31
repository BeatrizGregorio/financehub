import {
  ShoppingCart,
  Home,
  Car,
  Zap,
  Utensils,
  Tv,
  HeartPulse,
  ShoppingBag,
  ArrowDownLeft,
  Briefcase,
  TrendingUp,
  Gift,
  Package,
  CreditCard,
  Banknote,
  Landmark,
  Coins,
  Building,
  Layers,
  Globe,
  Bitcoin,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  car: Car,
  zap: Zap,
  utensils: Utensils,
  tv: Tv,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  "arrow-down-left": ArrowDownLeft,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  gift: Gift,
  package: Package,
  "credit-card": CreditCard,
  banknote: Banknote,
  landmark: Landmark,
  coins: Coins,
  building: Building,
  layers: Layers,
  globe: Globe,
  bitcoin: Bitcoin,
  wallet: Wallet,
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = ICONS[name] ?? Package;
  return <Component size={size} className={className} />;
}
