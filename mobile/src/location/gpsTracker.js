import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueuePing } from '../offline/gpsQueue';

export const LOCATION_TASK_NAME = 'merchandiser-route-location';
export const LOCATION_INTERVAL_MS = 3 * 60 * 1000;

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
	if (error || !data?.locations) return;
	for (const location of data.locations) {
		const { latitude, longitude } = location.coords;
		enqueuePing({ lat: latitude, lng: longitude, timestamp: new Date(location.timestamp).toISOString() });
	}
});

export async function startRouteTracking() {
	const foreground = await Location.requestForegroundPermissionsAsync();
	if (foreground.status !== 'granted') throw new Error('Location permission is required to track a route');
	const background = await Location.requestBackgroundPermissionsAsync();
	if (background.status !== 'granted') throw new Error('Background location permission is required during an active shift');
	const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
	if (!alreadyStarted) {
		await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
			accuracy: Location.Accuracy.Balanced,
			timeInterval: LOCATION_INTERVAL_MS,
			distanceInterval: 100,
			pausesUpdatesAutomatically: true,
			showsBackgroundLocationIndicator: true,
		});
	}
}

export async function stopRouteTracking() {
	if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
		await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
	}
}
