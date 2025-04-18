import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { initGui } from './utils.js';
import './main.css'

let gui
let camera;
let scene;
let renderer;
let line;
let thresholdLine;
let sphereInter;
let sphereOnLine;
let spline;
let controls;
let raycaster
let lineMaterial
let thresholdLineMaterial
let guiParameters

const pointer = new THREE.Vector2();

const color = new THREE.Color();

const BACKGROUND_COLOR = 0xCACACA;

document.addEventListener('DOMContentLoaded', () => initializeApp(document.getElementById('container')))

function initializeApp(container) {

	scene = new THREE.Scene();
	scene.background = new THREE.Color(BACKGROUND_COLOR);

	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( scene.background, 1.0 );
	renderer.setAnimationLoop( animate );
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 0, 0, 60 );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 10;
	controls.maxDistance = 500;

	sphereInter = new THREE.Mesh( new THREE.SphereGeometry( 0.25, 8, 4 ), new THREE.MeshBasicMaterial( { color: 0x003153, depthTest: false } ) );
	sphereInter.visible = false;
	sphereInter.renderOrder = 10;
	scene.add( sphereInter );

	sphereOnLine = new THREE.Mesh( new THREE.SphereGeometry( 0.25, 8, 4 ), new THREE.MeshBasicMaterial( { color: 0x00ff00, depthTest: false } ) );
	sphereOnLine.visible = false;
	sphereOnLine.renderOrder = 10;
	scene.add( sphereOnLine );

	const xyz = new THREE.Vector3();
	const rgbList = [];
	const xyzList = [];

	// Generate spiral points
	const knots = generateSpiralPoints( 48 );
	spline = new THREE.CatmullRomCurve3( knots );
	const divisions = Math.round( 16 * knots.length );
	for (let i = 0; i < divisions; i++) {
		const t = i/divisions;
		spline.getPoint( t, xyz );
		xyzList.push( xyz.x, xyz.y, xyz.z );
		color.setHSL( t, 1.0, 0.5, THREE.SRGBColorSpace );
		rgbList.push( color.r, color.g, color.b );
	}

	// line
	lineMaterial = new LineMaterial( {
		color: 0xffffff,
		linewidth: 1, // in world units with size attenuation, pixels otherwise
		worldUnits: true,
		vertexColors: true,
		alphaToCoverage: true,
	} );

	const lineGeometry = new LineGeometry();
	lineGeometry.setPositions( xyzList );
	lineGeometry.setColors( rgbList );

	line = new Line2(lineGeometry, lineMaterial);
	line.computeLineDistances();
	line.scale.set(1, 1, 1);
	scene.add(line);

	// threshold line
	thresholdLineMaterial = new LineMaterial( {
		color: 0xffffff,
		linewidth: lineMaterial.linewidth, // in world units with size attenuation, pixels otherwise
		worldUnits: true,
		// vertexColors: true,
		transparent: true,
		opacity: 0.2,
		depthTest: false,
		visible: false,
	} );

	const thresholdLineGeometry = new LineGeometry();
	thresholdLineGeometry.setPositions( xyzList );
	thresholdLine = new Line2(thresholdLineGeometry, thresholdLineMaterial);
	thresholdLine.computeLineDistances();
	thresholdLine.scale.set(1, 1, 1);
	scene.add(thresholdLine);

	document.addEventListener( 'pointermove', onPointerMove );
	window.addEventListener( 'resize', onWindowResize );
	onWindowResize();

	raycaster = new THREE.Raycaster();
	raycaster.params.Line2 = {};
	raycaster.params.Line2.threshold = 0;

	guiParameters =
		{
			'world units': lineMaterial.worldUnits,
			'visualize threshold': thresholdLineMaterial.visible,
			'width': lineMaterial.linewidth,
			'alphaToCoverage': lineMaterial.alphaToCoverage,
			'threshold': raycaster.params.Line2.threshold
		};

	gui = initGui(guiParameters, lineMaterial, thresholdLineMaterial, raycaster);

}

function animate() {

	// Update threshold line to match main line position
	thresholdLine.position.copy( line.position );
	thresholdLine.quaternion.copy( line.quaternion );

	raycaster.setFromCamera( pointer, camera );

	const lineIntersections = raycaster.intersectObject( line );

	if ( lineIntersections.length > 0 ) {
		
		// Show feedback for threshold
		sphereInter.visible = true;
		sphereInter.position.copy( lineIntersections[ 0 ].point );
		const index = lineIntersections[ 0 ].faceIndex;
		const colors = line.geometry.getAttribute( 'instanceColorStart' );
		color.fromBufferAttribute( colors, index );
		// sphereInter.material.color.copy( color ).offsetHSL( 0.3, 0, 0 );
		// sphereInter.material.color.copy( color )

		// Show feedback for line intersection
		sphereOnLine.visible = true;
		sphereOnLine.position.copy( lineIntersections[ 0 ].pointOnLine );
		sphereOnLine.material.color.copy( color ).offsetHSL( 0.7, 0, 0 );

		// Calculate parametric coordinate for the spiral
		const t = findClosestT(spline, lineIntersections[0].pointOnLine, lineIntersections[0].faceIndex, line.geometry.getAttribute('instanceStart').count);
		console.log('Segment index (t):', t);

		renderer.domElement.style.cursor = 'crosshair';
	} else {
		sphereInter.visible = false;
		sphereOnLine.visible = false;
		renderer.domElement.style.cursor = '';
	}

	renderer.render( scene, camera );
}

function generateSpiralPoints( limit ) {
	const points = [];
	for (let i = -limit; i < limit; i++) {
		const t = i / 3;
		points.push(new THREE.Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
	}
	return points;
}

function findClosestT(spline, targetPoint, segmentIndex, totalSegments, tolerance = 0.0001) {
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

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

