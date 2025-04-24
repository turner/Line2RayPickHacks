import * as THREE from 'three';

class RayCastService {
    constructor() {
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.setup();
        this.setupEventListeners();
    }

    setup() {
        this.raycaster.params.Line2 = {};
        this.raycaster.params.Line2.threshold = 0;
    }

    setupEventListeners() {
        document.addEventListener('pointermove', this.onPointerMove.bind(this));
    }

    cleanup() {
        document.removeEventListener('pointermove', this.onPointerMove.bind(this));
    }

    onPointerMove(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    updateRaycaster(camera) {
        this.raycaster.setFromCamera(this.pointer, camera);
    }

    intersectObject(camera, object) {
        this.updateRaycaster(camera)
        return this.raycaster.intersectObject(object)
    }
} 

export default RayCastService;