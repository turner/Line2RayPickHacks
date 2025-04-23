import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

class LineFactory {
    static createLine(xyzList, rgbList, options = {}) {
        const defaultOptions = {
            color: 0xffffff,
            linewidth: 1,
            worldUnits: true,
            vertexColors: true,
            alphaToCoverage: true,
            transparent: false,
            opacity: 1.0,
            depthTest: true,
            visible: true
        };

        const materialOptions = { ...defaultOptions, ...options };
        
        const lineMaterial = new LineMaterial(materialOptions);
        const lineGeometry = new LineGeometry();
        
        lineGeometry.setPositions(xyzList);
        if (rgbList) {
            lineGeometry.setColors(rgbList);
        }

        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances();
        line.scale.set(1, 1, 1);
        
        return line;
    }
} 

export default LineFactory;