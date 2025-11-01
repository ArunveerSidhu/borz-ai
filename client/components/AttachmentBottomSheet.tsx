import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';

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
  onImageSelected?: (uri: string, type: 'camera' | 'photos') => void;
  onDocumentSelected?: (uri: string, name: string, mimeType?: string) => void;
}

export const AttachmentBottomSheet = forwardRef<BottomSheetModal, AttachmentBottomSheetProps>(
  ({ onOptionSelect, onImageSelected, onDocumentSelected }, ref) => {
    const snapPoints = ['25%'];

    const handleCamera = useCallback(async () => {
      try {
        // Request camera permissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Camera permission is required to take photos.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          onImageSelected?.(result.assets[0].uri, 'camera');
          // Close the bottom sheet
          if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.dismiss();
          }
        }
      } catch (error) {
        console.error('Camera error:', error);
        Alert.alert('Error', 'Failed to open camera');
      }
    }, [onImageSelected, ref]);

    const handlePhotos = useCallback(async () => {
      try {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Media library permission is required to access photos.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
          onImageSelected?.(result.assets[0].uri, 'photos');
          // Close the bottom sheet
          if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.dismiss();
          }
        }
      } catch (error) {
        console.error('Photo picker error:', error);
        Alert.alert('Error', 'Failed to open photo library');
      }
    }, [onImageSelected, ref]);

    const handleFiles = useCallback(async () => {
      try {
        // Launch document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          onDocumentSelected?.(asset.uri, asset.name, asset.mimeType);
          // Close the bottom sheet
          if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.dismiss();
          }
        }
      } catch (error) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to open document picker');
      }
    }, [onDocumentSelected, ref]);

    const handleOptionPress = useCallback((optionId: string) => {
      onOptionSelect?.(optionId);
      
      // Handle each option type
      switch (optionId) {
        case 'camera':
          handleCamera();
          break;
        case 'photos':
          handlePhotos();
          break;
        case 'files':
          handleFiles();
          break;
        default:
          // Close the bottom sheet for unknown options
          if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.dismiss();
          }
      }
    }, [onOptionSelect, handleCamera, handlePhotos, handleFiles, ref]);

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

