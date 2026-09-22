import { PropsWithChildren } from 'react';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function HapticTab({ children, onPress, ...props }: PropsWithChildren<{ onPress?: () => void }>) {
  return (
    <PlatformPressable
      {...props}
      onPress={(event) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
    >
      {children}
    </PlatformPressable>
  );
}
