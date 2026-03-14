// Initialize Map
const map = L.map('map', {
    zoomControl: false
}).setView([15.4909, 73.8278], 11); // Center on Panaji, Goa

// Add Dark Matter tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Move zoom control to bottom right
L.control.zoom({ position: 'bottomright' }).addTo(map);

let markers = {};
let routePolylines = [];
const API_URL = `${window.location.origin}/api`;

// Fetch routes and draw them
async function initRoutes() {
    try {
        const response = await fetch(`${API_URL}/routes`);
        const routes = await response.json();
        
        routes.forEach(route => {
            const polyline = L.polyline(route.path, {
                color: route.color,
                weight: 4,
                opacity: 0.3,
                dashArray: '10, 10'
            }).addTo(map);
            routePolylines.push({ id: route.id, line: polyline });
        });
    } catch (error) {
        console.error('Error fetching routes:', error);
    }
}

// Fetch live buses and update markers
async function updateBuses() {
    try {
        const response = await fetch(`${API_URL}/live-buses`);
        const buses = await response.json();
        
        const activeBusesEl = document.getElementById('active-buses');
        const avgDelayEl = document.getElementById('avg-delay');
        
        let totalDelay = 0;
        
        buses.forEach(bus => {
            totalDelay += bus.delay;
            
            if (markers[bus.bus_id]) {
                // Smoothly update position
                markers[bus.bus_id].setLatLng([bus.lat, bus.lon]);
                // Update popup content if open
                if (markers[bus.bus_id].getPopup() && markers[bus.bus_id].isPopupOpen()) {
                    markers[bus.bus_id].setPopupContent(getPopupContent(bus));
                }
            } else {
                // Create new marker
                const icon = L.divIcon({
                    className: 'custom-bus-icon',
                    html: `<div class="bus-marker" style="background: ${bus.color || '#3b82f6'}; width: 30px; height: 30px;">🚌</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                const marker = L.marker([bus.lat, bus.lon], { icon: icon })
                    .bindPopup(getPopupContent(bus), { className: 'bus-popup' })
                    .addTo(map);
                
                marker.on('click', () => showBusDetails(bus));
                markers[bus.bus_id] = marker;
            }
        });
        
        if (activeBusesEl) activeBusesEl.innerText = buses.length;
        if (avgDelayEl) avgDelayEl.innerText = `${Math.round(totalDelay / buses.length)}m`;
        
    } catch (error) {
        console.error('Error fetching live buses:', error);
    }
}

function getPopupContent(bus) {
    return `
        <div style="padding: 10px;">
            <strong style="color: #3b82f6; font-size: 16px;">${bus.bus_id}</strong><br>
            <span style="font-size: 12px; color: #94a3b8;">Route: ${bus.route}</span><hr style="border: 0; border-top: 1px solid #334155; margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; gap: 20px;">
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Speed</span><br>
                    <strong>${bus.speed} km/h</strong>
                </div>
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Delay</span><br>
                    <strong style="color: ${bus.delay > 5 ? '#ef4444' : '#10b981'}">${bus.delay} min</strong>
                </div>
            </div>
        </div>
    `;
}

function showBusDetails(bus) {
    const detailsEl = document.getElementById('bus-details');
    detailsEl.style.display = 'block';
    detailsEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div style="font-size: 12px; color: #3b82f6; font-weight: 700;">BUS INFO</div>
                <div style="font-size: 20px; font-weight: 800; font-family: 'Syne', sans-serif;">${bus.bus_id}</div>
            </div>
            <button onclick="document.getElementById('bus-details').style.display='none'" style="background: none; border: none; color: #64748b; font-size: 20px; cursor: pointer;">×</button>
        </div>
        <div style="margin-top: 15px; grid-template-columns: 1fr 1fr; display: grid; gap: 15px;">
            <div>
                <div class="stat-label">Current Route</div>
                <div style="font-size: 14px; font-weight: 600;">${bus.route}</div>
            </div>
            <div>
                <div class="stat-label">Next Stop</div>
                <div style="font-size: 14px; font-weight: 600;">${bus.next_stop}</div>
            </div>
            <div>
                <div class="stat-label">ETA Next Stop</div>
                <div style="font-size: 14px; font-weight: 600; color: #10b981;">3 mins</div>
            </div>
            <div>
                <div class="stat-label">Status</div>
                <div style="font-size: 14px; font-weight: 600; color: ${bus.delay > 5 ? '#ef4444' : '#10b981'};">
                    ${bus.delay > 0 ? 'Delayed' : 'On Time'}
                </div>
            </div>
        </div>
    `;
}

window.filterMarkers = function() {
    const query = document.getElementById('bus-search').value.toLowerCase();
    Object.keys(markers).forEach(id => {
        const marker = markers[id];
        // We'd need to store bus data to filter properly, but for now we'll just check ID
        if (id.toLowerCase().includes(query)) {
            marker.getElement().style.display = '';
        } else {
            marker.getElement().style.display = 'none';
        }
    });
}

// Initial calls
initRoutes();
updateBuses();

// Poll for updates every 3 seconds
setInterval(updateBuses, 3000);
