Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMzViMGI2YS05MGI4LTQ0YjgtYTEzMS00MGY4YjhmNzc5YTAiLCJpZCI6MzI5NjU4LCJpYXQiOjE3NTQ1NTUyMTJ9.hhMVPWwFZttUCOe2-z2iol-eQm_TF2eI5sBCuR1DqZw';

// Create Viewer with terrain
const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: true,
    geocoder: false,
    timeline: false,
    animation: false
});

// Fly to Hatfield Campus
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(28.2314, -25.7550, 300),
    orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35)
    }
});

// Load 3D Buildings with solid colors
Cesium.GeoJsonDataSource.load("Buildings_With_Heights.geojson").then((dataSource) => {
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    for (let entity of entities) {
        if (entity.polygon) {
            // Style the polygons with solid color
            entity.polygon.material = Cesium.Color.PINK; // Removed alpha transparency
            entity.polygon.outline = true;
            entity.polygon.outlineColor = Cesium.Color.BLACK;
            
            // Get height value from properties
            const height = entity.properties.Height?.getValue() || 
                          entity.properties.height?.getValue() || 
                          entity.properties.HEIGHT?.getValue() || 
                          10; // fallback height

            const heightInMeters = Number(height);
            
            entity.polygon.extrudedHeight = new Cesium.ConstantProperty(heightInMeters);
            entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
            entity.polygon.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
        }
    }
});

let pathDataSource = null;
let stallPathsVisible = false;

// Load paths with visibility control
Cesium.GeoJsonDataSource.load("paths.geojson").then((dataSource) => {
    pathDataSource = dataSource;
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    
    // Style all paths initially
    for (let entity of entities) {
        if (entity.polyline) {
            entity.polyline.material = Cesium.Color.CORNFLOWERBLUE;
            entity.polyline.width = 3;
            entity.polyline.clampToGround = true;
        }
    }

    // Set up all paths toggle
    const toggleButton = document.getElementById('togglePaths');
    toggleButton.addEventListener('click', () => {
        const isActive = toggleButton.classList.toggle('active');
        pathDataSource.show = isActive;
        
        // Reset stall paths when toggling all paths
        if (!isActive) {
            stallPathsVisible = false;
            document.getElementById('stallPaths').classList.remove('active');
            resetPathColors();
        }
    });

    // Set up stall connections toggle
    const stallPathsButton = document.getElementById('stallPaths');
    stallPathsButton.addEventListener('click', () => {
        stallPathsVisible = !stallPathsVisible;
        stallPathsButton.classList.toggle('active');
        
        if (stallPathsVisible) {
            highlightStallPaths();
        } else {
            resetPathColors();
        }
    });
});

function resetPathColors() {
    if (!pathDataSource) return;
    
    pathDataSource.entities.values.forEach(entity => {
        if (entity.polyline) {
            entity.polyline.material = Cesium.Color.CORNFLOWERBLUE;
            entity.polyline.width = 3;
        }
    });
}

function highlightStallPaths() {
    if (!pathDataSource) return;
    
    // Get food stall positions
    const foodStalls = viewer.entities.values.filter(entity => 
        entity.model && entity.model.uri?.getValue()?.includes('Market Stand.glb')
    );

    if (foodStalls.length < 2) return;

    // Find and highlight nearest paths to stalls
    foodStalls.forEach(stall => {
        const stallPos = stall.position.getValue();
        let nearestPath = null;
        let minDistance = Infinity;

        pathDataSource.entities.values.forEach(entity => {
            if (entity.polyline) {
                const pathPositions = entity.polyline.positions.getValue();
                pathPositions.forEach(pos => {
                    const distance = Cesium.Cartesian3.distance(stallPos, pos);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPath = entity;
                    }
                });
            }
        });

        if (nearestPath) {
            nearestPath.polyline.material = Cesium.Color.YELLOW;
            nearestPath.polyline.width = 5;
        }
    });
}

// Load remaining 2D layers as 3D models
const otherLayers = [
    "Compost_Bins.geojson",
    "Food_Stall.geojson"
];

for (const file of otherLayers) {
    Cesium.GeoJsonDataSource.load(file).then((dataSource) => {
        viewer.dataSources.add(dataSource);
        const entities = dataSource.entities.values;
        
        for (let entity of entities) {
            if (file === "Compost_Bins.geojson") {
                entity.billboard = undefined;
                entity.model = {
                    uri: './a_recyclecompost_bin..glb',
                    scale: 0.5,
                    minimumPixelSize: 16,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                };
                
                // Add bin properties
                entity.properties.addProperty('pickUpTimes', 'Monday, Wednesday, Friday: 08:00');
                entity.properties.addProperty('capacity', Math.floor(Math.random() * (500 - 200 + 1)) + 200 + ' kg');
                entity.properties.addProperty('currentFill', Math.floor(Math.random() * 100) + '%');
                entity.properties.addProperty('wasteType', 'Organic Waste - Vegetables');

            } else if (file === "Food_Stall.geojson") {
                entity.billboard = undefined;
                entity.model = {
                    uri: './Market Stand.glb',
                    scale: 1.0,
                    minimumPixelSize: 32,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                };
                
                // Add food stall properties
                entity.properties.addProperty('operatingHours', 'Mon-Fri: 07:00-18:00');
                entity.properties.addProperty('vegetableCapacity', Math.floor(Math.random() * (300 - 100 + 1)) + 100 + ' units');
                entity.properties.addProperty('availableVegetables', [
                    'Carrots',
                    'Tomatoes',
                    'Spinach',
                    'Potatoes',
                    'Cabbage'
                ].join(', '));
                entity.properties.addProperty('serviceType', 'Pick-up Only');
            }
        }
    });
}

// NOTE: removed the earlier duplicate click handler that redeclared `popup`
// Keep the robust click handler only (below)

// Add to main.js after viewer creation
viewer.scene.globe.enableLighting = true;
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true; // This will help debug performance issues

// Build footpath utilities and route code...
// (no changes here)

// Ensure popup element exists (single declaration)
const popup = document.getElementById('featurePopup');

// Track selection state
let selectedBuilding = null;
let previousMaterial = null;

// Click handler for feature information
viewer.screenSpaceEventHandler.setInputAction(function(click) {
    const pickedObject = viewer.scene.pick(click.position);
    const entity = pickedObject?.id;

    // Clear previous selection
    if (selectedBuilding && selectedBuilding.polygon) {
        selectedBuilding.polygon.material = previousMaterial || Cesium.Color.WHITE;
    }

    // Handle new selection
    if (Cesium.defined(entity)) {
        if (entity.polygon) {
            // Store current state
            selectedBuilding = entity;
            previousMaterial = entity.polygon.material;

            // Highlight building
            entity.polygon.material = Cesium.Color.CYAN;

            // Fly to building
            viewer.flyTo(entity, {
                duration: 1.2,
                offset: new Cesium.HeadingPitchRange(
                    0.0,
                    Cesium.Math.toRadians(-35),
                    150
                )
            });
        }

        // Show popup with entity information
        let content = '<div style="padding: 4px;">';
        content += '<h3 style="margin: 0 0 5px 0;">Feature Information</h3>';

        if (entity.properties) {
            const properties = entity.properties.getValue(Cesium.JulianDate.now());
            for (const key in properties) {
                // Only exclude Maxmax and Minimummin
                if (key !== 'Maxmax' && key !== 'Minimummin') {
                    content += `<strong>${key}:</strong> ${properties[key]}<br>`;
                }
            }
        }
        content += '</div>';

        popup.innerHTML = content;
        popup.style.display = 'block';
        popup.style.left = click.position.x + 10 + 'px';
        popup.style.top = click.position.y + 10 + 'px';
    } else {
        // Clear selection if clicking elsewhere
        selectedBuilding = null;
        previousMaterial = null;
        popup.style.display = 'none';
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Close popup when clicking elsewhere
viewer.screenSpaceEventHandler.setInputAction(() => {
    popup.style.display = 'none';
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

