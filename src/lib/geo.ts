/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** O ponto está dentro do raio (geofence) da casa? Considera a precisão do GPS. */
export function insideGeofence(
  point: { lat: number; lng: number; accuracy?: number },
  venue: { lat: number; lng: number; geofence_m: number },
): { inside: boolean; distance: number } {
  const distance = distanceM(point.lat, point.lng, venue.lat, venue.lng);
  const tolerance = Math.min(point.accuracy ?? 0, 50); // aceita até 50 m de erro do GPS
  return { inside: distance <= venue.geofence_m + tolerance, distance: Math.round(distance) };
}
