import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

import { makeStyles, useTheme } from "@/src/theme";

const LOGO_DARK = require("../../assets/brand/logo.png");
const LOGO_LIGHT = require("../../assets/brand/logo-light.png");

const useStyles = makeStyles((colors) => ({
  wrap: { alignItems: "center", justifyContent: "center" },
  wordmark: { color: colors.onSurface, letterSpacing: 4, textTransform: "uppercase", fontWeight: "500", marginTop: 8 },
  tagline: { color: colors.warning, letterSpacing: 2.5, textTransform: "uppercase", fontSize: 10, marginTop: 4, fontWeight: "600" },
}));

/** Logo « La Diététique — Aurelia Isnardon ». Olive sur fond clair, crème sur fond sombre. */
export function BrandLogo({ size = 120, tagline = false, style }: { size?: number; tagline?: boolean; style?: any }) {
  const styles = useStyles();
  const { scheme } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {size > 0 && <Image source={scheme === "dark" ? LOGO_LIGHT : LOGO_DARK} style={{ width: size, height: size * 0.876 }} contentFit="contain" transition={200} accessibilityLabel="La Diététique — Aurelia Isnardon" />}
      {tagline && (
        <>
          <Text style={[styles.wordmark, { fontSize: Math.max(13, size * 0.09) }]}>Mon plan alimentaire</Text>
          <Text style={styles.tagline}>Aurelia Isnardon · depuis 2000</Text>
        </>
      )}
    </View>
  );
}
