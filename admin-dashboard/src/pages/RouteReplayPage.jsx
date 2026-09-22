import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import MapView from '../components/MapView';
import Card from '../components/Card';
import { downloadCsv, printReport } from '../utils/export';

const today = new Date().toISOString().slice(0, 10);

export default function RouteReplayPage() {
  const [date, setDate] = useState(today); const [repId, setRepId] = useState(''); const [reps, setReps] = useState([]); const [route, setRoute] = useState(null); const [outlets, setOutlets] = useState([]); const [position, setPosition] = useState(0); const [error, setError] = useState(null);
  useEffect(() => { client.get('/reps').then(({ data }) => { setReps(data.reps); if (data.reps[0]) setRepId(data.reps[0].id); }).catch(() => setError('Failed to load reps')); }, []);
  useEffect(() => { if (!repId) return; setError(null); Promise.all([client.get('/routes', { params: { date, repId } }), client.get('/outlets', { params: { repId } })]).then(([routeResponse, outletResponse]) => { const loadedRoute = routeResponse.data.route; setRoute(loadedRoute); setOutlets(outletResponse.data.outlets.filter((outlet) => loadedRoute.plannedOutletIds.includes(outlet.id))); setPosition(loadedRoute.pings.length ? loadedRoute.pings.length - 1 : 0); }).catch(() => setError('Failed to load route')); }, [date, repId]);
  const visiblePings = useMemo(() => route?.pings.slice(0, position + 1) || [], [route, position]);
  const missedCount = route ? route.plannedOutletIds.filter((id) => !route.visitedOutletIds.includes(id)).length : 0;
  const headers = ['#', 'Timestamp', 'Latitude', 'Longitude'];
  const rows = (route?.pings || []).map((ping, index) => [index + 1, ping.timestamp, ping.lat, ping.lng]);
  return <><div className="page-heading"><span className="eyebrow">FIELD INTELLIGENCE</span><h1>Route replay</h1><p className="muted">Review movement and outlet coverage by representative.</p>{route && <p><button className="ui-button ui-button-secondary" onClick={() => downloadCsv(`brandsphere-route-${repId}-${date}.csv`, headers, rows)}>Export CSV</button>{' '}<button className="ui-button ui-button-secondary" onClick={() => printReport(`Brandsphere route replay · ${date}`, headers, rows)}>Export PDF</button></p>}</div><Card><div className="grid-2"><div className="field"><label>Representative</label><select className="control" value={repId} onChange={(event) => setRepId(event.target.value)}><option value="">Select rep</option>{reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></div><div className="field"><label>Date</label><input className="control" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div></Card>{error && <div className="error-banner">{error}</div>}{route && <Card title={`${route.pings.length} pings · ${route.visitedOutletIds.length} visited · ${missedCount} missed`}><MapView pings={visiblePings} outlets={outlets} visitedOutletIds={route.visitedOutletIds} /><div className="field"><label>Replay position</label><input type="range" min="0" max={Math.max(route.pings.length - 1, 0)} value={position} onChange={(event) => setPosition(Number(event.target.value))} /></div>{visiblePings.at(-1) && <small className="muted">Latest visible ping: {new Date(visiblePings.at(-1).timestamp).toLocaleString()}</small>}</Card>}</>;
}
