# Depth Testing and Render Order in Three.js

## Key Concepts

### depthTest: false
- Ignores the z-buffer/depth buffer completely
- Object will be rendered regardless of its actual distance from the camera
- Useful for UI elements and visual feedback that should always be visible
- Think: "Draw this object as if it's always in front"

### renderOrder
- Controls the sequence of rendering within the same pass
- Higher values are rendered after lower values
- Prevents z-fighting between objects that ignore depth testing
- Think: "Among all objects that ignore depth, draw me in this order"

## Why Both Are Needed
- `depthTest: false` alone is insufficient because:
  - Multiple objects ignoring depth could still z-fight
  - No explicit ordering between objects that ignore depth
- `renderOrder` provides the explicit sequence needed to prevent visual artifacts

## Example Use Case
```javascript
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 4),
    new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        depthTest: false  // Ignore depth
    })
);
sphere.renderOrder = 10;  // Render after other objects
``` 