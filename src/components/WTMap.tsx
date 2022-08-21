import L, { LatLng } from 'leaflet'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet'
const center = {
    lat: 51.505,
    lng: -0.09,
}

function haversine(lat1: number, lat2: number, lon1: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres

    return d;
}

function brng(φ1: number, φ2: number, λ1: number, λ2: number) {
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    const brng = (θ * 180 / Math.PI + 360) % 360; // in degrees

    return brng;
}


function DraggableMarker(props: { defaultPosition: L.LatLng, defaultParent: L.LatLng | null, defaultIndex: number, handleDrag: any }) {
    const { defaultPosition, defaultParent, defaultIndex, handleDrag } = props
    const [draggable, setDraggable] = useState(false)
    const markerRef = useRef<L.Marker>(null)
    const eventHandlers = useMemo(
        () => ({
            drag() {
                const marker = markerRef.current
                if (marker != null) {
                    handleDrag({
                        i: defaultIndex,
                        latlng: marker.getLatLng()
                    })
                }
            },
        }),
        [],
    )
    const toggleDraggable = useCallback(() => {
        setDraggable((d) => !d)
    }, [])

    return (
        <Marker
            draggable={draggable}
            eventHandlers={eventHandlers}
            position={defaultPosition}
            ref={markerRef}>
            <Popup minWidth={90}>
                <span onClick={toggleDraggable}>
                    {draggable
                        ? 'Marker is draggable'
                        : 'Click here to make marker draggable'}
                </span>
            </Popup>
            {defaultParent
                ? <Tooltip direction='center' permanent>
                    {Math.round(haversine(defaultParent.lat, defaultPosition.lat, defaultParent.lng, defaultPosition.lng))} m
                    <br />
                    {Math.round(brng(defaultParent.lat, defaultPosition.lat, defaultParent.lng, defaultPosition.lng))}°
                    {/* TODO: possible cohesiveness problem here; refactor this code somewhere else*/}
                </Tooltip>
                : null}

        </Marker>
    )
}


function PolylineMarkerContainer(props: { defaultPositions: LatLng[] }) {
    const { defaultPositions } = props
    const [positions, setPositions] = useState(defaultPositions)

    function handleDrag(e: { i: number, latlng: LatLng }) {
        const { i, latlng } = e
        setPositions(p => p.map((value, index) => index === i ? latlng : value))
    }

    useMapEvents({
        click: (e) => {
            setPositions((prev) => [...prev, e.latlng])
        },
        contextmenu: () => {
            const newPositions = [...positions]
            newPositions.pop()
            setPositions(newPositions)
        }
    })

    useEffect(() => {
        setPositions(defaultPositions)
    }, [defaultPositions])

    return (
        <React.Fragment>
            {positions.map((value, index) =>
                <DraggableMarker defaultPosition={positions[index]} defaultParent={positions[(index - 1)]} defaultIndex={index} handleDrag={handleDrag} key={index}></DraggableMarker>
            )}
            <Polyline positions={positions}></Polyline>
        </React.Fragment>
    )
}

function WTMap() {

    return (
        <MapContainer center={center} zoom={13} scrollWheelZoom={true}>
            <PolylineMarkerContainer defaultPositions={[]} />
        </MapContainer>
    )
}

export default WTMap