import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { IconButton } from './button';
import { Text } from './text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  icon,
  className,
  containerClassName,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {!!label && (
        <Text variant="subheading" className="text-[13px]">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center gap-2.5 rounded-2xl border bg-background px-4',
          props.multiline ? 'min-h-[110px] py-3' : 'h-13 py-0',
          focused ? 'border-accent-foreground' : 'border-input',
          error && 'border-destructive',
        )}
        style={props.multiline ? undefined : { height: 52 }}>
        {!!icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? palette.brandInk : palette.mutedForeground}
          />
        )}
        <TextInput
          className={cn(
            'flex-1 text-[15px] leading-[20px] text-foreground',
            props.multiline && 'h-full',
            className,
          )}
          placeholderTextColor={palette.mutedForeground}
          textAlignVertical={props.multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {!!error && (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      )}
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search',
  className,
  ...props
}: TextInputProps) {
  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-2.5 rounded-2xl border border-border bg-muted px-4',
        className,
      )}>
      <Ionicons name="search" size={18} color={palette.mutedForeground} />
      <TextInput
        className="flex-1 text-[15px] text-foreground"
        placeholder={placeholder}
        placeholderTextColor={palette.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
        {...props}
      />
      {!!value && (
        <IconButton
          icon="close-circle"
          label="Clear search"
          tone="muted"
          className="h-6 w-6"
          onPress={() => onChangeText?.('')}
        />
      )}
    </View>
  );
}
