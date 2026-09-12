import { Tabs } from "expo-router";
import { Platform } from "react-native";
import LucideIcon from "@react-native-vector-icons/lucide";
import { BlurView } from "expo-blur";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  const dark = scheme === "dark";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarStyle: {
          backgroundColor: Platform.OS === "web" ? colors.surfaceSecondary : dark ? "rgba(20,20,20,0.85)" : "rgba(255,255,255,0.88)",
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarBackground: Platform.OS === "web"
          ? undefined
          : () => (
              <BlurView tint={dark ? "dark" : "light"} intensity={40} style={{ flex: 1, backgroundColor: dark ? "rgba(10,10,10,0.7)" : "rgba(250,247,240,0.75)" }} />
            ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <LucideIcon name="house" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Menus",
          tabBarIcon: ({ color, size }) => <LucideIcon name="utensils" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, size }) => <LucideIcon name="shopping-basket" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Maison",
          tabBarIcon: ({ color, size }) => <LucideIcon name="refrigerator" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: "Suivi",
          tabBarIcon: ({ color, size }) => <LucideIcon name="chart-line" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
