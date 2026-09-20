import React, { useState } from 'react';
import { Button, Image, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraCapture({ onCapture }) {
	const [permission, requestPermission] = useCameraPermissions();
	const [open, setOpen] = useState(false);
	const [camera, setCamera] = useState(null);

	async function openCamera() {
		if (!permission?.granted) await requestPermission();
		setOpen(true);
	}

	async function capture() {
		const photo = await camera?.takePictureAsync({ quality: 0.6 });
		if (photo?.uri) onCapture(photo.uri);
		setOpen(false);
	}

	if (open) return <View style={styles.camera}><CameraView ref={setCamera} style={StyleSheet.absoluteFill} facing="back" /><Button title="Capture" onPress={capture} /></View>;
	return <Button title="Add receipt photo" onPress={openCamera} />;
}

const styles = StyleSheet.create({ camera: { height: 260, marginVertical: 12, justifyContent: 'flex-end' } });
