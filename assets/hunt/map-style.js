// Mapbox style for /hunt, ported from the TacoAtlas app's espresso style
// (tacooatlas repo: src/utils/mapStyle.ts) so the web map reads as the same
// product. Same layers; the palette is a parameter so light mode gets a
// matching paper version. No POIs or transit: the pins carry the eye.

export const PALETTES = {
  dark: {
    land: '#201812', water: '#120E09', park: '#1E2013', building: '#281E15',
    roadMinor: '#2E2419', roadMid: '#382B1F', roadMajor: '#43331F', motorway: '#4F3A22',
    boundary: '#4A3A2B', labelPrimary: '#F5EDD8', labelSecondary: '#B8A898',
    labelRoad: '#8A7867', halo: '#18140F',
  },
  light: {
    land: '#EFE5D1', water: '#C9D3CC', park: '#DCE0C4', building: '#E4D7BF',
    roadMinor: '#FBF6EC', roadMid: '#FFFDF8', roadMajor: '#F2D9AE', motorway: '#E9C48A',
    boundary: '#B9A78C', labelPrimary: '#2A2015', labelSecondary: '#6B5C47',
    labelRoad: '#7D6C56', halo: '#F4ECDC',
  },
};

const name = ['coalesce', ['get', 'name_en'], ['get', 'name']];
const fonts = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
const classIn = (classes) => ['match', ['get', 'class'], classes, true, false];
const roadLine = (id, minzoom, classes, color, widths) => ({
  id, type: 'line', source: 'composite', 'source-layer': 'road', minzoom,
  filter: classIn(classes),
  layout: { 'line-cap': 'round', 'line-join': 'round' },
  paint: { 'line-color': color, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], ...widths] },
});
const label = (p, extra) => ({
  type: 'symbol', source: 'composite', ...extra,
  layout: { 'text-field': name, 'text-font': fonts, ...extra.layout },
  paint: { 'text-halo-color': p.halo, 'text-halo-width': 1.2, ...extra.paint },
});

export function buildStyle(p) {
  return {
    version: 8,
    name: 'TacoAtlas Hunt',
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    sources: { composite: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': p.land } },
      {
        id: 'park', type: 'fill', source: 'composite', 'source-layer': 'landuse', minzoom: 9,
        filter: classIn(['park', 'grass', 'pitch', 'cemetery']),
        paint: { 'fill-color': p.park, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 1] },
      },
      { id: 'water', type: 'fill', source: 'composite', 'source-layer': 'water', paint: { 'fill-color': p.water } },
      {
        id: 'waterway', type: 'line', source: 'composite', 'source-layer': 'waterway', minzoom: 10,
        paint: { 'line-color': p.water, 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 0.5, 18, 5] },
      },
      {
        id: 'building', type: 'fill', source: 'composite', 'source-layer': 'building', minzoom: 15,
        paint: { 'fill-color': p.building, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 0.9] },
      },
      roadLine('road-minor', 12, ['street', 'street_limited', 'service'], p.roadMinor, [12, 0.5, 14, 2, 18, 14]),
      roadLine('road-secondary', 10, ['secondary', 'tertiary'], p.roadMid, [10, 0.6, 18, 20]),
      roadLine('road-primary', 8, ['primary', 'trunk', 'trunk_link', 'primary_link'], p.roadMajor, [8, 0.75, 18, 26]),
      roadLine('road-motorway', 6, ['motorway', 'motorway_link'], p.motorway, [6, 0.75, 18, 30]),
      {
        id: 'admin-state', type: 'line', source: 'composite', 'source-layer': 'admin', minzoom: 4,
        filter: ['all', ['==', ['get', 'admin_level'], 1], ['==', ['get', 'maritime'], 'false']],
        paint: { 'line-color': p.boundary, 'line-width': 0.8, 'line-dasharray': [3, 2], 'line-opacity': 0.7 },
      },
      label(p, {
        id: 'road-label', 'source-layer': 'road', minzoom: 13,
        filter: classIn(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street']),
        layout: {
          'symbol-placement': 'line', 'text-letter-spacing': 0.02,
          'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 18, 13],
        },
        paint: { 'text-color': p.labelRoad, 'text-halo-width': 1 },
      }),
      label(p, {
        id: 'place-neighborhood', 'source-layer': 'place_label', minzoom: 11, maxzoom: 16,
        filter: ['==', ['get', 'class'], 'settlement_subdivision'],
        layout: {
          'text-transform': 'uppercase', 'text-letter-spacing': 0.15,
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 13],
        },
        paint: { 'text-color': p.labelSecondary, 'text-opacity': 0.8 },
      }),
      label(p, {
        id: 'place-settlement', 'source-layer': 'place_label', minzoom: 3, maxzoom: 15,
        filter: ['==', ['get', 'class'], 'settlement'],
        layout: {
          'text-size': ['interpolate', ['linear'], ['zoom'],
            4, ['step', ['get', 'symbolrank'], 12, 9, 10], 10, ['step', ['get', 'symbolrank'], 18, 9, 14]],
        },
        paint: { 'text-color': p.labelPrimary },
      }),
    ],
  };
}
