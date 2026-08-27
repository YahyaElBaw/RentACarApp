import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Animated,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Car,
  Users,
  CalendarDays,
  MonitorPlay,
  User as UserIcon,
  LayoutDashboard,
} from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const MAIN_BG = '#FFFFFF';
const ACCENT = '#4F39F6';
const INACTIVE = '#A9A3C3';

const BAR_H = 72;
const RADIUS = 28;
const BAR_BOTTOM = 16;
const SIDE_MARGIN = 16;

const PILL_W = 52;
const PILL_H = 34;
const PILL_R = 17;

const SPRING = {
  useNativeDriver: true,
  friction: 8,
  tension: 40,
} as const;

interface NavItem {
  name: string;
  icon: any;
}

/* ── Animated pill behind each tab icon ─────────────────────────── */
const TabPill = React.memo(function TabPill({
  icon: Icon,
  focused,
}: {
  icon: any;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconScale = useRef(new Animated.Value(focused ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { ...SPRING, toValue: focused ? 1 : 0 }),
      Animated.spring(iconScale, { ...SPRING, toValue: focused ? 1 : 0.85 }),
    ]).start();
  }, [focused]);

  return (
    <View style={s.tabWrap}>
      <Animated.View
        style={[
          s.pill,
          {
            opacity: scale,
            transform: [{ scale }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Icon
          size={22}
          color={focused ? 'white' : INACTIVE}
          strokeWidth={focused ? 2.2 : 2}
        />
      </Animated.View>
    </View>
  );
});

/* ── Main floating tab bar ──────────────────────────────────────── */
export default function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const user = useAuthStore((ts) => ts.user);
  const role = user?.role;

  const isSuperAdmin = role === 'super_admin';
  const isUserOrAdmin = role === 'user' || role === 'admin';

  const currentName = state.routes[state.index]?.name;

  const items: NavItem[] = [
    { name: 'fleet', icon: Car },
    { name: 'clients', icon: Users },
    { name: 'index', icon: LayoutDashboard },
    { name: 'calendar', icon: CalendarDays },
  ];
  if (isSuperAdmin) {
    items.push({ name: 'spectator', icon: MonitorPlay });
  } else if (isUserOrAdmin) {
    items.push({ name: 'profile', icon: UserIcon });
  }

  const count = items.length;
  const BAR_W = Math.min(SCREEN_W - SIDE_MARGIN * 2, 480);
  const slotW = BAR_W / count;
  const barTop = 0;
  const barLeft = (SCREEN_W - BAR_W) / 2;
  const containerH = BAR_H + BAR_BOTTOM + insets.bottom;

  const goTo = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    if (!route) return;
    const focused = currentName === name;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={[s.container, { height: containerH }]}>
      <View style={[s.bar, { left: barLeft, top: barTop, width: BAR_W }]} />

      {items.map((item, i) => (
        <TouchableOpacity
          key={item.name}
          onPress={() => goTo(item.name)}
          activeOpacity={0.6}
          accessibilityRole="tab"
          accessibilityState={{ selected: currentName === item.name }}
          style={{
            position: 'absolute',
            left: barLeft + i * slotW,
            top: barTop,
            width: slotW,
            height: BAR_H,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TabPill icon={item.icon} focused={currentName === item.name} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: MAIN_BG,
  },
  bar: {
    position: 'absolute',
    height: BAR_H,
    borderRadius: RADIUS,
    backgroundColor: MAIN_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  tabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_R,
    backgroundColor: ACCENT,
  },
});
