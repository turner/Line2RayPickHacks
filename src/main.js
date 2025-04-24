import { SceneManager } from './sceneManager.js';
import { initGui } from './guiService.js';
import './main.css';

let sceneManager;
let gui;

document.addEventListener('DOMContentLoaded', () => {

	sceneManager = new SceneManager(document.body);

	const {line, thresholdLine, raycastService} = sceneManager;

	const config = 
	{
		'world units': true,
		'visualize threshold': false,
		'width': 1,
		'alphaToCoverage': true,
		'threshold': 0
	}
	gui = initGui(config, line.material, thresholdLine.material, raycastService.raycaster);
});
