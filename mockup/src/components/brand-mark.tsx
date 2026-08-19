import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cn } from '~/lib/cn';
import { brandGradient, palette } from '~/lib/theme';

/**
 * The Hamlet HQ mark — the same gable house as the launcher icon, so the
 * splash, the sign-in screen and the home-screen icon are visibly one thing.
 */
export function BrandMark({
  size = 72,
  radius = 24,
  className,
}: {
  size?: number;
  radius?: number;
  className?: string;
}) {
  const glyph = size * 0.56;

  return (
    <LinearGradient
      colors={[brandGradient[0], brandGradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius }}
      className={cn('items-center justify-center overflow-hidden', className)}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={glyph} height={glyph} viewBox="0 0 100 100">
          {/* Gable outline */}
          <Path d="M50 16 L86 46 L86 84 L14 84 L14 46 Z" fill={palette.white} />
          {/* Doorway, punched through to the lime behind */}
          {/* Mid-gradient, so the doorway reads as a hole rather than a patch. */}
          <Path d="M40 84 L40 63 A10 10 0 0 1 60 63 L60 84 Z" fill={brandGradient[1]} />
        </Svg>
      </View>
    </LinearGradient>
  );
}
