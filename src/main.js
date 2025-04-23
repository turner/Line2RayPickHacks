import './main.css';
import { SceneManager } from './sceneManager.js';
import { initGui } from './guiService.js';

let sceneManager;
let gui;

document.addEventListener('DOMContentLoaded', () => {

	sceneManager = new SceneManager(document.body);
	gui = initGui({
		'world units': true,
		'visualize threshold': false,
		'width': 1,
		'alphaToCoverage': true,
		'threshold': 0
	}, sceneManager.line.material, sceneManager.thresholdLine.material, sceneManager.raycaster);
});
