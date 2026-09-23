import { MapContainer, Marker, Polyline, Popup, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../theme/tokens';

function pointForLocation(location) {
  if (!location) return null;
  if (location._latitude !== undefined) return [location._latitude, location._longitude];
  return [location.lat, location.lng];
}

export default function MapView({ pings = [], outlets = [], visitedOutletIds = [] }) {
  const routePoints = pings.map((ping) => [ping.lat, ping.lng]);
  const center = routePoints[0] || pointForLocation(outlets[0]?.location) || [-1.286389, 36.817223];

  return (
    <MapContainer center={center} zoom={14} style={{ height: 480, width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: colors.accent, weight: 4 }} />}
      {pings.length > 0 && <CircleMarker center={routePoints[routePoints.length - 1]} radius={8} pathOptions={{ color: colors.primary, fillColor: colors.primary, fillOpacity: 1 }}><Popup>Latest ping</Popup></CircleMarker>}
      {outlets.map((outlet) => {
        const position = pointForLocation(outlet.location);
        if (!position) return null;
        const visited = visitedOutletIds.includes(outlet.id);
        return <Marker key={outlet.id} position={position}><Popup>{outlet.name} - {visited ? 'Visited' : 'Missed'}</Popup></Marker>;
      })}
    </MapContainer>
  );
}
