import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, Card, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

interface ReceiptUploadProps {
  receiptUrl?: string;
  onUpload: (uri: string, fileName: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  receiptUrl,
  onUpload,
  onDelete,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload receipts.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const fileName = `receipt_${Date.now()}.jpg`;
        onUpload(uri, fileName);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const fileName = `receipt_${Date.now()}.jpg`;
        onUpload(uri, fileName);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Receipt',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  if (receiptUrl) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.label}>
            Receipt
          </Text>
          <TouchableOpacity onPress={() => {/* TODO: Open full screen */}}>
            <Image
              source={{ uri: receiptUrl }}
              style={styles.receiptImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <Button
            mode="outlined"
            onPress={handleDelete}
            disabled={disabled}
            icon="delete"
            style={styles.deleteButton}
          >
            Remove Receipt
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="labelLarge" style={styles.label}>
          Receipt (Optional)
        </Text>
        <View style={styles.uploadContainer}>
          <IconButton
            icon="camera"
            size={48}
            iconColor="#666"
            style={styles.uploadIcon}
          />
          <Text variant="bodyMedium" style={styles.uploadText}>
            Add a receipt photo
          </Text>
          <Button
            mode="outlined"
            onPress={showUploadOptions}
            disabled={disabled || uploading}
            icon="upload"
            style={styles.uploadButton}
          >
            {uploading ? 'Uploading...' : 'Upload Receipt'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 12,
  },
  uploadContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  uploadIcon: {
    marginBottom: 8,
  },
  uploadText: {
    marginBottom: 16,
    color: '#666',
  },
  uploadButton: {
    minWidth: 200,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 8,
  },
});
