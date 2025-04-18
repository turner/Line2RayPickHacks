import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { initGui } from './utils.js';
import './main.css'

const BACKGROUND_COLOR = 0xCACACA;

class SceneManager {
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
		this.raycaster = new THREE.Raycaster();
		this.setupRaycaster();
		
		this.color = new THREE.Color();
		
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

	setupRaycaster() {
		this.raycaster.params.Line2 = {};
		this.raycaster.params.Line2.threshold = 0;
	}

	setupScene() {
		const { spline, rgbList, xyzList } = this.createSplineFromKnots(this.generateSpiralPoints, 48);
		this.spline = spline;
		
		this.setupLines(xyzList, rgbList);
		this.setupIntersectionSpheres();
		this.setupGui();
	}

	setupLines(xyzList, rgbList) {
		// Setup main line
		this.lineMaterial = new LineMaterial({
			color: 0xffffff,
			linewidth: 1,
			worldUnits: true,
			vertexColors: true,
			alphaToCoverage: true,
		});

		const lineGeometry = new LineGeometry();
		lineGeometry.setPositions(xyzList);
		lineGeometry.setColors(rgbList);

		this.line = new Line2(lineGeometry, this.lineMaterial);
		this.line.computeLineDistances();
		this.line.scale.set(1, 1, 1);
		this.scene.add(this.line);

		// Setup threshold line
		this.setupThresholdLine(xyzList);
	}

	setupThresholdLine(xyzList) {
		this.thresholdLineMaterial = new LineMaterial({
			color: 0xffffff,
			linewidth: this.lineMaterial.linewidth,
			worldUnits: true,
			transparent: true,
			opacity: 0.2,
			depthTest: false,
			visible: false,
		});

		const thresholdLineGeometry = new LineGeometry();
		thresholdLineGeometry.setPositions(xyzList);
		this.thresholdLine = new Line2(thresholdLineGeometry, this.thresholdLineMaterial);
		this.thresholdLine.computeLineDistances();
		this.thresholdLine.scale.set(1, 1, 1);
		this.scene.add(this.thresholdLine);
	}

	setupIntersectionSpheres() {
		this.sphereInter = this.createSphere(0xff0000);
		this.sphereOnLine = this.createSphere(0x00ff00);
	}

	createSphere(color) {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.25, 8, 4),
			new THREE.MeshBasicMaterial({ color, depthTest: false })
		);
		sphere.visible = false;
		sphere.renderOrder = 10;
		this.scene.add(sphere);
		return sphere;
	}

	setupGui() {
		const guiParameters = {
			'world units': this.lineMaterial.worldUnits,
			'visualize threshold': this.thresholdLineMaterial.visible,
			'width': this.lineMaterial.linewidth,
			'alphaToCoverage': this.lineMaterial.alphaToCoverage,
			'threshold': this.raycaster.params.Line2.threshold
		};

		this.gui = initGui(guiParameters, this.lineMaterial, this.thresholdLineMaterial, this.raycaster);
	}

	setupEventListeners() {
		document.addEventListener('pointermove', (event) => this.onPointerMove(event));
		window.addEventListener('resize', () => this.onWindowResize());
	}

	animate() {
		// Update threshold line to match main line position
		this.thresholdLine.position.copy(this.line.position);
		this.thresholdLine.quaternion.copy(this.line.quaternion);

		this.raycaster.setFromCamera(this.pointer, this.camera);
		const lineIntersections = this.raycaster.intersectObject(this.line);

		if (lineIntersections.length > 0) {
			this.handleIntersection(lineIntersections[0]);
		} else {
			this.clearIntersectionFeedback();
		}

		this.renderer.render(this.scene, this.camera);
	}

	handleIntersection(intersection) {
		// Show feedback for threshold
		this.sphereInter.visible = true;
		this.sphereInter.position.copy(intersection.point);
		
		const index = intersection.faceIndex;
		const colors = this.line.geometry.getAttribute('instanceColorStart');
		this.color.fromBufferAttribute(colors, index);

		// Show feedback for line intersection
		this.sphereOnLine.visible = true;
		this.sphereOnLine.position.copy(intersection.pointOnLine);
		this.sphereOnLine.material.color.copy(this.color).offsetHSL(0.7, 0, 0);

		// Calculate parametric coordinate for the spiral
		const t = this.findClosestT(
			this.spline,
			intersection.pointOnLine,
			intersection.faceIndex,
			this.line.geometry.getAttribute('instanceStart').count
		);
		console.log('Segment index (t):', t);

		this.renderer.domElement.style.cursor = 'crosshair';
	}

	clearIntersectionFeedback() {
		this.sphereInter.visible = false;
		this.sphereOnLine.visible = false;
		this.renderer.domElement.style.cursor = '';
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	onPointerMove(event) {
		this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}

	createSplineFromKnots(knotGenerator, numKnots) {
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
			this.color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
			rgbList.push(this.color.r, this.color.g, this.color.b);
		}

		return { spline, rgbList, xyzList };
	}

	generateSpiralPoints(limit) {
		const points = [];
		for (let i = -limit; i < limit; i++) {
			const t = i / 3;
			points.push(new THREE.Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
		}
		return points;
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
	const sceneManager = new SceneManager(document.body);
});

