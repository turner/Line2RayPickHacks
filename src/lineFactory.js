import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import * as THREE from "three"

class LineFactory {
    static createLine(spline, doRGBList, divisionsMultiplier, lineMaterialConfig) {

        const lineMaterial = new LineMaterial({ ...lineMaterialConfig });

        const divisions = Math.round(divisionsMultiplier * spline.points.length);
        // const divisions = 5;

        const xyz = new THREE.Vector3();
        const rgbList = [];
        const xyzList = [];

        for (let i = 0; i < 1 + divisions; i++) {
            const t = i/divisions;
            console.log(`t: ${t}`);
            spline.getPoint(t, xyz);
            xyzList.push(xyz.x, xyz.y, xyz.z);
            const color = new THREE.Color();
            color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
            if (true === doRGBList) {
                rgbList.push(color.r, color.g, color.b);
            }
        }

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList);

        if (true === doRGBList) {
            lineGeometry.setColors(rgbList);
        }

        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances();
        line.scale.set(1, 1, 1);

        return line;
    }
}

export default LineFactory;
