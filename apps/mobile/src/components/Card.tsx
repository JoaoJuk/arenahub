import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outline' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'filled',
  padding = 'md',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: Theme.colors.surface,
          borderWidth: 1,
          borderColor: Theme.colors.surfaceHighlight,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Theme.colors.border,
        };
      case 'elevated':
        return {
          backgroundColor: Theme.colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 3, // Android
          borderWidth: 1,
          borderColor: Theme.colors.border,
        };
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none': return { padding: 0 };
      case 'sm': return { padding: Theme.spacing.sm };
      case 'md': return { padding: Theme.spacing.md };
      case 'lg': return { padding: Theme.spacing.lg };
    }
  };

  return (
    <View style={[styles.base, getVariantStyles(), getPaddingStyles(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
  },
});
