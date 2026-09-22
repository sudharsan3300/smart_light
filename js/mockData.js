/**
 * Mock Data Service: mockData.js
 * 
 * Provides realistic simulated telemetry for demonstration and viva presentations
 * when physical ESP8266 hardware is not connected.
 */

class MockDataService {
    constructor() {
        this.lightState = true;          // Initial light status: ON
        this.nominalVoltage = 5.02;      // 5V DC Prototype Supply
        this.nominalCurrent = 120.50;    // ~120mA prototype light load
        this.accumulatedEnergy = 0.0245; // Wh initial baseline
        this.lastTimestamp = Date.now();
    }

    /**
     * Set the mock light state
     * @param {boolean} state 
     */
    setLightState(state) {
        this.lightState = Boolean(state);
    }

    /**
     * Get the current mock light state
     * @returns {boolean}
     */
    getLightState() {
        return this.lightState;
    }

    /**
     * Generate fresh realistic sensor readings
     * @returns {Object} Telemetry data object
     */
    generateReading() {
        const now = Date.now();
        const deltaSeconds = (now - this.lastTimestamp) / 1000;
        this.lastTimestamp = now;

        // Small voltage fluctuation (+/- 0.03V)
        const voltageJitter = (Math.random() - 0.5) * 0.06;
        const voltage = +(this.nominalVoltage + voltageJitter).toFixed(2);

        let current = 0.0;
        let power = 0.0;

        if (this.lightState) {
            // Light is ON: ~118mA to 123mA load
            const currentJitter = (Math.random() - 0.5) * 4.0;
            current = +(this.nominalCurrent + currentJitter).toFixed(2);
            // P = V * I (in Watts)
            power = +((voltage * (current / 1000))).toFixed(2);
            // Energy increment: Wh = P(W) * hours
            const energyIncrement = power * (deltaSeconds / 3600);
            this.accumulatedEnergy += energyIncrement;
        } else {
            // Light is OFF: near zero residual current (< 0.5mA)
            current = +(Math.random() * 0.4).toFixed(2);
            power = 0.00;
        }

        const energy = +this.accumulatedEnergy.toFixed(4);

        return {
            voltage: voltage,
            current: current,
            power: power,
            energy: energy,
            light: this.lightState,
            isMock: true,
            timestamp: new Date().toLocaleTimeString()
        };
    }

    /**
     * Reset accumulated energy counter
     */
    resetEnergy() {
        this.accumulatedEnergy = 0.0000;
    }
}

// Global instance
window.mockService = new MockDataService();
