import * as THREE from 'three';

function generateSpiralPoints(limit) {
    const points = [];
    for (let i = -limit; i < limit; i++) {
        const t = i / 3;
        points.push(new THREE.Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
    }
    return points;
}

export { generateSpiralPoints };
