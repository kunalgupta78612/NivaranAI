import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { CITY } from '../lib/mockData'

// Free, token-less dark basemap. No billing key can expire mid-demo.
const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const FONT = ['Open Sans Bold', 'Arial Unicode MS Bold']

/* ------------------------------------------------------------------ */
/* Clustered incident map — the "clusters bloom" visual                */
/* ------------------------------------------------------------------ */
export function IncidentMap({ points = [], onSelect, className = '' }) {
  const holder = useRef(null)
  const map = useRef(null)
  const ready = useRef(false)

  const fc = {
    type: 'FeatureCollection',
    features: points.map((g) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
      properties: {
        id: g.id, priority: g.priority, harm: g.harmScore,
        cat: g.categoryLabel, ward: g.wardName, status: g.status
      }
    }))
  }

  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: holder.current,
      style: STYLE,
      center: CITY.center,
      zoom: CITY.zoom,
      attributionControl: false
    })
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.current.on('load', () => {
      map.current.addSource('grv', {
        type: 'geojson', data: fc, cluster: true, clusterRadius: 46, clusterMaxZoom: 15,
        clusterProperties: { maxHarm: ['max', ['get', 'harm']] }
      })

      map.current.addLayer({
        id: 'cluster-glow', type: 'circle', source: 'grv', filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'maxHarm'], '#4ADE80', 36, '#FACC15', 58, '#FB923C', 78, '#F43F5E'],
          'circle-opacity': 0.16,
          'circle-radius': ['step', ['get', 'point_count'], 26, 5, 34, 15, 46, 30, 60]
        }
      })
      map.current.addLayer({
        id: 'clusters', type: 'circle', source: 'grv', filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'maxHarm'], '#4ADE80', 36, '#FACC15', 58, '#FB923C', 78, '#F43F5E'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0B1017',
          'circle-radius': ['step', ['get', 'point_count'], 13, 5, 18, 15, 24, 30, 31]
        }
      })
      map.current.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'grv', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-font': FONT, 'text-size': 12 },
        paint: { 'text-color': '#070A0F' }
      })
      map.current.addLayer({
        id: 'pt', type: 'circle', source: 'grv', filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['match', ['get', 'priority'],
            'critical', '#F43F5E', 'high', '#FB923C', 'medium', '#FACC15', '#4ADE80'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'harm'], 0, 4, 100, 9],
          'circle-stroke-width': 1.4,
          'circle-stroke-color': '#0B1017'
        }
      })

      map.current.on('click', 'clusters', (e) => {
        const f = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        map.current.getSource('grv').getClusterExpansionZoom(f.properties.cluster_id).then((z) => {
          map.current.easeTo({ center: f.geometry.coordinates, zoom: z })
        })
      })
      map.current.on('click', 'pt', (e) => {
        const p = e.features[0].properties
        onSelect?.(p.id)
        new maplibregl.Popup({ closeButton: false, offset: 12 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<div style="font-weight:700">${p.cat}</div>
                    <div style="opacity:.7">${p.ward} · harm ${p.harm}</div>
                    <div style="opacity:.5;font-family:monospace;font-size:11px">${p.id}</div>`)
          .addTo(map.current)
      })
      for (const l of ['clusters', 'pt']) {
        map.current.on('mouseenter', l, () => (map.current.getCanvas().style.cursor = 'pointer'))
        map.current.on('mouseleave', l, () => (map.current.getCanvas().style.cursor = ''))
      }
      ready.current = true
    })

    return () => { map.current?.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!map.current || !ready.current) return
    const src = map.current.getSource('grv')
    if (src) src.setData(fc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  return <div ref={holder} className={className} />
}

/* ------------------------------------------------------------------ */
/* Ward map — bubbles sized by reporting gap (Silence Detector)        */
/* ------------------------------------------------------------------ */
export function WardMap({ wards = [], onSelect, className = '' }) {
  const holder = useRef(null)
  const map = useRef(null)
  const ready = useRef(false)

  const fc = {
    type: 'FeatureCollection',
    features: wards.map((w) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: w.center },
      properties: {
        id: w.id, name: w.name, gap: w.gap, gapPct: w.gapPct,
        actual: w.actual, expected: w.expected, status: w.status
      }
    }))
  }

  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: holder.current, style: STYLE,
      center: CITY.center, zoom: 11.1, attributionControl: false
    })
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.current.on('load', () => {
      map.current.addSource('wards', { type: 'geojson', data: fc })

      map.current.addLayer({
        id: 'ward-halo', type: 'circle', source: 'wards',
        paint: {
          'circle-color': ['case', ['>', ['get', 'gap'], 0.45], '#F43F5E',
                                   ['>', ['get', 'gap'], 0.18], '#FB923C',
                                   ['<', ['get', 'gap'], -0.2], '#22D3EE', '#4ADE80'],
          'circle-opacity': 0.14,
          'circle-radius': ['interpolate', ['linear'], ['abs', ['get', 'gap']], 0, 16, 1, 58]
        }
      })
      map.current.addLayer({
        id: 'ward-dot', type: 'circle', source: 'wards',
        paint: {
          'circle-color': ['case', ['>', ['get', 'gap'], 0.45], '#F43F5E',
                                   ['>', ['get', 'gap'], 0.18], '#FB923C',
                                   ['<', ['get', 'gap'], -0.2], '#22D3EE', '#4ADE80'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5, 'circle-stroke-color': '#0B1017',
          'circle-radius': ['interpolate', ['linear'], ['abs', ['get', 'gap']], 0, 6, 1, 22]
        }
      })
      map.current.addLayer({
        id: 'ward-label', type: 'symbol', source: 'wards',
        layout: {
          'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11,
          'text-offset': [0, 1.9], 'text-anchor': 'top'
        },
        paint: { 'text-color': '#94A3B8', 'text-halo-color': '#070A0F', 'text-halo-width': 1.4 }
      })

      map.current.on('click', 'ward-dot', (e) => {
        const p = e.features[0].properties
        onSelect?.(p.id)
        new maplibregl.Popup({ closeButton: false, offset: 14 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<div style="font-weight:700">${p.name}</div>
                    <div style="opacity:.75">expected ${p.expected} · filed ${p.actual}</div>
                    <div style="color:${p.gap > 0.45 ? '#F43F5E' : '#FB923C'};font-weight:700">
                      ${p.gapPct}% under-reported</div>`)
          .addTo(map.current)
      })
      map.current.on('mouseenter', 'ward-dot', () => (map.current.getCanvas().style.cursor = 'pointer'))
      map.current.on('mouseleave', 'ward-dot', () => (map.current.getCanvas().style.cursor = ''))
      ready.current = true
    })

    return () => { map.current?.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!map.current || !ready.current) return
    const src = map.current.getSource('wards')
    if (src) src.setData(fc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards])

  return <div ref={holder} className={className} />
}
