/**
 * API Service: api.js
 * 
 * Handles HTTP REST communication with the ESP8266 NodeMCU.
 * Manages endpoints: /data, /on, /off with timeouts, error handling,
 * and seamless fallback to mock data when enabled.
 */

class Esp8266Api {
    constructor() {
        this.timeoutMs = 1800; // Fast abort before next 2-second cycle
    }

    /**
     * Fetch the latest sensor readings and light status
     * @returns {Promise<Object>} Telemetry data
     */
    async fetchData() {
        if (CONFIG.USE_MOCK_DATA) {
            return window.mockService.generateReading();
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const url = `${CONFIG.ESP8266_API_URL}/data`;
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return this.validateTelemetry(data);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Connection timeout: ESP8266 did not respond');
            }
            throw error;
        }
    }

    /**
     * Send command to turn light ON
     * @returns {Promise<boolean>} Success state
     */
    async turnLightOn() {
        if (CONFIG.USE_MOCK_DATA) {
            window.mockService.setLightState(true);
            return true;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const url = `${CONFIG.ESP8266_API_URL}/on`;
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to turn ON light (HTTP ${response.status})`);
            }

            return true;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Send command to turn light OFF
     * @returns {Promise<boolean>} Success state
     */
    async turnLightOff() {
        if (CONFIG.USE_MOCK_DATA) {
            window.mockService.setLightState(false);
            return true;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const url = `${CONFIG.ESP8266_API_URL}/off`;
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to turn OFF light (HTTP ${response.status})`);
            }

            return true;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Validate telemetry object structure and data types
     * @param {Object} data 
     * @returns {Object} Validated data
     */
    validateTelemetry(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid response: Expected JSON payload from ESP8266');
        }

        const requiredFields = ['voltage', 'current', 'power', 'energy', 'light'];
        const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);

        if (missingFields.length > 0) {
            throw new Error(`Sensor Data Incomplete: Missing [${missingFields.join(', ')}]`);
        }

        return {
            voltage: parseFloat(data.voltage),
            current: parseFloat(data.current),
            power: parseFloat(data.power),
            energy: parseFloat(data.energy),
            light: Boolean(data.light),
            isMock: false,
            timestamp: new Date().toLocaleTimeString()
        };
    }
}

// Global instance
window.apiService = new Esp8266Api();
