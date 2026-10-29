import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useStyles } from '../theme-context';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** `elevated` é o padrão do Liggo Kinetic: raio 24 + kinetic shadow. */
  variant?: 'elevated' | 'outline' | 'filled' | 'gray' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const s = useStyles(styles);

  const paddingStyle = {
    none: { padding: 0 },
    sm: { padding: Theme.spacing.stack },
    md: { padding: Theme.spacing.md },
    lg: { padding: Theme.spacing.lg },
  }[padding];

  return (
    <View style={[s.base, s[variant], paddingStyle, style]}>
      {children}
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  base: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    ...Theme.shadow.raised,
  },
  filled: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  gray: {
    backgroundColor: c.surfaceGray,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
  },
  dark: {
    backgroundColor: c.contrast,
    borderWidth: 0,
    ...Theme.shadow.raised,
  },
});
