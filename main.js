/* RYVEN Studios Core Interactive Frontend Script */
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('js-ready');
    const heroSection = document.querySelector('.hero-section');
    const isHomePage = Boolean(heroSection);
    const motionReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('is-home', isHomePage);

    /* Cinematic rotating hero phrase: blur-smear, depth and glow, not a basic fade. */
    const heroWords = [...document.querySelectorAll('.hero-word')];
    if (heroWords.length > 1) {
        let activeWord = 0;
        setInterval(() => {
            const current = heroWords[activeWord];
            current.classList.remove('is-active');
            current.classList.add('is-leaving');
            /* Wait until the current phrase has completely disappeared.
               Only then allow the next phrase to enter, preventing overlap. */
            setTimeout(() => {
                current.classList.remove('is-leaving');
                activeWord = (activeWord + 1) % heroWords.length;
                const next = heroWords[activeWord];
                next.classList.remove('is-leaving');
                next.classList.add('is-active');
            }, 900);
        }, 3600);
    }
    /* Cursor-following particle web visible in the reference recording */
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-web';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = !isHomePage || motionReduced;
    if (heroSection) heroSection.prepend(canvas);
    const context = canvas.getContext('2d');
    const pointer = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        active: false,
        strength: 0
    };
    let nodes = [];
    let clusterNodes = [];
    let dpr = Math.min(devicePixelRatio || 1, 2);
    let webWidth = 1;
    let webHeight = 1;
    let heroVisible = false;
    let webFrame = 0;
    let lastWebPaint = 0;

    function resetWeb() {
        if (!heroSection) return;
        dpr = Math.min(devicePixelRatio || 1, 1.15);
        webWidth = heroSection.clientWidth;
        webHeight = heroSection.clientHeight;
        canvas.width = webWidth * dpr;
        canvas.height = webHeight * dpr;
        canvas.style.width = webWidth + 'px';
        canvas.style.height = webHeight + 'px';
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        /* A generous field of independently drifting stars.  Keep the motion
           deliberately slow so the hero feels alive without distracting from
           the copy in the centre. */
        nodes = Array.from({ length: webWidth < 700 ? 145 : 320 }, () => {
            const x = Math.random() * webWidth;
            const y = Math.random() * webHeight;
            return {
                x,
                y,
                drawX:x,
                drawY:y,
                angle:Math.random() * Math.PI * 2,
                speed:Math.random() * .075 + .065,
                size:Math.random() < .16
                    ? Math.random() * .8 + .75
                    : Math.random() * .65 + .35,
                depth:Math.random() * .65 + .35,
                linkable:Math.random() < .58,
                glow:Math.random() * Math.PI * 2,
                twinkleSpeed:Math.random() * .0015 + .0007
            };
        });
        const clusterWidth = webWidth < 700 ? 105 : 175;
        const clusterHeight = webWidth < 700 ? 105 : 155;
        const clusterLeft = webWidth < 700
            ? webWidth - clusterWidth - 14
            : webWidth * .84;
        const clusterTop = webHeight * .34;
        clusterNodes = Array.from({ length: webWidth < 700 ? 28 : 58 }, () => {
            const x = clusterLeft + Math.random() * clusterWidth;
            const y = clusterTop + Math.random() * clusterHeight;
            return {
                x,
                y,
                drawX:x,
                drawY:y,
                vx:(Math.random() - .5) * .24,
                vy:(Math.random() - .5) * .24,
                size:Math.random() * .85 + .45,
                left:clusterLeft,
                top:clusterTop,
                width:clusterWidth,
                height:clusterHeight
            };
        });
    }

    addEventListener('resize', resetWeb);
    if (heroSection && !motionReduced) {
        heroSection.addEventListener('pointermove', event => {
            const rect = heroSection.getBoundingClientRect();
            pointer.targetX = event.clientX - rect.left;
            pointer.targetY = event.clientY - rect.top;
            if (!pointer.active) {
                pointer.x = pointer.targetX;
                pointer.y = pointer.targetY;
            }
            pointer.active = true;
        }, { passive: true });
        heroSection.addEventListener('pointerleave', () => { pointer.active = false; });
        resetWeb();
    }

    function drawWeb(time) {
        if (!heroVisible || document.hidden) {
            webFrame = 0;
            return;
        }
        /* 30fps is visually smooth for this slow constellation and halves
           the canvas work compared with repainting at monitor refresh rate. */
        if (time - lastWebPaint < 32) {
            webFrame = requestAnimationFrame(drawWeb);
            return;
        }
        lastWebPaint = time;
        context.clearRect(0, 0, webWidth, webHeight);
        pointer.x += (pointer.targetX - pointer.x) * .28;
        pointer.y += (pointer.targetY - pointer.y) * .28;
        pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * .12;
        for (const node of nodes) {
            /* Every star keeps travelling.  Wrapping at the edges avoids the
               stop-and-bounce look and keeps the field naturally scattered. */
            node.angle += Math.sin(time * .00015 + node.glow) * .00012;
            node.x += Math.cos(node.angle) * node.speed * node.depth;
            node.y += Math.sin(node.angle) * node.speed * node.depth;
            if (node.x < -3) { node.x = webWidth + 3; node.drawX = node.x; }
            if (node.x > webWidth + 3) { node.x = -3; node.drawX = node.x; }
            if (node.y < -3) { node.y = webHeight + 3; node.drawY = node.y; }
            if (node.y > webHeight + 3) { node.y = -3; node.drawY = node.y; }
            /* Soft glass-like magnetic movement from the approved build:
               nearby stars gather smoothly without stopping their base drift. */
            const pullDx = pointer.x - node.x;
            const pullDy = pointer.y - node.y;
            const pullDistance = Math.hypot(pullDx, pullDy);
            const pullRadius = webWidth < 700 ? 165 : 245;
            const pullAmount = pointer.strength > .01 && pullDistance < pullRadius
                ? Math.pow(1 - pullDistance / pullRadius, .32) * .97 * pointer.strength
                : 0;
            const targetX = node.x + pullDx * pullAmount;
            const targetY = node.y + pullDy * pullAmount;
            node.drawX += (targetX - node.drawX) * .26;
            node.drawY += (targetY - node.drawY) * .26;
            const twinkle = .42 + (Math.sin(node.glow + time * node.twinkleSpeed) + 1) * .22;
            context.fillStyle = `rgba(255,255,255,${twinkle})`;
            context.beginPath();
            context.arc(node.drawX, node.drawY, node.size, 0, Math.PI * 2);
            context.fill();
        }
        /* Fine constellation links across the complete hero, matching the
           reference without adding DOM elements or expensive effects. */
        for (let i = 0; i < nodes.length; i += 1) {
            for (let j = i + 1; j < nodes.length; j += 1) {
                const first = nodes[i];
                const second = nodes[j];
                if (!first.linkable || !second.linkable) continue;
                const distance = Math.hypot(first.drawX - second.drawX, first.drawY - second.drawY);
                if (distance > 108) continue;
                context.strokeStyle = `rgba(166,161,172,${(1 - distance / 108) * .12})`;
                context.lineWidth = .4;
                context.beginPath();
                context.moveTo(first.drawX, first.drawY);
                context.lineTo(second.drawX, second.drawY);
                context.stroke();
            }
        }
        /* Dense moving mesh on the right, matching the persistent square
           particle cluster in the supplied reference recording. */
        for (const particle of clusterNodes) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x < particle.left || particle.x > particle.left + particle.width) particle.vx *= -1;
            if (particle.y < particle.top || particle.y > particle.top + particle.height) particle.vy *= -1;
            const pullDx = pointer.x - particle.x;
            const pullDy = pointer.y - particle.y;
            const pullDistance = Math.hypot(pullDx, pullDy);
            const pullRadius = webWidth < 700 ? 165 : 245;
            const pullAmount = pointer.strength > .01 && pullDistance < pullRadius
                ? Math.pow(1 - pullDistance / pullRadius, .32) * .97 * pointer.strength
                : 0;
            const targetX = particle.x + pullDx * pullAmount;
            const targetY = particle.y + pullDy * pullAmount;
            particle.drawX += (targetX - particle.drawX) * .26;
            particle.drawY += (targetY - particle.drawY) * .26;
            context.fillStyle = 'rgba(255,255,255,.58)';
            context.beginPath();
            context.arc(particle.drawX, particle.drawY, particle.size, 0, Math.PI * 2);
            context.fill();
        }
        for (let i = 0; i < clusterNodes.length; i += 1) {
            for (let j = i + 1; j < clusterNodes.length; j += 1) {
                const first = clusterNodes[i];
                const second = clusterNodes[j];
                const distance = Math.hypot(first.drawX - second.drawX, first.drawY - second.drawY);
                if (distance > 54) continue;
                context.strokeStyle = `rgba(205,201,214,${(1 - distance / 54) * .22})`;
                context.lineWidth = .42;
                context.beginPath();
                context.moveTo(first.drawX, first.drawY);
                context.lineTo(second.drawX, second.drawY);
                context.stroke();
            }
        }
        webFrame = requestAnimationFrame(drawWeb);
    }
    if (heroSection) {
        const heroObserver = new IntersectionObserver(entries => {
            heroVisible = entries[0].isIntersecting;
            if (heroVisible && !webFrame && !document.hidden) webFrame = requestAnimationFrame(drawWeb);
        }, { rootMargin:'80px 0px' });
        heroObserver.observe(heroSection);
    }

    /* Portfolio category filters. */
    const filterButtons = [...document.querySelectorAll('.filter-btn')];
    const portfolioItems = [...document.querySelectorAll('.portfolio-item[data-category]')];
    if (filterButtons.length && portfolioItems.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                filterButtons.forEach(item => item.classList.toggle('active', item === button));
                portfolioItems.forEach(card => {
                    const categories = card.dataset.category.split(/\s+/);
                    const show = filter === 'all' || categories.includes(filter);
                    card.classList.toggle('is-filtered-out', !show);
                });
            });
        });
    }

    /* True 3D moving gallery: cards travel sideways and come forward at centre. */
    const depthGallery = document.getElementById('depthGallery');
    if (depthGallery) {
        const lanes = [...depthGallery.querySelectorAll('.depth-lane')];
        let drift = 0;
        let pointerForce = 0;
        let galleryVisible = false;
        let galleryFrame = 0;
        let galleryMetrics = [];
        let galleryTotalWidth = 1;

        /* Duplicate the complete image sequence so no empty frame or black gap
           can appear while either lane loops continuously. */
        lanes.forEach(lane => {
            const originals = [...lane.children];
            originals.forEach(card => {
                const copy = card.cloneNode(true);
                copy.setAttribute('aria-hidden', 'true');
                lane.appendChild(copy);
            });
        });

        const measureGallery = () => {
            const firstLane = lanes[0];
            if (!firstLane) return;
            galleryMetrics = [...firstLane.children].map(card => card.getBoundingClientRect().width);
            galleryTotalWidth = galleryMetrics.reduce((sum, width) => sum + width + 24, 0);
        };
        measureGallery();
        addEventListener('resize', measureGallery, { passive:true });

        depthGallery.addEventListener('pointermove', event => {
            const box = depthGallery.getBoundingClientRect();
            pointerForce = ((event.clientX - box.left) / box.width - .5) * .35;
        }, { passive: true });
        depthGallery.addEventListener('pointerleave', () => { pointerForce = 0; });

        function renderDepthGallery() {
            if (!galleryVisible || document.hidden) {
                galleryFrame = 0;
                return;
            }
            /* Calm permanent travel. Pointer only adds a very small speed nudge. */
            drift += .72 + pointerForce;
            const centre = innerWidth / 2;
            lanes.forEach((lane, laneIndex) => {
                const direction = Number(lane.dataset.direction || 1);
                const cards = [...lane.children];
                const totalWidth = galleryTotalWidth;
                let baseOffset = 0;
                cards.forEach((card, index) => {
                    const cardWidth = galleryMetrics[index] || galleryMetrics[0] || 470;
                    let x = baseOffset + drift * direction;
                    baseOffset += cardWidth + 24;
                    x = ((x % totalWidth) + totalWidth) % totalWidth;
                    if (x > totalWidth - cardWidth * .15) x -= totalWidth;
                    const screenX = x + cardWidth / 2;
                    const distance = Math.min(1, Math.abs(screenX - centre) / (innerWidth * .58));
                    const depth = (1 - distance) * 145;
                    const scale = .84 + (1 - distance) * .16;
                    const rotateY = ((screenX - centre) / centre) * -14;
                    const lift = 0;
                    card.style.transform = `translate3d(${x}px,${lift}px,${depth}px) rotateY(${rotateY}deg) scale(${scale})`;
                    card.style.opacity = String(.42 + (1 - distance) * .58);
                    card.style.zIndex = String(Math.round(depth));
                });
            });
            galleryFrame = requestAnimationFrame(renderDepthGallery);
        }
        const galleryObserver = new IntersectionObserver(entries => {
            galleryVisible = entries[0].isIntersecting;
            if (galleryVisible && !galleryFrame && !document.hidden) galleryFrame = requestAnimationFrame(renderDepthGallery);
        }, { rootMargin:'120px 0px' });
        galleryObserver.observe(depthGallery);
    }

    /* Seamless one-line production-logo marquee. */
    const toolTrack = document.querySelector('.tool-orbit .tool-track');
    if (toolTrack && !toolTrack.dataset.loopReady) {
        [...toolTrack.children].forEach(item => {
            const copy = item.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            toolTrack.appendChild(copy);
        });
        toolTrack.dataset.loopReady = 'true';
    }

    /* One icon at a time: hovering or clicking never pops a sibling icon. */
    const toolOrbit = document.querySelector('.tool-orbit');
    if (toolOrbit) {
        const clearToolState = () => {
            toolOrbit.querySelectorAll('.tool-icon.is-active').forEach(icon => icon.classList.remove('is-active'));
        };
        const activateTool = icon => {
            clearToolState();
            if (icon) icon.classList.add('is-active');
        };
        toolOrbit.addEventListener('pointerover', event => {
            const icon = event.target.closest('.tool-icon');
            if (icon && toolOrbit.contains(icon)) activateTool(icon);
        });
        toolOrbit.addEventListener('pointerleave', clearToolState);
        toolOrbit.addEventListener('click', event => {
            const icon = event.target.closest('.tool-icon');
            if (icon && toolOrbit.contains(icon)) activateTool(icon);
        });
    }

    /* Services-page stacked production frames move at different depths. */
    const pipelineStack = document.getElementById('pipelineStack');
    if (pipelineStack) {
        const layers = [...pipelineStack.children];
        pipelineStack.addEventListener('pointermove', event => {
            const rect = pipelineStack.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            layers.forEach((layer, index) => {
                const strength = (index + 1) * 13;
                layer.style.setProperty('--px', `${x * strength}px`);
                layer.style.setProperty('--py', `${y * strength}px`);
                layer.style.setProperty('--rx', `${-y * (index + 2) * 2.2}deg`);
                layer.style.setProperty('--ry', `${x * (index + 2) * 3}deg`);
            });
        }, { passive: true });
        pipelineStack.addEventListener('pointerleave', () => {
            layers.forEach(layer => {
                layer.style.setProperty('--px', '0px');
                layer.style.setProperty('--py', '0px');
                layer.style.setProperty('--rx', '0deg');
                layer.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* Premium Services hero: image and glass layers move at separate depths. */
    const servicesHeroVisual = document.getElementById('servicesHeroVisual');
    if (servicesHeroVisual) {
        const heroImage = servicesHeroVisual.querySelector('.services-hero-image');
        const glassLayers = [...servicesHeroVisual.querySelectorAll('.hero-glass-layer')];
        servicesHeroVisual.addEventListener('pointermove', event => {
            const rect = servicesHeroVisual.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            heroImage.style.transform = `scale(1.09) translate3d(${x * -20}px,${y * -15}px,35px) rotateX(${y * -3}deg) rotateY(${x * 4}deg)`;
            glassLayers.forEach((layer, index) => {
                const depth = (index + 1) * 28;
                layer.style.transform = `translate3d(${x * depth}px,${y * depth}px,${55 + index * 45}px) rotateX(${y * -8}deg) rotateY(${x * 10}deg)`;
            });
        }, { passive: true });
        servicesHeroVisual.addEventListener('pointerleave', () => {
            heroImage.style.transform = '';
            glassLayers.forEach(layer => { layer.style.transform = ''; });
        });
    }

    /* Portfolio hero layers. */
    const heroProjectStack = document.getElementById('heroProjectStack');
    if (heroProjectStack) {
        const cards = [...heroProjectStack.children];
        heroProjectStack.addEventListener('pointermove', event => {
            const rect = heroProjectStack.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            cards.forEach((card, index) => {
                card.style.setProperty('--hx', `${x * (index + 1) * 22}px`);
                card.style.setProperty('--hy', `${y * (index + 1) * 18}px`);
                card.style.setProperty('--hrx', `${-y * (index + 2) * 2.5}deg`);
                card.style.setProperty('--hry', `${x * (index + 2) * 3.2}deg`);
            });
        }, { passive: true });
        heroProjectStack.addEventListener('pointerleave', () => cards.forEach(card => {
            card.style.setProperty('--hx', '0px'); card.style.setProperty('--hy', '0px');
            card.style.setProperty('--hrx', '0deg'); card.style.setProperty('--hry', '0deg');
        }));
    }

    /* Play muted project previews only while their cards are hovered. */
    document.querySelectorAll('.project-card').forEach(card => {
        const video = card.querySelector('video');
        if (!video) return;
        card.addEventListener('pointerenter', () => video.play().catch(() => {}));
        card.addEventListener('pointerleave', () => { video.pause(); video.currentTime = 0; });
    });

    /* Seamless portfolio film strip. */
    document.querySelectorAll('.filmstrip-track').forEach(track => {
        [...track.children].forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        });
    });

    /* Selectable 3D project stack. */
    const interactiveProjectStack = document.getElementById('interactiveProjectStack');
    if (interactiveProjectStack) {
        const cards = [...interactiveProjectStack.children];
        const controls = [...document.querySelectorAll('[data-stack-index]')];
        const activateStack = selected => {
            cards.forEach((card, index) => {
                const offset = (index - selected + cards.length) % cards.length;
                card.dataset.position = String(offset);
            });
            controls.forEach((button, index) => button.classList.toggle('active', index === selected));
        };
        controls.forEach(button => button.addEventListener('click', () => activateStack(Number(button.dataset.stackIndex))));
        cards.forEach((card, index) => card.addEventListener('click', () => activateStack(index)));
        activateStack(0);
    }

    /* Drag before/after comparison. */
    const beforeAfter = document.getElementById('beforeAfter');
    if (beforeAfter) {
        const range = beforeAfter.querySelector('input');
        const updateComparison = () => beforeAfter.style.setProperty('--split', `${range.value}%`);
        range.addEventListener('input', updateComparison);
        updateComparison();
    }

    /* Lightweight fullscreen case-study modal. */
    const projectModal = document.getElementById('projectModal');
    if (projectModal) {
        const title = document.getElementById('modalTitle');
        const media = document.getElementById('modalMedia');
        const closeModal = () => {
            projectModal.classList.remove('is-open');
            projectModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            media.innerHTML = '';
        };
        document.querySelectorAll('.project-open').forEach(button => button.addEventListener('click', event => {
            event.stopPropagation();
            const source = button.dataset.media;
            title.textContent = button.dataset.project || 'Project';
            media.innerHTML = source.endsWith('.mp4')
                ? `<video autoplay muted loop playsinline src="${source}"></video>`
                : `<img src="${source}" alt="">`;
            projectModal.classList.add('is-open');
            projectModal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        }));
        projectModal.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeModal));
        addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
    }

    /* Strong scroll-pop reveals matching the reference */
    const revealTargets = document.querySelectorAll(
        '.section-header, .camera-intro, .home-capabilities > *, .projects-heading, .capability-card, .feature-panel, .showreel-card, .ceo-card, .leadership-card, .leader-copy > *, .review-card, .service-card, .portfolio-item, .contact-container, .home-cta > *, .story-container, .story-container h2, .story-container p, .creative-signal-copy > *, .signal-visual, .studio-pulse-section, .pulse-heading > *, .creative-engine-stage, .engine-node, .mission-card, .mission-card h2, .mission-card p, .process-track article, .process-track h3, .stats-section article, .about-section-heading, .about-section-heading h2, .about-section-heading p, .team-card, .team-card h3, .teamwork-feature, .teamwork-copy > *, .reviews-header > *, .about-final-cta > *, .services-hero-copy > *, .services-portal, .services-heading > *, .service-panel, .featured-service-copy > *, .pipeline-stack article, .product-lab-visual, .format-orbit article, .vertical-process article, .included-grid span, .package-grid article, .faq-list details, .services-final-cta > *, .portfolio-hero-copy > *, .hero-project-stack article, .portfolio-spotlight, .portfolio-section-heading > *, .project-card, .stack-copy > *, .interactive-project-stack article, .before-after, .industry-cloud span, .portfolio-stats article, .portfolio-final-cta > *'
    );
    revealTargets.forEach((element, index) => {
        element.classList.add('motion-reveal');
        element.style.transitionDelay = `${Math.min(index % 3, 2) * 90}ms`;
    });
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(element => revealObserver.observe(element));

    /* Word-by-word pop for the About and Services hero headings. */
    const popTitles = document.querySelectorAll('.hero-pop-title');
    if (popTitles.length) {
        const popTitleObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-popped');
                entry.target.parentElement?.classList.add('hero-copy-active');
                popTitleObserver.unobserve(entry.target);
            });
        }, { threshold:.3 });
        popTitles.forEach(title => popTitleObserver.observe(title));
    }

    /* About-page number counters. */
    const counters = [...document.querySelectorAll('[data-count]')];
    if (counters.length) {
        const counterObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const element = entry.target;
                const target = Number(element.dataset.count);
                const suffix = element.textContent.includes('%') ? '%' : '+';
                const start = performance.now();
                const duration = 1250;
                const tick = now => {
                    const progress = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    element.textContent = `${Math.round(target * eased)}${suffix}`;
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
                counterObserver.unobserve(element);
            });
        }, { threshold: .5 });
        counters.forEach(counter => counterObserver.observe(counter));
    }

    /* Seamless duplicated About-page film line. */
    document.querySelectorAll('.about-motion-track').forEach(track => {
        [...track.children].forEach(card => {
            const duplicate = card.cloneNode(true);
            duplicate.setAttribute('aria-hidden', 'true');
            track.appendChild(duplicate);
        });
    });

    document.querySelectorAll('.service-ticker > div').forEach(track => {
        [...track.children].forEach(item => {
            const duplicate = item.cloneNode(true);
            duplicate.setAttribute('aria-hidden', 'true');
            track.appendChild(duplicate);
        });
    });

    const header = document.querySelector('.site-header');
    const navigation = document.querySelector('.site-nav');
    if (header && navigation) {
        const toggle = document.createElement('button');
        toggle.className = 'menu-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
        header.insertBefore(toggle, header.querySelector('.header-cta'));
        toggle.addEventListener('click', () => {
            const open = navigation.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(open));
            toggle.textContent = open ? '×' : '☰';
        });
    }

    /* Magnetic premium buttons. */
    document.querySelectorAll('.btn-primary, .play-disc').forEach(button => {
        button.addEventListener('pointermove', event => {
            const box = button.getBoundingClientRect();
            button.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * .14}px, ${(event.clientY - box.top - box.height / 2) * .14}px)`;
        });
        button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
    
    /* Lightweight gallery entrance. Rotation and hover are GPU-accelerated
       in CSS so no JavaScript work runs on every animation frame. */
    const hoverGallery = document.getElementById('hoverGallery');
    if (hoverGallery) {
        const ring = hoverGallery.querySelector('.hover-gallery__ring');
        const title = hoverGallery.querySelector('.hover-gallery__title h1, .hover-gallery__title h2');
        if (title && !title.querySelector('.hover-gallery__char')) {
            const letters = [...title.textContent];
            title.textContent = '';
            letters.forEach((letter, index) => {
                const span = document.createElement('span');
                span.className = 'hover-gallery__char';
                const accentLength = Number(title.dataset.accentLength || 0);
                if (index < accentLength) span.classList.add('is-accent');
                span.style.setProperty('--char-index', index);
                span.textContent = letter === ' ' ? '\u00a0' : letter;
                title.appendChild(span);
            });
        }

        let spotlightFrame = 0;
        hoverGallery.addEventListener('pointermove', event => {
            if (spotlightFrame) return;
            spotlightFrame = requestAnimationFrame(() => {
                const bounds = hoverGallery.getBoundingClientRect();
                hoverGallery.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
                hoverGallery.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
                spotlightFrame = 0;
            });
        }, { passive:true });

        ring?.querySelectorAll('.hover-gallery__panel').forEach(panel => {
            const image = panel.querySelector('img');
            if (!image) return;
            const applyTexture = () => {
                panel.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
                panel.classList.add('is-textured');
            };
            if (image.complete && image.naturalWidth) applyTexture();
            else image.addEventListener('load', applyTexture, { once:true });
        });

        /* The dedicated page reveals two cached neighbouring artworks above
           the hovered frame. They reuse existing files, so no heavy new
           textures or animation loop is introduced. */
        if (hoverGallery.classList.contains('cinematic-gallery') && ring) {
            const panels = [...ring.querySelectorAll('.hover-gallery__panel')];
            panels.forEach((panel, index) => {
                const extras = document.createElement('div');
                extras.className = 'hover-gallery__extras';
                [index - 1, index + 1].forEach((relatedIndex, extraIndex) => {
                    const relatedPanel = panels[(relatedIndex + panels.length) % panels.length];
                    const relatedImage = relatedPanel?.querySelector('img');
                    if (!relatedImage) return;
                    const extraImage = document.createElement('img');
                    extraImage.src = relatedImage.getAttribute('src');
                    extraImage.alt = '';
                    extraImage.loading = 'lazy';
                    extraImage.decoding = 'async';
                    extraImage.style.setProperty('--extra-index', extraIndex);
                    extras.appendChild(extraImage);
                });
                panel.appendChild(extras);
            });
        }
        const viewer = document.createElement('div');
        viewer.className = 'hover-gallery__viewer';
        viewer.setAttribute('aria-hidden', 'true');
        viewer.innerHTML = '<button type="button" aria-label="Close image">×</button><img alt="">';
        hoverGallery.appendChild(viewer);

        const closeViewer = () => {
            viewer.classList.remove('is-open');
            viewer.setAttribute('aria-hidden', 'true');
        };

        ring?.addEventListener('click', event => {
            const panel = event.target.closest('.hover-gallery__panel');
            const source = panel?.querySelector('img');
            if (!source) return;
            const preview = viewer.querySelector('img');
            preview.src = source.currentSrc || source.src;
            preview.alt = source.alt;
            viewer.classList.add('is-open');
            viewer.setAttribute('aria-hidden', 'false');
        });
        viewer.addEventListener('click', event => {
            if (event.target === viewer || event.target.closest('button')) closeViewer();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeViewer();
        });

        const observer = new IntersectionObserver(entries => {
            hoverGallery.classList.toggle('is-visible', entries[0].isIntersecting);
        }, { rootMargin:'0px 0px -12% 0px', threshold:.14 });
        observer.observe(hoverGallery);
    }

    /* 2. General 3D Tilt Effect on Cards */
    const tiltCards = document.querySelectorAll('.tilt-card');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const isLeadershipCard = card.classList.contains('leadership-card');
            const rxLimit = isLeadershipCard ? 6 : 12;
            const ryLimit = isLeadershipCard ? 7 : 14;
            const rx = Math.max(-rxLimit, Math.min(rxLimit, -y / 13));
            const ry = Math.max(-ryLimit, Math.min(ryLimit, x / 13));
            const lift = isLeadershipCard ? 3 : 8;
            const depth = isLeadershipCard ? 10 : 24;
            const scale = isLeadershipCard ? 1.004 : 1.018;
            card.style.setProperty('--glare-x', `${((x / rect.width) + .5) * 100}%`);
            card.style.setProperty('--glare-y', `${((y / rect.height) + .5) * 100}%`);
            if (isLeadershipCard) {
                card.style.transform = 'translate3d(0,-6px,0)';
            } else {
                card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0,-${lift}px,${depth}px) scale(${scale})`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = card.classList.contains('leadership-card')
                ? 'translate3d(0,0,0)'
                : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    });

    /* Mouse-following warm spotlight for About-page team portraits. */
    document.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('pointermove', event => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--team-spot-x', `${event.clientX - rect.left}px`);
            card.style.setProperty('--team-spot-y', `${event.clientY - rect.top}px`);
        }, { passive:true });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--team-spot-x', '50%');
            card.style.setProperty('--team-spot-y', '34%');
        });
    });

    /* Interactive atmosphere for the large About-page story panel. */
    const storyPanel = document.querySelector('.story-container');
    if (storyPanel) {
        storyPanel.addEventListener('pointermove', event => {
            const rect = storyPanel.getBoundingClientRect();
            storyPanel.style.setProperty('--story-x', `${event.clientX - rect.left}px`);
            storyPanel.style.setProperty('--story-y', `${event.clientY - rect.top}px`);
        }, { passive:true });
        storyPanel.addEventListener('pointerleave', () => {
            storyPanel.style.setProperty('--story-x', '28%');
            storyPanel.style.setProperty('--story-y', '35%');
        });
    }

    /* Mouse depth for the image-free Creative Signal and Studio Pulse. */
    const signalVisual = document.querySelector('.signal-visual');
    if (signalVisual) {
        signalVisual.addEventListener('pointermove', event => {
            const rect = signalVisual.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            signalVisual.style.setProperty('--signal-rx', `${y * -7}deg`);
            signalVisual.style.setProperty('--signal-ry', `${x * 9}deg`);
        }, { passive:true });
        signalVisual.addEventListener('pointerleave', () => {
            signalVisual.style.setProperty('--signal-rx', '0deg');
            signalVisual.style.setProperty('--signal-ry', '0deg');
        });
    }
    const pulseSystem = document.querySelector('.pulse-system');
    if (pulseSystem) {
        pulseSystem.addEventListener('pointermove', event => {
            const rect = pulseSystem.getBoundingClientRect();
            pulseSystem.style.setProperty('--pulse-x', `${event.clientX - rect.left}px`);
            pulseSystem.style.setProperty('--pulse-y', `${event.clientY - rect.top}px`);
        }, { passive:true });
    }
    const creativeEngine = document.querySelector('.creative-engine-stage');
    if (creativeEngine) {
        creativeEngine.addEventListener('pointermove', event => {
            const rect = creativeEngine.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            creativeEngine.style.setProperty('--engine-rx', `${y * -8}deg`);
            creativeEngine.style.setProperty('--engine-ry', `${x * 11}deg`);
        }, { passive:true });
        creativeEngine.addEventListener('pointerleave', () => {
            creativeEngine.style.setProperty('--engine-rx', '0deg');
            creativeEngine.style.setProperty('--engine-ry', '0deg');
        });
    }

    /* 3. Client Reviews Carousel Logic (About Page) */
    const reviewsTrack = document.getElementById('reviewsTrack');
    const prevReviewBtn = document.getElementById('prevReview');
    const nextReviewBtn = document.getElementById('nextReview');

    if (reviewsTrack && prevReviewBtn && nextReviewBtn) {
        let currentIndex = 0;
        const cards = reviewsTrack.querySelectorAll('.review-card');
        const totalCards = cards.length;

        function updateCarousel() {
            const cardWidth = cards[0].offsetWidth + 30; // card width + gap
            reviewsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        }

        nextReviewBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % totalCards;
            updateCarousel();
        });

        prevReviewBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + totalCards) % totalCards;
            updateCarousel();
        });

        // Pause auto-slide on hover
        let autoSlide = setInterval(() => {
            currentIndex = (currentIndex + 1) % totalCards;
            updateCarousel();
        }, 5000);

        reviewsTrack.addEventListener('mouseenter', () => clearInterval(autoSlide));
        reviewsTrack.addEventListener('mouseleave', () => {
            autoSlide = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalCards;
                updateCarousel();
            }, 5000);
        });
    }

    /* Performance: only animate and decode media close to the viewport. */
    const pageSections = [...document.querySelectorAll('main > section')];
    const pageVideos = [...document.querySelectorAll('video')];
    document.querySelectorAll('img').forEach(image => {
        image.decoding = 'async';
        if (!image.closest('main > section:first-child')) image.loading = 'lazy';
    });
    pageVideos.forEach(video => {
        video.preload = 'metadata';
        video.muted = true;
    });

    if ('IntersectionObserver' in window) {
        const sectionPerformanceObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                entry.target.classList.toggle('performance-paused', !entry.isIntersecting);
            });
        }, { rootMargin:'240px 0px', threshold:0 });
        pageSections.forEach(section => sectionPerformanceObserver.observe(section));

        const videoPerformanceObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    const playAttempt = video.play();
                    if (playAttempt?.catch) playAttempt.catch(() => {});
                } else {
                    video.pause();
                }
            });
        }, { rootMargin:'160px 0px', threshold:.05 });
        pageVideos.forEach(video => videoPerformanceObserver.observe(video));
    }

    /* 4. Contact Form Frontend Success State */
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (contactForm && formSuccess) {
        const selectedService = new URLSearchParams(location.search).get('service');
        const projectMessage = document.getElementById('message');
        if (selectedService && projectMessage) {
            projectMessage.value = `I'm interested in ${selectedService}. `;
            projectMessage.focus();
            projectMessage.setSelectionRange(projectMessage.value.length, projectMessage.value.length);
        }
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            formSuccess.style.display = 'block';
            contactForm.reset();
            setTimeout(() => {
                formSuccess.style.display = 'none';
            }, 5000);
        });
    }

    /* Expandable robot specification views below the cinematic section. */
    const mechExploreButton = document.getElementById('mechExploreButton');
    const mechSpecifications = document.getElementById('mechSpecifications');
    if (mechExploreButton && mechSpecifications) {
        mechExploreButton.addEventListener('click', () => {
            const isOpen = !mechSpecifications.classList.contains('is-open');
            mechSpecifications.classList.toggle('is-open', isOpen);
            mechSpecifications.setAttribute('aria-hidden', String(!isOpen));
            mechExploreButton.setAttribute('aria-expanded', String(isOpen));
            mechExploreButton.firstChild.textContent = isOpen ? 'Close Details ' : 'Explore More ';
            if (isOpen) {
                mechSpecifications.scrollIntoView({ behavior:'auto', block:'nearest' });
            }
        });
    }

    /* Inline related frames — remain inside the clicked image's own page section. */
    const inlineGalleryTargets = [...new Set([
        ...document.querySelectorAll('.home-projects img'),
        ...document.querySelectorAll('.about-page img'),
        ...document.querySelectorAll('.services-page img'),
        ...document.querySelectorAll('.portfolio-page img')
    ])];

    if (inlineGalleryTargets.length) {
        let activeInlinePanel = null;
        let activeInlineTrigger = null;

        const relatedKey = image => {
            const card = image.closest('article');
            const label = `${card?.querySelector('h3')?.textContent || ''} ${image.alt || ''}`.toLowerCase();
            if (/team|studio|artist|director|coordinator|collaborat|storyboard/.test(label)) return 'team';
            if (/aura|beauty|ugc|vertical|fashion/.test(label)) return 'aura';
            if (/watch|precision|product animation/.test(label)) return 'watch';
            if (/character|kids/.test(label)) return 'character';
            if (/gaming|echo frontier|game/.test(label)) return 'gaming';
            if (/electric muse|ai cinematic|ai film/.test(label)) return 'film';
            if (/camera|final render|visualization/.test(label)) return 'camera';
            if (/ai video|production/.test(label)) return 'ai';
            return 'car';
        };

        const relatedTitle = image => {
            const card = image.closest('article');
            return card?.querySelector('h3')?.textContent?.trim() || image.alt || 'Related Visuals';
        };

        const closeInlinePanel = () => {
            if (!activeInlinePanel) return;
            const panel = activeInlinePanel;
            panel.classList.remove('is-open');
            setTimeout(() => panel.remove(), 220);
            activeInlinePanel = null;
            activeInlineTrigger?.focus({ preventScroll:true });
            activeInlineTrigger = null;
        };

        const openInlinePanel = image => {
            const card = image.closest('article');
            const title = relatedTitle(image);

            /* Final Render is a real case study, so open that project instead of related frames. */
            if (/final render/i.test(title)) {
                const projectButton = card?.querySelector('.project-open');
                if (projectButton) {
                    projectButton.click();
                    return;
                }
            }

            closeInlinePanel();
            const key = relatedKey(image);
            const items = Array.from({ length:6 }, (_, index) =>
                `./assets/images/gallery/${key}-${String(index + 1).padStart(2,'0')}.webp`
            );
            const panel = document.createElement('div');
            panel.className = 'related-inline-panel';
            panel.innerHTML = `
                <div class="related-inline-panel__header">
                    <div><span>RELATED VISUALS</span><h3>${title}</h3></div>
                    <button type="button" class="related-inline-panel__back">← Back</button>
                </div>
                <div class="related-inline-panel__grid">
                    ${items.map((src,index) => `
                        <figure style="--frame-order:${index}">
                            <img src="${src}" alt="${title} related visual ${index + 1}">
                            <figcaption>${String(index + 1).padStart(2,'0')}</figcaption>
                        </figure>`).join('')}
                </div>`;
            const section = image.closest('section') || image.closest('main');
            section.appendChild(panel);
            activeInlinePanel = panel;
            activeInlineTrigger = image;
            panel.querySelector('.related-inline-panel__back').addEventListener('click', closeInlinePanel);
            requestAnimationFrame(() => {
                panel.classList.add('is-open');
                panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
            });
        };

        inlineGalleryTargets.forEach(image => {
            image.classList.add('opens-related-gallery');
            image.tabIndex = 0;
            image.setAttribute('role','button');
            image.setAttribute('aria-label', `Open related frames for ${relatedTitle(image)}`);
            image.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                openInlinePanel(image);
            });
            image.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openInlinePanel(image);
                }
            });
        });
    }

    /* Legacy modal gallery is intentionally disabled in favor of inline frames. */
    const legacyGalleryTargets = [];

    if (legacyGalleryTargets.length) {
        const galleryRoot = document.createElement('div');
        galleryRoot.className = 'related-gallery';
        galleryRoot.setAttribute('aria-hidden', 'true');
        galleryRoot.innerHTML = `
            <div class="related-gallery__backdrop" data-gallery-close></div>
            <section class="related-gallery__dialog" role="dialog" aria-modal="true" aria-label="Related project images">
                <header class="related-gallery__header">
                    <button class="related-gallery__back" type="button" data-gallery-close>← Back</button>
                    <div><span>RELATED VISUALS</span><h2 class="related-gallery__title"></h2></div>
                    <button class="related-gallery__close" type="button" data-gallery-close aria-label="Close gallery">×</button>
                </header>
                <div class="related-gallery__stage">
                    <button class="related-gallery__arrow related-gallery__arrow--prev" type="button" aria-label="Previous image">‹</button>
                    <img class="related-gallery__image" alt="">
                    <button class="related-gallery__arrow related-gallery__arrow--next" type="button" aria-label="Next image">›</button>
                    <span class="related-gallery__count"></span>
                </div>
                <div class="related-gallery__thumbs" aria-label="Gallery thumbnails"></div>
            </section>`;
        document.body.appendChild(galleryRoot);

        const galleryImage = galleryRoot.querySelector('.related-gallery__image');
        const galleryTitle = galleryRoot.querySelector('.related-gallery__title');
        const galleryCount = galleryRoot.querySelector('.related-gallery__count');
        const galleryThumbs = galleryRoot.querySelector('.related-gallery__thumbs');
        const previousButton = galleryRoot.querySelector('.related-gallery__arrow--prev');
        const nextButton = galleryRoot.querySelector('.related-gallery__arrow--next');
        let galleryItems = [];
        let galleryIndex = 0;
        let galleryTrigger = null;

        const galleryKey = image => {
            const card = image.closest('article');
            const label = `${card?.querySelector('h3')?.textContent || ''} ${image.alt || ''}`.toLowerCase();
            if (/team|studio|artist|director|coordinator|collaborat|storyboard/.test(label)) return 'team';
            if (/aura|beauty|ugc|vertical|fashion/.test(label)) return 'aura';
            if (/watch|precision|product animation/.test(label)) return 'watch';
            if (/character|kids/.test(label)) return 'character';
            if (/gaming|echo frontier|game/.test(label)) return 'gaming';
            if (/electric muse|ai cinematic|ai film/.test(label)) return 'film';
            if (/camera|final render|visualization/.test(label)) return 'camera';
            if (/ai video|production/.test(label)) return 'ai';
            return 'car';
        };

        const galleryName = image => {
            const card = image.closest('article');
            return card?.querySelector('h3')?.textContent?.trim() || image.alt || 'Project Gallery';
        };

        const renderGalleryImage = () => {
            const item = galleryItems[galleryIndex];
            galleryImage.classList.add('is-changing');
            const preload = new Image();
            preload.onload = () => {
                galleryImage.src = item;
                galleryImage.alt = `${galleryTitle.textContent} related visual ${galleryIndex + 1}`;
                requestAnimationFrame(() => galleryImage.classList.remove('is-changing'));
            };
            preload.src = item;
            galleryCount.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`;
            [...galleryThumbs.children].forEach((thumb, index) => {
                thumb.classList.toggle('is-active', index === galleryIndex);
                thumb.setAttribute('aria-current', index === galleryIndex ? 'true' : 'false');
            });
        };

        const openGallery = image => {
            const key = galleryKey(image);
            galleryItems = Array.from({ length: 6 }, (_, index) =>
                `./assets/images/gallery/${key}-${String(index + 1).padStart(2, '0')}.webp`
            );
            galleryIndex = 0;
            galleryTrigger = image;
            galleryTitle.textContent = galleryName(image);
            galleryThumbs.innerHTML = galleryItems.map((src, index) =>
                `<button type="button" aria-label="Open image ${index + 1}"><img src="${src}" alt=""></button>`
            ).join('');
            [...galleryThumbs.children].forEach((thumb, index) => {
                thumb.addEventListener('click', () => {
                    galleryIndex = index;
                    renderGalleryImage();
                });
            });
            galleryRoot.classList.add('is-open');
            galleryRoot.setAttribute('aria-hidden', 'false');
            document.body.classList.add('gallery-open');
            renderGalleryImage();
            galleryRoot.querySelector('.related-gallery__back').focus();
        };

        const closeGallery = () => {
            galleryRoot.classList.remove('is-open');
            galleryRoot.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('gallery-open');
            galleryTrigger?.focus({ preventScroll: true });
        };

        const moveGallery = direction => {
            galleryIndex = (galleryIndex + direction + galleryItems.length) % galleryItems.length;
            renderGalleryImage();
        };

        legacyGalleryTargets.forEach(image => {
            image.classList.add('opens-related-gallery');
            image.tabIndex = 0;
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label', `Open related images for ${galleryName(image)}`);
            image.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                openGallery(image);
            });
            image.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openGallery(image);
                }
            });
        });

        galleryRoot.querySelectorAll('[data-gallery-close]').forEach(button =>
            button.addEventListener('click', closeGallery)
        );
        previousButton.addEventListener('click', () => moveGallery(-1));
        nextButton.addEventListener('click', () => moveGallery(1));
        document.addEventListener('keydown', event => {
            if (!galleryRoot.classList.contains('is-open')) return;
            if (event.key === 'Escape') closeGallery();
            if (event.key === 'ArrowLeft') moveGallery(-1);
            if (event.key === 'ArrowRight') moveGallery(1);
        });
    }

});
