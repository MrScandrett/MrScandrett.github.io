(function attachXenoGraphics(global) {
    'use strict';

    function parseHex(hex) {
        const value = hex.replace('#', '');
        const normalized = value.length === 3
            ? value.split('').map((part) => part + part).join('')
            : value.padEnd(6, '0').slice(0, 6);
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16)
        };
    }

    function rgba(hex, alpha) {
        const color = parseHex(hex);
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    class RenderLayer {
        constructor(name) {
            this.name = name;
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d');
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
        }

        resize(width, height, dpr) {
            const pixelWidth = Math.floor(width * dpr);
            const pixelHeight = Math.floor(height * dpr);
            if (this.canvas.width === pixelWidth && this.canvas.height === pixelHeight) return;
            this.width = width;
            this.height = height;
            this.dpr = dpr;
            this.canvas.width = pixelWidth;
            this.canvas.height = pixelHeight;
            this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        clear() {
            this.context.clearRect(0, 0, this.width, this.height);
        }
    }

    class NeonRenderer {
        constructor() {
            this.quality = 'high';
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.trails = new RenderLayer('motion-trails');
            this.lights = new RenderLayer('dynamic-lights');
            this.frame = 0;
        }

        setQuality(quality) {
            this.quality = ['low', 'medium', 'high'].includes(quality) ? quality : 'high';
            if (this.quality === 'low') this.trails.clear();
        }

        resize(width, height, dpr = 1) {
            this.width = width;
            this.height = height;
            this.dpr = dpr;
            this.trails.resize(width, height, dpr);
            this.lights.resize(width, height, dpr);
        }

        beginFrame(dt = 1 / 60) {
            this.frame += 1;
            this.lights.clear();
            if (this.quality === 'low') return;
            const context = this.trails.context;
            context.save();
            context.globalCompositeOperation = 'destination-out';
            context.fillStyle = `rgba(0,0,0,${Math.min(0.32, Math.max(0.045, dt * 5.2))})`;
            context.fillRect(0, 0, this.width, this.height);
            context.restore();
        }

        addTrail(x, y, angle, radius, color, intensity = 0.24) {
            if (this.quality === 'low') return;
            const context = this.trails.context;
            const length = radius * (this.quality === 'high' ? 2.8 : 1.8);
            const tailX = x - Math.cos(angle) * length;
            const tailY = y - Math.sin(angle) * length;
            const gradient = context.createLinearGradient(x, y, tailX, tailY);
            gradient.addColorStop(0, rgba(color, intensity));
            gradient.addColorStop(1, rgba(color, 0));
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.strokeStyle = gradient;
            context.lineWidth = Math.max(1, radius * 0.55);
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(tailX, tailY);
            context.stroke();
            context.restore();
        }

        addLight(x, y, radius, color, intensity = 0.28) {
            if (this.quality === 'low') return;
            const context = this.lights.context;
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, rgba(color, intensity));
            gradient.addColorStop(0.35, rgba(color, intensity * 0.5));
            gradient.addColorStop(1, rgba(color, 0));
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        compositeTrails(target) {
            if (this.quality === 'low') return;
            target.save();
            target.globalCompositeOperation = 'lighter';
            target.globalAlpha = this.quality === 'high' ? 0.9 : 0.55;
            target.drawImage(this.trails.canvas, 0, 0, this.width, this.height);
            target.restore();
        }

        compositeLighting(target) {
            if (this.quality !== 'low') {
                target.save();
                target.globalCompositeOperation = 'screen';
                target.globalAlpha = this.quality === 'high' ? 0.88 : 0.58;
                target.drawImage(this.lights.canvas, 0, 0, this.width, this.height);
                target.restore();
            }

            const vignette = target.createRadialGradient(
                this.width * 0.5,
                this.height * 0.48,
                Math.min(this.width, this.height) * 0.2,
                this.width * 0.5,
                this.height * 0.48,
                Math.max(this.width, this.height) * 0.72
            );
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(0.72, 'rgba(0,2,10,0.05)');
            vignette.addColorStop(1, this.quality === 'high' ? 'rgba(0,1,8,0.42)' : 'rgba(0,1,8,0.26)');
            target.fillStyle = vignette;
            target.fillRect(0, 0, this.width, this.height);

            if (this.quality === 'high') {
                target.save();
                target.globalAlpha = 0.018;
                target.fillStyle = '#b8f7ff';
                for (let y = 0; y < this.height; y += 3) target.fillRect(0, y, this.width, 1);
                target.restore();
            }
        }

        glowOrb(context, x, y, radius, color, intensity = 0.5) {
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 2.4);
            gradient.addColorStop(0, rgba(color, intensity));
            gradient.addColorStop(0.28, rgba(color, intensity * 0.42));
            gradient.addColorStop(1, rgba(color, 0));
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(x, y, radius * 2.4, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        drawNebula(context, cloud) {
            const gradient = context.createRadialGradient(
                cloud.x - cloud.radius * 0.15,
                cloud.y - cloud.radius * 0.08,
                cloud.radius * 0.04,
                cloud.x,
                cloud.y,
                cloud.radius
            );
            gradient.addColorStop(0, rgba(cloud.color, cloud.alpha));
            gradient.addColorStop(0.38, rgba(cloud.color, cloud.alpha * 0.42));
            gradient.addColorStop(1, rgba(cloud.color, 0));
            context.save();
            context.globalCompositeOperation = 'screen';
            context.fillStyle = gradient;
            context.scale(1, cloud.stretch || 0.55);
            context.beginPath();
            context.arc(cloud.x, cloud.y / (cloud.stretch || 0.55), cloud.radius, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        drawSpark(context, particle, alpha) {
            const size = particle.size || 2;
            if (this.quality === 'high' && size > 1.4) this.glowOrb(context, particle.x, particle.y, size * 1.4, particle.color, alpha * 0.18);
            context.save();
            context.globalAlpha = alpha;
            context.fillStyle = particle.color;
            context.translate(particle.x, particle.y);
            context.rotate(Math.atan2(particle.vy, particle.vx));
            context.fillRect(-size * 1.5, -size * 0.45, size * 3, size * 0.9);
            context.restore();
        }
    }

    global.XenoGraphics = Object.freeze({ NeonRenderer, RenderLayer, rgba });
}(window));
