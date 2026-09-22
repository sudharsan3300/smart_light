/**
 * Main Application Controller: app.js
 * 
 * Coordinates polling, UI updates, sensor card readouts, light control commands,
 * mode toggling (Demo vs Real ESP8266), and connection lifecycle management.
 */

class SmartLightApp {
    constructor() {
        // State
        this.pollTimer = null;
        this.lastUpdateTime = null;
        this.timeAgoTimer = null;
        this.isProcessingCommand = false;
        this.consecutiveFailures = 0;

        // UI Element References
        this.dom = {
            // Header & Status
            connectionBadge: document.getElementById('connectionBadge'),
            connectionText: document.getElementById('connectionText'),
            lastUpdatedText: document.getElementById('lastUpdatedText'),
            modeToggleBtn: document.getElementById('modeToggleBtn'),
            modeBadge: document.getElementById('modeBadge'),
            errorBanner: document.getElementById('errorBanner'),
            errorMessage: document.getElementById('errorMessage'),

            // Light Control
            lightStatusCard: document.getElementById('lightStatusCard'),
            lightStatusText: document.getElementById('lightStatusText'),
            lightBulbVisual: document.getElementById('lightBulbVisual'),
            btnTurnOn: document.getElementById('btnTurnOn'),
            btnTurnOff: document.getElementById('btnTurnOff'),

            // Telemetry Cards
            voltageVal: document.getElementById('voltageVal'),
            currentVal: document.getElementById('currentVal'),
            powerVal: document.getElementById('powerVal'),
            energyVal: document.getElementById('energyVal'),

            // Network Information
            espIpDisplay: document.getElementById('espIpDisplay'),
            wifiSsidDisplay: document.getElementById('wifiSsidDisplay'),
            apiUrlInput: document.getElementById('apiUrlInput'),
            btnSaveApiUrl: document.getElementById('btnSaveApiUrl'),

            // Toast
            toast: document.getElementById('toastNotification')
        };
    }

    init() {
        console.log('Initializing Smart Light Energy Monitor Dashboard...');

        // 1. Initialize Chart
        this.chart = new PowerHistoryChart('powerChartCanvas', 25);

        // 2. Initialize QR Code
        window.qrManager.init();

        // 3. Bind Event Listeners
        this.bindEvents();

        // 4. Update initial UI states from CONFIG
        this.updateNetworkConfigUI();
        this.updateModeUI();

        // 5. Start Polling Loop
        this.fetchCycle();
        this.pollTimer = setInterval(() => this.fetchCycle(), CONFIG.UPDATE_INTERVAL);

        // 6. Start "Last Updated X seconds ago" ticker (every 1 second)
        this.timeAgoTimer = setInterval(() => this.updateTimeAgo(), 1000);
    }

    bindEvents() {
        // Turn Light ON
        if (this.dom.btnTurnOn) {
            this.dom.btnTurnOn.addEventListener('click', () => this.handleLightCommand(true));
        }

        // Turn Light OFF
        if (this.dom.btnTurnOff) {
            this.dom.btnTurnOff.addEventListener('click', () => this.handleLightCommand(false));
        }

        // Toggle Demo Mode / Real Mode
        if (this.dom.modeToggleBtn) {
            this.dom.modeToggleBtn.addEventListener('click', () => this.toggleDemoMode());
        }

        // Save Custom ESP8266 API URL
        if (this.dom.btnSaveApiUrl && this.dom.apiUrlInput) {
            this.dom.btnSaveApiUrl.addEventListener('click', () => {
                const newUrl = this.dom.apiUrlInput.value.trim();
                if (newUrl) {
                    CONFIG.ESP8266_API_URL = newUrl;
                    CONFIG.QR_URL = newUrl;
                    window.qrManager.renderQr(newUrl);
                    this.updateNetworkConfigUI();
                    this.showToast(`Updated ESP8266 API URL to: ${newUrl}`);
                    this.fetchCycle(); // trigger immediate fetch
                }
            });
        }
    }

    /**
     * Periodic Telemetry Fetch Cycle
     */
    async fetchCycle() {
        try {
            const telemetry = await window.apiService.fetchData();
            this.handleTelemetrySuccess(telemetry);
        } catch (error) {
            this.handleTelemetryError(error);
        }
    }

    /**
     * Process valid telemetry readings
     */
    handleTelemetrySuccess(data) {
        this.consecutiveFailures = 0;
        this.lastUpdateTime = Date.now();
        this.hideErrorBanner();

        // 1. Connection status
        if (data.isMock) {
            this.setConnectionStatus('demo', 'DEMO MODE (Simulated ESP8266)');
        } else {
            this.setConnectionStatus('connected', 'ESP8266 Connected');
        }

        // 2. Update Sensor Values
        if (this.dom.voltageVal) this.dom.voltageVal.textContent = data.voltage.toFixed(2);
        if (this.dom.currentVal) this.dom.currentVal.textContent = data.current.toFixed(2);
        if (this.dom.powerVal) this.dom.powerVal.textContent = data.power.toFixed(2);
        if (this.dom.energyVal) this.dom.energyVal.textContent = data.energy.toFixed(4);

        // 3. Update Light Status UI
        this.updateLightUI(data.light);

        // 4. Append to Real-Time Chart
        if (this.chart) {
            this.chart.addDataPoint(data.power, data.timestamp);
        }

        // 5. Update ticker immediately
        this.updateTimeAgo();
    }

    /**
     * Handle connection or sensor data failures
     */
    handleTelemetryError(error) {
        this.consecutiveFailures++;
        console.warn('Telemetry cycle error:', error.message);

        // Update connection status
        this.setConnectionStatus('error', 'Connection Lost');

        // Show banner after 2 consecutive failures
        if (this.consecutiveFailures >= 1) {
            this.showErrorBanner(
                CONFIG.USE_MOCK_DATA
                    ? `Simulation error: ${error.message}`
                    : `Cannot reach ESP8266 at ${CONFIG.ESP8266_API_URL}. Check Wi-Fi connection and IP address.`
            );
        }
    }

    /**
     * Send ON / OFF commands with UI feedback and state protection
     */
    async handleLightCommand(turnOn) {
        if (this.isProcessingCommand) return;
        this.isProcessingCommand = true;

        const targetBtn = turnOn ? this.dom.btnTurnOn : this.dom.btnTurnOff;
        if (targetBtn) targetBtn.classList.add('loading');

        try {
            if (turnOn) {
                await window.apiService.turnLightOn();
                this.showToast('Command Sent: Light Turned ON');
            } else {
                await window.apiService.turnLightOff();
                this.showToast('Command Sent: Light Turned OFF');
            }

            // Immediately run a cycle to reflect state
            setTimeout(() => this.fetchCycle(), 200);
        } catch (error) {
            this.showToast(`Error: ${error.message}`);
            this.showErrorBanner(`Failed to execute light command: ${error.message}`);
        } finally {
            if (targetBtn) targetBtn.classList.remove('loading');
            this.isProcessingCommand = false;
        }
    }

    /**
     * Update the visual appearance of the Light Status Card
     */
    updateLightUI(isLightOn) {
        if (!this.dom.lightStatusCard || !this.dom.lightStatusText) return;

        if (isLightOn) {
            this.dom.lightStatusCard.classList.add('is-on');
            this.dom.lightStatusCard.classList.remove('is-off');
            this.dom.lightStatusText.textContent = 'LIGHT ON';
            if (this.dom.btnTurnOn) this.dom.btnTurnOn.classList.add('active');
            if (this.dom.btnTurnOff) this.dom.btnTurnOff.classList.remove('active');
        } else {
            this.dom.lightStatusCard.classList.add('is-off');
            this.dom.lightStatusCard.classList.remove('is-on');
            this.dom.lightStatusText.textContent = 'LIGHT OFF';
            if (this.dom.btnTurnOff) this.dom.btnTurnOff.classList.add('active');
            if (this.dom.btnTurnOn) this.dom.btnTurnOn.classList.remove('active');
        }
    }

    /**
     * Set connection status badge and indicator
     */
    setConnectionStatus(state, text) {
        if (!this.dom.connectionBadge || !this.dom.connectionText) return;

        this.dom.connectionBadge.className = 'status-badge ' + state;
        this.dom.connectionText.textContent = text;
    }

    /**
     * Update "Last updated: X seconds ago" counter
     */
    updateTimeAgo() {
        if (!this.dom.lastUpdatedText || !this.lastUpdateTime) {
            if (this.dom.lastUpdatedText) this.dom.lastUpdatedText.textContent = 'Awaiting data...';
            return;
        }

        const elapsedSeconds = Math.floor((Date.now() - this.lastUpdateTime) / 1000);
        if (elapsedSeconds <= 1) {
            this.dom.lastUpdatedText.textContent = 'Updated just now';
        } else {
            this.dom.lastUpdatedText.textContent = `Updated ${elapsedSeconds} seconds ago`;
        }
    }

    /**
     * Toggle Demo Mode on and off at runtime
     */
    toggleDemoMode() {
        CONFIG.USE_MOCK_DATA = !CONFIG.USE_MOCK_DATA;
        this.updateModeUI();

        if (CONFIG.USE_MOCK_DATA) {
            this.showToast('Switched to DEMO MODE (Simulated Telemetry)');
            this.hideErrorBanner();
        } else {
            this.showToast(`Switched to REAL ESP8266 MODE (${CONFIG.ESP8266_API_URL})`);
        }

        this.fetchCycle();
    }

    updateModeUI() {
        if (this.dom.modeBadge) {
            if (CONFIG.USE_MOCK_DATA) {
                this.dom.modeBadge.textContent = 'DEMO MODE';
                this.dom.modeBadge.className = 'mode-badge demo';
            } else {
                this.dom.modeBadge.textContent = 'REAL HARDWARE';
                this.dom.modeBadge.className = 'mode-badge real';
            }
        }

        if (this.dom.modeToggleBtn) {
            this.dom.modeToggleBtn.textContent = CONFIG.USE_MOCK_DATA
                ? 'Switch to Real ESP8266'
                : 'Switch to Demo Mode';
        }
    }

    updateNetworkConfigUI() {
        if (this.dom.espIpDisplay) {
            this.dom.espIpDisplay.textContent = CONFIG.ESP8266_IP;
        }
        if (this.dom.wifiSsidDisplay) {
            this.dom.wifiSsidDisplay.textContent = CONFIG.WIFI_SSID;
        }
        if (this.dom.apiUrlInput) {
            this.dom.apiUrlInput.value = CONFIG.ESP8266_API_URL;
        }
    }

    showErrorBanner(message) {
        if (this.dom.errorBanner && this.dom.errorMessage) {
            this.dom.errorMessage.textContent = message;
            this.dom.errorBanner.style.display = 'flex';
        }
    }

    hideErrorBanner() {
        if (this.dom.errorBanner) {
            this.dom.errorBanner.style.display = 'none';
        }
    }

    showToast(message) {
        if (!this.dom.toast) return;
        this.dom.toast.textContent = message;
        this.dom.toast.classList.add('visible');
        setTimeout(() => {
            this.dom.toast.classList.remove('visible');
        }, 2600);
    }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SmartLightApp();
    window.app.init();
});
