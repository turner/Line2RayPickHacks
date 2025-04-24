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
		
		this.pointer = new THREE.Vector2();
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
		this.setupIntersectionSpheres();
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

		// Setup threshold line
		this.thresholdLine = LineFactory.createLine(spline, false, 16, {
			color: 0xffffff,
			linewidth,
			worldUnits: true,
			transparent: true,
			opacity: 0.2,
			depthTest: false,
			visible: false
		});
		// this.scene.add(this.thresholdLine);
	}

	setupIntersectionSpheres() {
		// this.sphereInter = this.createSphere(0xff0000);
		// this.scene.add(this.sphereInter);

		this.sphereOnLine = this.createSphere(0x00ff00);
		this.scene.add(this.sphereOnLine);
	}

	createSphere(color) {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.25, 8, 4),
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
		// Update threshold line to match main line position
		this.thresholdLine.position.copy(this.line.position);
		this.thresholdLine.quaternion.copy(this.line.quaternion);

		const lineIntersections = this.raycastService.intersectObject(this.camera, this.line);

		if (lineIntersections.length > 0) {
			this.handleIntersection(lineIntersections[0]);
		} else {
			this.clearIntersectionFeedback();
		}

		this.renderer.render(this.scene, this.camera);
	}

	handleIntersection(intersection) {
		// Show feedback for threshold
		// this.sphereInter.visible = true;
		// this.sphereInter.position.copy(intersection.point);

		const { faceIndex, pointOnLine, object:line } = intersection;

		scratchColor.fromBufferAttribute(line.geometry.getAttribute('instanceColorStart'), faceIndex);

		// Show feedback for line intersection
		this.sphereOnLine.visible = true;
		this.sphereOnLine.position.copy(pointOnLine);
		this.sphereOnLine.material.color.copy(scratchColor).offsetHSL(0.7, 0, 0);

		// Calculate parametric coordinate for the spiral
		const t = this.findClosestT(this.spline, pointOnLine, faceIndex, line.geometry.getAttribute('instanceStart').count);
		console.log('Segment index (t):', t);

		this.renderer.domElement.style.cursor = 'crosshair';
	}

	clearIntersectionFeedback() {
		// this.sphereInter.visible = false;
		this.sphereOnLine.visible = false;
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
