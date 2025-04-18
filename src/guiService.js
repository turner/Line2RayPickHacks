import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

function initGui(config, lineMaterial, thresholdLineMaterial, raycaster) {
    const gui = new GUI();

    gui.add(config, 'world units').onChange(function (val) {
        lineMaterial.worldUnits = val;
        lineMaterial.needsUpdate = true;
        thresholdLineMaterial.worldUnits = val;
        thresholdLineMaterial.needsUpdate = true;
    });

    gui.add(config, 'visualize threshold').onChange(function (val) {
        thresholdLineMaterial.visible = val;
    });

    gui.add(config, 'width', 1, 10).onChange(function (val) {
        lineMaterial.linewidth = val;
        thresholdLineMaterial.linewidth = lineMaterial.linewidth + raycaster.params.Line2.threshold;
    });

    gui.add(config, 'alphaToCoverage').onChange(function (val) {
        lineMaterial.alphaToCoverage = val;
    });

    gui.add(config, 'threshold', 0, 10).onChange(function (val) {
        raycaster.params.Line2.threshold = val;
        thresholdLineMaterial.linewidth = lineMaterial.linewidth + raycaster.params.Line2.threshold;
    });

    return gui;
} 

export { initGui }