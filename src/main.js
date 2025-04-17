import './main.css'
import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

let gui
let camera;
let scene;
let renderer;
let line;
let thresholdLine;
let sphereInter;
let sphereOnLine;
let spline;
let knots;
let controls;
let pointer = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let lineMaterial
let thresholdLineMaterial
let guiParameters
const color = new THREE.Color();

const BACKGROUND_COLOR = 0xCACACA;

// Run initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeApp(document.getElementById('container'))
})

// Initialize your application here
function initializeApp(container) {
  
 	raycaster.params.Line2 = {};
	raycaster.params.Line2.threshold = 0;

	lineMaterial = new LineMaterial( {

		color: 0xffffff,
		linewidth: 1, // in world units with size attenuation, pixels otherwise
		worldUnits: true,
		vertexColors: true,

		alphaToCoverage: true,

	} );

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

	guiParameters = {
		'world units': lineMaterial.worldUnits,
		'visualize threshold': thresholdLineMaterial.visible,
		'width': lineMaterial.linewidth,
		'alphaToCoverage': lineMaterial.alphaToCoverage,
		'threshold': raycaster.params.Line2.threshold,
		'translation': raycaster.params.Line2.threshold,
	};

	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( BACKGROUND_COLOR, 1.0 );
	renderer.setAnimationLoop( animate );
	document.body.appendChild( renderer.domElement );

	scene = new THREE.Scene();
	scene.background = new THREE.Color(BACKGROUND_COLOR);

	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.set( 0, 0, 60 );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 10;
	controls.maxDistance = 500;

	const sphereGeometry = new THREE.SphereGeometry( 0.25, 8, 4 );
	const sphereInterMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, depthTest: false } );
	const sphereOnLineMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, depthTest: false } );

	sphereInter = new THREE.Mesh( sphereGeometry, sphereInterMaterial );
	sphereOnLine = new THREE.Mesh( sphereGeometry, sphereOnLineMaterial );
	sphereInter.visible = false;
	sphereOnLine.visible = false;
	sphereInter.renderOrder = 10;
	sphereOnLine.renderOrder = 10;
	scene.add( sphereInter );
	scene.add( sphereOnLine );

	// temp variables
	const point = new THREE.Vector3();
	const colors = [];
	const positions = [];

	// Generate spiral points
	knots = generateSpiralPoints( 48 );
	spline = new THREE.CatmullRomCurve3( knots );
	const divisions = Math.round( 16 * knots.length );
	for (let i = 0; i < divisions; i++) {

		const t = i/divisions;
		spline.getPoint( t, point );

		positions.push( point.x, point.y, point.z );

		color.setHSL( t, 1.0, 0.5, THREE.SRGBColorSpace );
		colors.push( color.r, color.g, color.b );

	}

	const lineGeometry = new LineGeometry();
	lineGeometry.setPositions( positions );
	lineGeometry.setColors( colors );

	line = new Line2( lineGeometry, lineMaterial );
	line.computeLineDistances();
	line.scale.set( 1, 1, 1 );
	scene.add( line );

	// Create threshold line
	const thresholdGeometry = new LineGeometry();
	thresholdGeometry.setPositions( positions );
	thresholdLine = new Line2( thresholdGeometry, thresholdLineMaterial );
	thresholdLine.computeLineDistances();
	thresholdLine.scale.set( 1, 1, 1 );
	scene.add( thresholdLine );

	document.addEventListener( 'pointermove', onPointerMove );
	window.addEventListener( 'resize', onWindowResize );
	onWindowResize();

	initGui();

}


function initGui() {

	gui = new GUI();

	gui.add( guiParameters, 'world units' ).onChange( function ( val ) {

		lineMaterial.worldUnits = val;
		lineMaterial.needsUpdate = true;

		thresholdLineMaterial.worldUnits = val;
		thresholdLineMaterial.needsUpdate = true;

	} );

	gui.add( guiParameters, 'visualize threshold' ).onChange( function ( val ) {

		thresholdLineMaterial.visible = val;

	} );

	gui.add( guiParameters, 'width', 1, 10 ).onChange( function ( val ) {

		lineMaterial.linewidth = val;
		thresholdLineMaterial.linewidth = lineMaterial.linewidth + raycaster.params.Line2.threshold;

	} );

	gui.add( guiParameters, 'alphaToCoverage' ).onChange( function ( val ) {

		lineMaterial.alphaToCoverage = val;

	} );

	gui.add( guiParameters, 'threshold', 0, 10 ).onChange( function ( val ) {

		raycaster.params.Line2.threshold = val;
		thresholdLineMaterial.linewidth = lineMaterial.linewidth + raycaster.params.Line2.threshold;

	} );

	gui.add( guiParameters, 'translation', 0, 10 ).onChange( function ( val ) {

		line.position.x = val;

	} );

}

function animate() {

	// Update threshold line to match main line position
	thresholdLine.position.copy( line.position );
	thresholdLine.quaternion.copy( line.quaternion );

	raycaster.setFromCamera( pointer, camera );

	const intersectsLine = raycaster.intersectObject( line );

	if ( intersectsLine.length > 0 ) {
		// Show feedback for line
		sphereInter.visible = true;
		sphereOnLine.visible = true;

		sphereInter.position.copy( intersectsLine[ 0 ].point );
		sphereOnLine.position.copy( intersectsLine[ 0 ].pointOnLine );

		const index = intersectsLine[ 0 ].faceIndex;
		const colors = line.geometry.getAttribute( 'instanceColorStart' );
		color.fromBufferAttribute( colors, index );
		sphereInter.material.color.copy( color ).offsetHSL( 0.3, 0, 0 );
		sphereOnLine.material.color.copy( color ).offsetHSL( 0.7, 0, 0 );

		// Calculate parametric coordinate for the spiral
		const t = findClosestT(spline, intersectsLine[0].pointOnLine, intersectsLine[0].faceIndex, line.geometry.getAttribute('instanceStart').count);
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

