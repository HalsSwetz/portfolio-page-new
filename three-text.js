let scene, camera, renderer, plane, hit;
let shader_material;

function initThreeJS() {
    const container = document.getElementById('three-container');

    scene = new THREE.Scene();
    
    camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(800, 400); 
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    shader_material = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { type: "t", value: new THREE.TextureLoader().load('images/halsey-text.png') },
            uDisplacement: { value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform vec3 uDisplacement;
            
            float easeInOutCubic(float x) {
                return x < 0.5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.;
            }
            
            float map(float value, float min1, float max1, float min2, float max2) {
                return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
            }
            
            void main() {
                vUv = uv;
                vec3 new_position = position;
                vec4 localPosition = vec4(position, 1.);
                vec4 worldPosition = modelMatrix * localPosition;
                
                float dist = length(uDisplacement - worldPosition.rgb);
                float min_distance = 3.;
                
                if (dist < min_distance) {
                    float distance_mapped = map(dist, 0., min_distance, 1., 0.);
                    float val = easeInOutCubic(distance_mapped) * 1.;
                    new_position.z += val;
                }
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(new_position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D uTexture;
            
            void main() {
                vec4 color = texture2D(uTexture, vUv);
                gl_FragColor = vec4(color);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(15, 15, 100, 100);
    plane = new THREE.Mesh(geometry, shader_material);
    scene.add(plane);
    
    const hitGeometry = new THREE.PlaneGeometry(20, 20);
    hit = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
    }));
    hit.name = "hit";
    scene.add(hit);
    
    setupRaycasting();
    
    animate();
}

function setupRaycasting() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    
    function onPointerMove(event) {
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(hit);
        
        if (intersects.length > 0) {
            shader_material.uniforms.uDisplacement.value = intersects[0].point;
        }
    }
    
    window.addEventListener("pointermove", onPointerMove);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}


document.addEventListener('DOMContentLoaded', initThreeJS);