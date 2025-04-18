import * as THREE from 'three';

function createSplineFromKnots(knotGenerator, numKnots) {
    const xyz = new THREE.Vector3();
    const rgbList = [];
    const xyzList = [];

    const knots = knotGenerator(numKnots);
    const spline = new THREE.CatmullRomCurve3(knots);
    const divisions = Math.round(16 * knots.length);
    
    for (let i = 0; i < divisions; i++) {
        const t = i/divisions;
        spline.getPoint(t, xyz);
        xyzList.push(xyz.x, xyz.y, xyz.z);
        const color = new THREE.Color();
        color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
        rgbList.push(color.r, color.g, color.b);
    }

    return { spline, rgbList, xyzList };
}

function generateSpiralPoints(limit) {
    const points = [];
    for (let i = -limit; i < limit; i++) {
        const t = i / 3;
        points.push(new THREE.Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
    }
    return points;
} 

export { createSplineFromKnots, generateSpiralPoints };