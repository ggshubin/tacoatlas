// Custom Mapbox style in the TacoAtlas espresso palette.
// Deliberately minimal: land, water, parks, roads, boundaries, and place/road
// labels only — no POIs, no transit, no clutter. The map is a quiet canvas so
// amber pins carry the eye.
//
// Built against the mapbox-streets-v8 vector tileset; rendered via the
// `styleJSON` prop on MapboxGL.MapView (uses the global access token).

const palette = {
  land: '#201812',
  water: '#120E09',
  park: '#1E2013',
  building: '#281E15',
  roadMinor: '#2E2419',
  roadMid: '#382B1F',
  roadMajor: '#43331F',
  motorway: '#4F3A22',
  boundary: '#4A3A2B',
  labelPrimary: '#F5EDD8',
  labelSecondary: '#B8A898',
  labelRoad: '#8A7867',
  halo: '#18140F',
}

const name = ['coalesce', ['get', 'name_en'], ['get', 'name']]
const fonts = ['DIN Pro Medium', 'Arial Unicode MS Regular']

const style = {
  version: 8,
  name: 'TacoAtlas Espresso',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sources: {
    composite: {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': palette.land },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'composite',
      'source-layer': 'landuse',
      minzoom: 9,
      filter: ['match', ['get', 'class'], ['park', 'grass', 'pitch', 'cemetery'], true, false],
      paint: {
        'fill-color': palette.park,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 11, 1],
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'composite',
      'source-layer': 'water',
      paint: { 'fill-color': palette.water },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'composite',
      'source-layer': 'waterway',
      minzoom: 10,
      paint: {
        'line-color': palette.water,
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 0.5, 18, 5],
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'composite',
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-color': palette.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 0.9],
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 15,
      filter: ['match', ['get', 'class'], ['path', 'pedestrian', 'track'], true, false],
      paint: {
        'line-color': palette.roadMinor,
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 15, 0.5, 18, 3],
        'line-dasharray': [2, 1.5],
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 12,
      filter: ['match', ['get', 'class'], ['street', 'street_limited', 'service'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.roadMinor,
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 0.5, 14, 2, 18, 14],
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 10,
      filter: ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.roadMid,
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 0.6, 18, 20],
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 8,
      filter: ['match', ['get', 'class'], ['primary', 'trunk', 'trunk_link', 'primary_link'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.roadMajor,
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 0.75, 18, 26],
      },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 6,
      filter: ['match', ['get', 'class'], ['motorway', 'motorway_link'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.motorway,
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 6, 0.75, 18, 30],
      },
    },
    {
      id: 'admin-country',
      type: 'line',
      source: 'composite',
      'source-layer': 'admin',
      filter: [
        'all',
        ['==', ['get', 'admin_level'], 0],
        ['==', ['get', 'maritime'], 'false'],
        ['==', ['get', 'disputed'], 'false'],
      ],
      paint: {
        'line-color': palette.boundary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 10, 1.6],
      },
    },
    {
      id: 'admin-state',
      type: 'line',
      source: 'composite',
      'source-layer': 'admin',
      minzoom: 4,
      filter: ['all', ['==', ['get', 'admin_level'], 1], ['==', ['get', 'maritime'], 'false']],
      paint: {
        'line-color': palette.boundary,
        'line-width': 0.8,
        'line-dasharray': [3, 2],
        'line-opacity': 0.7,
      },
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 13,
      filter: [
        'match',
        ['get', 'class'],
        ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street'],
        true,
        false,
      ],
      layout: {
        'symbol-placement': 'line',
        'text-field': name,
        'text-font': fonts,
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 18, 13],
        'text-letter-spacing': 0.02,
      },
      paint: {
        'text-color': palette.labelRoad,
        'text-halo-color': palette.halo,
        'text-halo-width': 1,
      },
    },
    {
      id: 'place-neighborhood',
      type: 'symbol',
      source: 'composite',
      'source-layer': 'place_label',
      minzoom: 11,
      maxzoom: 16,
      filter: ['==', ['get', 'class'], 'settlement_subdivision'],
      layout: {
        'text-field': name,
        'text-font': fonts,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 13],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.15,
      },
      paint: {
        'text-color': palette.labelSecondary,
        'text-halo-color': palette.halo,
        'text-halo-width': 1.2,
        'text-opacity': 0.8,
      },
    },
    {
      id: 'place-settlement',
      type: 'symbol',
      source: 'composite',
      'source-layer': 'place_label',
      minzoom: 3,
      maxzoom: 15,
      filter: ['==', ['get', 'class'], 'settlement'],
      layout: {
        'text-field': name,
        'text-font': fonts,
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4,
          ['step', ['get', 'symbolrank'], 12, 9, 10],
          10,
          ['step', ['get', 'symbolrank'], 18, 9, 14],
        ],
      },
      paint: {
        'text-color': palette.labelPrimary,
        'text-halo-color': palette.halo,
        'text-halo-width': 1.2,
      },
    },
    {
      id: 'place-country',
      type: 'symbol',
      source: 'composite',
      'source-layer': 'place_label',
      minzoom: 1,
      maxzoom: 8,
      filter: ['==', ['get', 'class'], 'country'],
      layout: {
        'text-field': name,
        'text-font': fonts,
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 11, 6, 16],
        'text-letter-spacing': 0.1,
        'text-transform': 'uppercase',
      },
      paint: {
        'text-color': palette.labelSecondary,
        'text-halo-color': palette.halo,
        'text-halo-width': 1.2,
      },
    },
  ],
}

export const espressoMapStyleJSON = JSON.stringify(style)
