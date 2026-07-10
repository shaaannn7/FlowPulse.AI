// Simulation Worker
// Handles real-time traffic physics and pathfinding to ensure 60fps UI rendering

export interface SimVehicle {
  id: number;
  type: 'car' | 'truck' | 'bus' | 'ambulance';
  x: number;
  y: number;
  speed: number;
  maxSpeed: number;
  routeIndex: number;
  segmentIndex: number;
  progress: number; // 0 to 1
  color: string;
  isSelected: boolean;
  waitingTime: number;
}

export interface SimNode {
  x: number;
  y: number;
  id?: string;
}

let vehicles: SimVehicle[] = [];
let routes: SimNode[][] = [];
let junctionPhases: Record<string, string> = {}; // e.g. { 'Junction Central': 'NORTH_SOUTH' }

// Intelligent Driver Model parameters
const MAX_ACCEL = 0.8; 
const MAX_BRAKE = 1.5; 
const SAFE_DIST = 0.05; // Segment progress distance
const TICK_RATE_MS = 33; // ~30 fps physics loop

function updatePhysics(dt: number) {
  // Sort vehicles by route, segment, and progress to easily find the vehicle ahead
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (a.routeIndex !== b.routeIndex) return a.routeIndex - b.routeIndex;
    if (a.segmentIndex !== b.segmentIndex) return b.segmentIndex - a.segmentIndex;
    return b.progress - a.progress;
  });

  for (let i = 0; i < sortedVehicles.length; i++) {
    const v = sortedVehicles[i];
    const route = routes[v.routeIndex];
    if (!route || v.segmentIndex >= route.length - 1) continue;

    const startNode = route[v.segmentIndex];
    const endNode = route[v.segmentIndex + 1];
    
    // Segment vector
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    // Find vehicle ahead
    let distAhead = Infinity;
    if (i > 0) {
      const vAhead = sortedVehicles[i - 1];
      if (vAhead.routeIndex === v.routeIndex && vAhead.segmentIndex === v.segmentIndex) {
        distAhead = vAhead.progress - v.progress;
      }
    }

    // Kinematics: IDM simplified
    let targetSpeed = v.maxSpeed;
    if (distAhead < SAFE_DIST) {
      targetSpeed = 0; // Brake to avoid collision
    }

    // Check Traffic Lights at end of segment
    // We assume if endNode is a junction, we check its phase
    if (v.progress > 0.85 && v.progress < 0.99) {
       if (endNode.id && junctionPhases[endNode.id]) {
         const phase = junctionPhases[endNode.id];
         // Simple heuristic: if vertical movement and phase is E-W, RED.
         const isVertical = Math.abs(dy) > Math.abs(dx);
         if (isVertical && phase === 'EAST_WEST') targetSpeed = 0;
         if (!isVertical && phase === 'NORTH_SOUTH') targetSpeed = 0;
       }
    }

    // Apply acceleration/braking
    if (v.speed < targetSpeed) {
      v.speed = Math.min(v.maxSpeed, v.speed + MAX_ACCEL * dt * 50);
    } else if (v.speed > targetSpeed) {
      v.speed = Math.max(0, v.speed - MAX_BRAKE * dt * 50);
    }

    if (v.speed < 0.5) {
      v.waitingTime += dt;
    } else {
      v.waitingTime = 0;
    }

    // Update position
    const progressSpeed = (v.speed / segmentLength) * dt; 
    v.progress += progressSpeed;

    // Move to next segment if reached end
    if (v.progress >= 1.0) {
      if (v.segmentIndex < route.length - 2) {
        v.segmentIndex++;
        v.progress = 0;
      } else {
        // Vehicle reached destination, loop
        v.segmentIndex = 0;
        v.progress = 0;
      }
    }

    // Compute exact X/Y for rendering
    v.x = startNode.x + dx * v.progress;
    v.y = startNode.y + dy * v.progress;
  }
}

// Main Simulation Loop
let interval: any = null;
let lastTime = performance.now();

function startSimulation() {
  if (interval) return;
  lastTime = performance.now();
  interval = setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    updatePhysics(dt);

    self.postMessage({ type: 'TICK', vehicles });
  }, TICK_RATE_MS);
}

function stopSimulation() {
  if (interval) clearInterval(interval);
  interval = null;
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  if (type === 'INIT') {
    vehicles = payload.vehicles || [];
    routes = payload.routes || [];
    startSimulation();
  } else if (type === 'UPDATE_PHASES') {
    junctionPhases = payload.phases || {};
  } else if (type === 'SPAWN_VEHICLE') {
    vehicles.push(payload.vehicle);
  } else if (type === 'STOP') {
    stopSimulation();
  }
};
