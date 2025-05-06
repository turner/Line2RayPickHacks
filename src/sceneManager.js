import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateSpiralPoints } from './utils.js';
import LineFactory from './lineFactory.js'
import RaycastService from './raycastService.js';

const BACKGROUND_COLOR = 0xCACACA;
const scratchColor = new THREE.Color();

export class SceneManager {
	constructor(container) {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(BACKGROUND_COLOR);

		this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
		this.camera.position.set(0, 0, 60);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.setupRenderer(container);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.setupControls();

		this.raycastService = new RaycastService();

		this.setupScene();
		this.setupEventListeners();
	}

	setupRenderer(container) {
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(this.scene.background, 1.0);
		this.renderer.setAnimationLoop(() => this.animate());
		container.appendChild(this.renderer.domElement);
	}

	setupControls() {
		this.controls.minDistance = 10;
		this.controls.maxDistance = 500;
	}

	setupScene() {
		const spline = new THREE.CatmullRomCurve3(generateSpiralPoints(32))
		this.spline = spline;

		this.setupLines(spline, 1/2);
		this.setupRaycastVisualFeedback();
	}

	setupLines(spline, linewidth) {
		// Set up hero line
		this.line = LineFactory.createLine(spline, true, 16, {
			color: 0xffffff,
			linewidth,
			worldUnits: true,
			vertexColors: true,
			alphaToCoverage: true
		});
		this.scene.add(this.line);

	}

	setupRaycastVisualFeedback() {

		this.raycastVisualFeedback = this.createRaycastVisualFeeback(0x00ff00);
		this.scene.add(this.raycastVisualFeedback);
	}

	createRaycastVisualFeeback(color) {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.25, 32, 16),
			new THREE.MeshBasicMaterial({ color, depthTest: false })
		);
		sphere.visible = false;
		sphere.renderOrder = 10;
		return sphere;
	}

	setupEventListeners() {
		window.addEventListener('resize', () => this.onWindowResize());
	}

	animate() {

		const lineIntersections = this.raycastService.intersectObject(this.camera, this.line);

		if (lineIntersections.length > 0) {
			this.handleIntersection(lineIntersections[0]);
		} else {
			this.clearIntersectionFeedback();
		}

		this.renderer.render(this.scene, this.camera);
	}

	handleIntersection(intersection) {

		const { faceIndex, pointOnLine, object:line } = intersection;

		scratchColor.fromBufferAttribute(line.geometry.getAttribute('instanceColorStart'), faceIndex);

		// Show feedback for line intersection
		this.raycastVisualFeedback.visible = true;
		this.raycastVisualFeedback.position.copy(pointOnLine);
		this.raycastVisualFeedback.material.color.copy(scratchColor).offsetHSL(0.7, 0, 0);

		// Calculate parametric coordinate for the spiral
		const t = this.findClosestT(this.spline, pointOnLine, faceIndex, line.geometry.getAttribute('instanceStart').count);
		console.log('Segment index (t):', t);

		this.renderer.domElement.style.cursor = 'crosshair';
	}

	clearIntersectionFeedback() {
		this.raycastVisualFeedback.visible = false;
		this.renderer.domElement.style.cursor = '';
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	findClosestT(spline, targetPoint, segmentIndex, totalSegments, tolerance = 0.0001) {
		// Convert segment index to parameter range
		const segmentSize = 1 / totalSegments;
		const left = segmentIndex * segmentSize;
		const right = (segmentIndex + 1) * segmentSize;

		// Do a local search within this segment
		let iterations = 0;
		const maxIterations = 16;
		let bestT = left;
		let bestDist = spline.getPoint(left).distanceTo(targetPoint);

		// Sample points within the segment to find closest
		const samples = 10;
		for (let i = 0; i <= samples; i++) {
			const t = left + (right - left) * (i / samples);
			const dist = spline.getPoint(t).distanceTo(targetPoint);

			if (dist < bestDist) {
				bestDist = dist;
				bestT = t;
			}
		}

		return bestT;
	}
}
