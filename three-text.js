
let scene, camera, renderer, plane, planeShadow, hitPlane, sphere;
let shaderMaterial, shaderMaterialShadow;

function initThreeJS() {
    const container = document.getElementById('three-container');
    const containerWidth = container.offsetWidth;
    const containerHeight = 200; 


    scene = new THREE.Scene();


    const aspect = containerWidth / containerHeight;
    const frustumSize = 15;
    camera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2, (frustumSize * aspect) / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);


    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

 
    createShaderMaterials();


    const geometry = new THREE.PlaneGeometry(15, 15, 100, 100);
    const shadowGeometry = new THREE.PlaneGeometry(15, 15, 100, 100);
    const hitGeometry = new THREE.PlaneGeometry(20, 20); 


    plane = new THREE.Mesh(geometry, shaderMaterial);
    planeShadow = new THREE.Mesh(shadowGeometry, shaderMaterialShadow);
    planeShadow.position.z = -0.1; 

 
    hitPlane = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
    }));
    hitPlane.name = "hit";

    // Red sphere for visualizing intersection (optional - remove in production)
    const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);


    scene.add(plane);
    scene.add(planeShadow);
    scene.add(hitPlane);
    // scene.add(sphere); // Uncomment to see the red debug sphere


    setupRaycasting();


    animate();


    window.addEventListener('resize', onWindowResize);
}

function createShaderMaterials() {

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { 
                type: "t", 
                value: new THREE.TextureLoader().load('images/halsey-text.png') 
            },
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

 
    shaderMaterialShadow = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: {
                type: "t",
                value: new THREE.TextureLoader().load('images/halsey-text-shadow.png')
            },
            uDisplacement: { value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying float dist;
            uniform vec3 uDisplacement;
            
            void main() {
                vUv = uv;
                vec4 localPosition = vec4(position, 1.);
                vec4 worldPosition = modelMatrix * localPosition;
                dist = length(uDisplacement - worldPosition.rgb);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying float dist;
            uniform sampler2D uTexture;
            
            float map(float value, float min1, float max1, float min2, float max2) {
                return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
            }
            
            void main() {
                vec4 color = texture2D(uTexture, vUv);
                float min_distance = 3.;
                
                if (dist < min_distance) {
                    float alpha = map(dist, min_distance, 0., color.a, 0.);
                    color.a = alpha;
                }
                
                gl_FragColor = vec4(color);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
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
        const intersects = raycaster.intersectObject(hitPlane);

        if (intersects.length > 0) {
            const intersectionPoint = intersects[0].point;
            
        
            sphere.position.copy(intersectionPoint);
            
    
            shaderMaterial.uniforms.uDisplacement.value.copy(intersectionPoint);
            shaderMaterialShadow.uniforms.uDisplacement.value.copy(intersectionPoint);
        }
    }

    const container = document.getElementById('three-container');
    container.addEventListener('pointermove', onPointerMove);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('three-container');
    const containerWidth = container.offsetWidth;
    const containerHeight = 200;
    
    const aspect = containerWidth / containerHeight;
    const frustumSize = 15;
    
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(containerWidth, containerHeight);
}


document.addEventListener('DOMContentLoaded', initThreeJS);