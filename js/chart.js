/**
 * Chart Component: chart.js
 * 
 * Standalone, ultra-responsive HTML5 Canvas real-time line chart.
 * Zero external CDN dependencies - 100% reliable offline when connected
 * directly to the ESP8266 SoftAP Wi-Fi network.
 */

class PowerHistoryChart {
    constructor(canvasId, maxPoints = 25) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element #${canvasId} not found`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.maxPoints = maxPoints;
        this.data = []; // Array of { time: string, value: number }

        this.init();
    }

    init() {
        this.resize();
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('resize', () => this.resize());
        }
        this.render();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        // High-DPI screen support (Retina / 4K displays)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = 240 * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `240px`;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = 240;
        this.render();
    }

    /**
     * Append a new power reading to the FIFO queue
     * @param {number} powerValue In Watts
     * @param {string} timeLabel Formatted time string
     */
    addDataPoint(powerValue, timeLabel) {
        const val = typeof powerValue === 'number' && !isNaN(powerValue) ? powerValue : 0;
        const label = timeLabel || new Date().toLocaleTimeString();

        this.data.push({
            value: val,
            time: label
        });

        // Maintain fixed window of recent readings
        if (this.data.length > this.maxPoints) {
            this.data.shift();
        }

        this.render();
    }

    render() {
        if (!this.ctx || !this.width || !this.height) return;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        const padding = { top: 25, right: 25, bottom: 35, left: 55 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        // Determine Y scale
        let maxVal = 1.0;
        if (this.data.length > 0) {
            const highest = Math.max(...this.data.map(d => d.value));
            maxVal = Math.max(highest * 1.25, 1.0);
        }
        // Round maxVal to nice clean increments
        maxVal = Math.ceil(maxVal * 10) / 10;

        // Draw horizontal grid lines and Y-axis labels
        const gridSteps = 4;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= gridSteps; i++) {
            const y = padding.top + (plotH / gridSteps) * i;
            const val = (maxVal - (maxVal / gridSteps) * i).toFixed(2);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            ctx.fillText(`${val} W`, padding.left - 10, y);
        }

        if (this.data.length < 2) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Accumulating real-time power telemetry...', w / 2, h / 2);
            return;
        }

        // Calculate (x, y) coordinates for data points
        const points = this.data.map((d, index) => {
            const x = padding.left + (plotW / (this.maxPoints - 1)) * (this.maxPoints - this.data.length + index);
            const y = padding.top + plotH - (d.value / maxVal) * plotH;
            return { x, y, val: d.value, time: d.time };
        });

        // 1. Draw smooth gradient area under curve
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');  // Emerald green top
        gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.10)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');  // Transparent bottom

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + plotH);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            // Smooth bezier control points
            const prev = points[i - 1];
            const curr = points[i];
            const cx = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
        }

        ctx.lineTo(points[points.length - 1].x, padding.top + plotH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // 2. Draw the glowing line
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cx = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
        }
        ctx.stroke();
        ctx.restore();

        // 3. Highlight the latest active reading point
        const latest = points[points.length - 1];
        ctx.save();
        ctx.beginPath();
        ctx.arc(latest.x, latest.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(latest.x, latest.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Readout badge above latest point
        const badgeText = `${latest.val.toFixed(2)} W`;
        ctx.font = 'bold 11px "Inter", sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const badgeX = Math.min(Math.max(latest.x, padding.left + textWidth / 2), w - padding.right - textWidth / 2);
        const badgeY = Math.max(latest.y - 12, padding.top + 8);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(badgeX - textWidth / 2 - 6, badgeY - 12, textWidth + 12, 18, 4);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX, badgeY - 3);
        ctx.restore();

        // 4. X-Axis Time labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Draw first, middle, and latest time labels
        const indices = [0, Math.floor(points.length / 2), points.length - 1];
        indices.forEach(idx => {
            const p = points[idx];
            if (p) {
                ctx.fillText(p.time, p.x, padding.top + plotH + 8);
            }
        });
    }

    clear() {
        this.data = [];
        this.render();
    }
}

// Global instance exposed on initialization
window.PowerHistoryChart = PowerHistoryChart;
