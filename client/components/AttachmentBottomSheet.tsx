import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';

interface AttachmentOption {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
}

const attachmentOptions: AttachmentOption[] = [
  {
    id: 'camera',
    title: 'Camera',
    icon: 'camera',
    iconColor: '#8b5cf6', // violet-500
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'photos',
    title: 'Photos',
    icon: 'images',
    iconColor: '#ec4899', // pink-500
    bgColor: 'bg-pink-500/10',
  },
  {
    id: 'files',
    title: 'Files',
    icon: 'document',
    iconColor: '#06b6d4', // cyan-500
    bgColor: 'bg-cyan-500/10',
  },
];

interface AttachmentBottomSheetProps {
  onOptionSelect?: (optionId: string) => void;
}

export const AttachmentBottomSheet = forwardRef<BottomSheetModal, AttachmentBottomSheetProps>(
  ({ onOptionSelect }, ref) => {
    const snapPoints = ['25%'];

    const handleOptionPress = useCallback((optionId: string) => {
      onOptionSelect?.(optionId);
      // Close the bottom sheet
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
    }, [onOptionSelect, ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#18181b' }}
        handleIndicatorStyle={{ backgroundColor: '#52525b', width: 40 }}
      >
        <BottomSheetView className="flex-1 px-5 pt-2.5">
          <Text className="text-white text-xl font-semibold mb-6">
            Add Attachment
          </Text>
          
          <View className="flex-row justify-around gap-4">
            {attachmentOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                className="flex-1 items-center gap-3"
                onPress={() => handleOptionPress(option.id)}
                activeOpacity={0.7}
              >
                <View className={`w-16 h-16 rounded-2xl items-center justify-center ${option.bgColor}`}>
                  <Ionicons name={option.icon} size={28} color={option.iconColor} />
                </View>
                <Text className="text-zinc-200 text-sm font-medium">
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

AttachmentBottomSheet.displayName = 'AttachmentBottomSheet';

