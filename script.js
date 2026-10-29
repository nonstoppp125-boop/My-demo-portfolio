/**
 * DYNAMIC GLASS WORKSPACE CORE CONTROLLER ENGINE
 * Orchestrates Particle systems, Multi-layered UI routes, 
 * Dynamic Color Swapping and tracked SVG transformations.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- SECTION ROUTING MANAGER ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.viewport-section');
    const ctaTriggers = document.querySelectorAll('.call-to-action-trigger');

    function switchViewport(targetId) {
        sections.forEach(section => {
            section.classList.remove('active');
            if(section.getAttribute('id') === targetId) {
                section.classList.add('active');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if(item.getAttribute('href') === `#${targetId}`) {
                item.classList.add('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const id = item.getAttribute('href').slice(1);
            switchViewport(id);
        });
    });

    ctaTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const id = trigger.getAttribute('href').slice(1);
            switchViewport(id);
        });
    });


    // --- CHROMATIC COLOR ENGINE CONFIGURATION ---
    const themeButtons = document.querySelectorAll('.theme-btn');
    const blurSlider = document.getElementById('blurSlider');
    const auraVal = document.getElementById('auraVal');

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const hue = btn.getAttribute('data-hue');
            const sat = btn.getAttribute('data-sat');
            const light = btn.getAttribute('data-light');

            document.documentElement.style.setProperty('--theme-hue', hue);
            document.documentElement.style.setProperty('--theme-sat', sat);
            document.documentElement.style.setProperty('--theme-light', light);
            
            // Re-render primary aura glow calculations programmatically
            document.documentElement.style.setProperty('--primary-aura-glow', `rgba(${hue}, 85%, 60%, 0.4)`);
        });
    });

    if (blurSlider) {
        blurSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            auraVal.textContent = `${val}px`;
            document.documentElement.style.setProperty('--blur-factor', `${val}px`);
        });
    }


    // --- LIVE CANVAS PARTICLE FLUID SIMULATION ---
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray = [];
        let mouse = { x: null, y: null, radius: 160 };

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 3 + 1;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 40) + 10;
                this.color = `hsla(${Math.random() * 40 + 260}, 80%, 65%, 0.15)`;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
            update() {
                // Fluid vector physics response equations
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.hypot(dx, dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = mouse.radius;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * this.density;
                let directionY = forceDirectionY * force * this.density;

                if (distance < mouse.radius) {
                    this.x -= directionX;
                    this.y -= directionY;
                } else {
                    if (this.x !== this.baseX) {
                        let dxBack = this.x - this.baseX;
                        this.x -= dxBack / 15;
                    }
                    if (this.y !== this.baseY) {
                        let dyBack = this.y - this.baseY;
                        this.y -= dyBack / 15;
                    }
                }
            }
        }

        function initParticles() {
            particlesArray = [];
            const quantity = Math.floor((canvas.width * canvas.height) / 9000);
            for (let i = 0; i < quantity; i++) {
                let x = Math.random() * canvas.width;
                let y = Math.random() * canvas.height;
                particlesArray.push(new Particle(x, y));
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].draw();
                particlesArray[i].update();
            }
            requestAnimationFrame(animateParticles);
        }
        
        initParticles();
        animateParticles();
        window.addEventListener('resize', initParticles);
    }


    // --- ADVANCED 3D MASCOT VECTOR CURSOR INTERACTION ENGINE ---
    const mascotWrapper = document.getElementById('mascotWrapper');
    const mascotObject = document.getElementById('interactiveMascot');

    window.addEventListener('mousemove', (e) => {
        if (!mascotWrapper) return;
        
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        // Mathematical conversion to rotation degrees for perspective shifts
        const rotX = (-dy / cy) * 18; 
        const rotY = (dx / cx) * 22; 

        mascotWrapper.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(20px)`;

        // Access internal SVG layers from inside Object Document to update focus coordinates
        if (mascotObject && mascotObject.contentDocument) {
            const svgDoc = mascotObject.contentDocument;
            const eyes = svgDoc.querySelectorAll('.mascot-eye-pupil');
            
            eyes.forEach(pupil => {
                // Constrain eye offset movement within boundaries
                const lookX = (dx / cx) * 5;
                const lookY = (dy / cy) * 5;
                pupil.style.transform = `translate(${lookX}px, ${lookY}px)`;
            });
        }
    });

    // Custom Interactive Mascot Action Trigger
    const waveTrigger = document.getElementById('triggerMascotWave');
    if(waveTrigger) {
        waveTrigger.addEventListener('click', () => {
            if (mascotObject && mascotObject.contentDocument) {
                const svgDoc = mascotObject.contentDocument;
                const arm = svgDoc.getElementById('mascotWavingArm');
                if(arm) {
                    arm.style.transformOrigin = 'center bottom';
                    arm.animate([
                        { transform: 'rotate(0deg)' },
                        { transform: 'rotate(-25deg)' },
                        { transform: 'rotate(15deg)' },
                        { transform: 'rotate(-25deg)' },
                        { transform: 'rotate(0deg)' }
                    ], {
                        duration: 800,
                        iterations: 1
                    });
                }
            }
            // Temporal pulse animation on ambient orbs
            const orb1 = document.getElementById('orb1');
            if(orb1) {
                orb1.style.transform = 'scale(1.4) translateY(-80px)';
                setTimeout(() => {
                    if(orb1) orb1.style.transform = 'none';
                }, 1500);
            }
        });
    }
});
