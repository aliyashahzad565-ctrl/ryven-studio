'use strict';

(() => {
    const experience = document.getElementById('cylinderExperience');
    const stage = document.getElementById('webglCylinderStage');
    const canvas = document.getElementById('cinematicCylinderCanvas');
    if (!experience || !stage || !canvas) return;

    const intro = experience.querySelector('.cylinder-copy--intro');
    const perspectiveCopy = experience.querySelector('.cylinder-copy--perspective');
    const insideCopy = experience.querySelector('.cylinder-copy--inside');
    const hint = experience.querySelector('.cylinder-experience__hint');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fallback = stage.querySelector('.webgl-cylinder-fallback');

    /* The first frame must never be an empty black page. The static joined
       belt remains visible if WebGL is unavailable or a local browser blocks
       the texture request. */
    if (intro) {
        intro.style.opacity = '1';
        intro.style.transform = 'translate3d(-50%,0,0) scale(1)';
    }
    stage.classList.add('is-fallback');
    if (!window.THREE) return;

    const THREE = window.THREE;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha:true,
            antialias:true,
            powerPreference:'high-performance'
        });
    } catch (error) {
        return;
    }
    renderer.setClearColor(0x030304, 1);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030304);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 60);

    const texture = new THREE.TextureLoader().load(
        './assets/images/gallery/cinematic-cylinder-atlas.webp',
        () => {
            stage.classList.remove('is-fallback');
            stage.classList.add('is-webgl-ready');
            requestRender();
        },
        undefined,
        () => stage.classList.add('is-fallback')
    );
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.CylinderGeometry(3.15, 3.15, 1.72, 72, 1, true);
    const material = new THREE.MeshBasicMaterial({
        map:texture,
        side:THREE.DoubleSide,
        toneMapped:false
    });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.rotation.y = -.28;
    scene.add(cylinder);

    let progress = 0;
    let targetProgress = 0;
    let frame = 0;
    let visible = true;

    const clamp = value => Math.min(1, Math.max(0, value));
    const range = (value, start, end) => clamp((value - start) / (end - start));
    const smooth = value => value * value * (3 - 2 * value);
    const mix = (a, b, amount) => a + (b - a) * amount;
    const windowOpacity = (value, a, b, c, d) =>
        Math.min(range(value, a, b), 1 - range(value, c, d));

    const setCopy = (element, opacity, y = 24) => {
        if (!element) return;
        element.style.opacity = opacity.toFixed(3);
        element.style.transform =
            `translate3d(-50%,${((1 - opacity) * y).toFixed(2)}px,0) scale(${(.95 + opacity * .05).toFixed(3)})`;
    };

    const resize = () => {
        const bounds = stage.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const updateTarget = () => {
        const bounds = experience.getBoundingClientRect();
        const distance = Math.max(1, experience.offsetHeight - innerHeight);
        targetProgress = reducedMotion ? 0 : clamp(-bounds.top / distance);
        requestRender();
    };

    function requestRender() {
        if (!frame && visible) frame = requestAnimationFrame(render);
    }

    const render = () => {
        frame = 0;
        progress += (targetProgress - progress) * .14;
        if (Math.abs(targetProgress - progress) < .0004) progress = targetProgress;

        const p = progress;
        const opening = smooth(range(p, .12, .46));
        const entering = smooth(range(p, .46, .78));
        const inside = smooth(range(p, .72, 1));

        /* Camera path from the recording:
           front view -> elevated opening view -> rim -> inside cylinder. */
        camera.position.x = mix(0, .08, entering);
        camera.position.y = mix(.08, 3.08, opening);
        camera.position.y = mix(camera.position.y, .24, entering);
        camera.position.z = mix(8.15, 5.4, opening);
        camera.position.z = mix(camera.position.z, .3, entering);

        const lookY = mix(0, .08, opening);
        camera.lookAt(0, lookY, mix(0, -.42, inside));

        cylinder.rotation.y = -.28 - p * Math.PI * 2.18;
        cylinder.rotation.z = mix(0, -.018, opening);
        const wideScale = mix(.9, 1.08, opening);
        cylinder.scale.set(wideScale, mix(.88, 1.06, opening), wideScale);

        setCopy(intro, 1 - range(p, .24, .36));
        setCopy(perspectiveCopy, windowOpacity(p, .42, .53, .65, .76));
        setCopy(insideCopy, range(p, .72, .84));
        if (hint) hint.style.opacity = (1 - range(p, .02, .14)).toFixed(3);

        renderer.render(scene, camera);
        if (Math.abs(targetProgress - progress) >= .0004) requestRender();
    };

    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) requestRender();
    }, { rootMargin:'120px' }).observe(experience);

    addEventListener('scroll', updateTarget, { passive:true });
    addEventListener('resize', () => {
        resize();
        updateTarget();
    }, { passive:true });
    document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        if (visible) requestRender();
    });

    resize();
    updateTarget();
})();
