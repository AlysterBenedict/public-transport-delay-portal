const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Mock Routes Data (Simulating Transitland output)
const ROUTES = [
    {
        id: 'R1',
        name: 'Panaji - Mapusa',
        color: '#3B82F6',
        path: [
            [15.4909, 73.8278], [15.5100, 73.8250], [15.5300, 73.8200], 
            [15.5500, 73.8180], [15.5700, 73.8150], [15.5925, 73.8125]
        ]
    },
    {
        id: 'R2',
        name: 'Panaji - Margao',
        color: '#EF4444',
        path: [
            [15.4909, 73.8278], [15.4500, 73.8500], [15.4000, 73.9000], 
            [15.3500, 73.9400], [15.3200, 73.9700], [15.2832, 73.9862]
        ]
    },
    {
        id: 'R3',
        name: 'Panaji - Vasco',
        color: '#10B981',
        path: [
            [15.4909, 73.8278], [15.4700, 73.8100], [15.4500, 73.8000], 
            [15.4200, 73.7900], [15.4000, 73.7950], [15.3956, 73.8058]
        ]
    }
];

// Simulation State
let buses = [];

// Initialize 50 buses
function initBuses() {
    for (let i = 0; i < 50; i++) {
        const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
        const progress = Math.random(); // 0 to 1 along the route
        buses.push({
            bus_id: `BUS${100 + i}`,
            route_id: route.id,
            route_name: route.name,
            color: route.color,
            progress: progress,
            direction: Math.random() > 0.5 ? 1 : -1,
            speed: 20 + Math.random() * 30, // km/h
            delay_minutes: Math.floor(Math.random() * 15),
            next_stop: 'Calculating...',
            lat: 0,
            lon: 0
        });
    }
}

// Linear interpolation between two points
function interpolate(p1, p2, t) {
    return [
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t
    ];
}

// Update bus positions
function updatePositions() {
    buses.forEach(bus => {
        const route = ROUTES.find(r => r.id === bus.route_id);
        const path = route.path;
        
        // Update progress
        const moveStep = 0.005; // Adjust for speed
        bus.progress += moveStep * bus.direction;

        // reverse direction if end reached
        if (bus.progress >= 1) {
            bus.progress = 1;
            bus.direction = -1;
        } else if (bus.progress <= 0) {
            bus.progress = 0;
            bus.direction = 1;
        }

        // Calculate lat/lon based on progress
        const totalSegments = path.length - 1;
        const segmentProgress = bus.progress * totalSegments;
        const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
        const localT = segmentProgress - segmentIndex;

        const [lat, lon] = interpolate(path[segmentIndex], path[segmentIndex + 1], localT);
        bus.lat = lat;
        bus.lon = lon;
        
        // Update next stop (mocked)
        bus.next_stop = bus.direction > 0 ? route.path[path.length - 1].join(',') : route.path[0].join(',');
    });
}

initBuses();
setInterval(updatePositions, 3000); // Update every 3 seconds

// API Endpoints
app.get('/api/live-buses', (req, res) => {
    res.json(buses.map(b => ({
        bus_id: b.bus_id,
        route: b.route_name,
        lat: b.lat,
        lon: b.lon,
        speed: Math.round(b.speed),
        delay: b.delay_minutes,
        next_stop: b.next_stop,
        color: b.color
    })));
});

app.get('/api/routes', (req, res) => {
    res.json(ROUTES);
});

app.listen(PORT, () => {
    console.log(`Simulation server running on http://localhost:${PORT}`);
});
