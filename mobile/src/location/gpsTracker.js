import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueuePing } from '../offline/gpsQueue';
import { getDb, initDb } from '../offline/db';

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
	if (background.status !== 'granted') throw new Error('Background location is required. In Android Settings, choose “Allow all the time” for this app, then start the shift again.');
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
	const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
	enqueuePing({ lat: current.coords.latitude, lng: current.coords.longitude, timestamp: new Date(current.timestamp).toISOString() });
	initDb();
	getDb().runSync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('shiftStartedAt', ?);", [new Date().toISOString()]);
}

export function isRouteTrackingActive() {
	return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function stopRouteTracking() {
	if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
		await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
	}
	initDb();
	getDb().runSync("DELETE FROM app_settings WHERE key = 'shiftStartedAt';");
}
