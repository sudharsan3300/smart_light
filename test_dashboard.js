// Test script to verify dashboard logic, mock data simulation, and validation rules

// 1. Mock window and document environment
global.window = global;
global.document = {
    getElementById: (id) => ({
        id,
        textContent: '',
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        style: {},
        addEventListener: () => {},
        getContext: () => ({
            clearRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            closePath: () => {},
            stroke: () => {},
            fill: () => {},
            arc: () => {},
            fillText: () => {},
            roundRect: () => {},
            save: () => {},
            restore: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            measureText: () => ({ width: 50 }),
            scale: () => {}
        }),
        parentElement: { getBoundingClientRect: () => ({ width: 800, height: 240 }) }
    }),
    addEventListener: () => {}
};

console.log('--- TEST 1: Loading config.js ---');
require('./js/config.js');
console.log('CONFIG loaded:', CONFIG);
if (CONFIG.UPDATE_INTERVAL !== 2000) throw new Error('Expected UPDATE_INTERVAL 2000');
if (CONFIG.PINS.RELAY !== 'D5 (GPIO14)') throw new Error('Expected Relay D5');

console.log('--- TEST 2: Loading mockData.js ---');
require('./js/mockData.js');
const mockService = window.mockService;
const r1 = mockService.generateReading();
console.log('Mock reading 1 (Light ON):', r1);
if (r1.voltage < 4.8 || r1.voltage > 5.2) throw new Error('Voltage out of realistic range');
if (r1.current < 110 || r1.current > 130) throw new Error('Current out of realistic range');
if (r1.power <= 0) throw new Error('Power should be > 0 when light is ON');
if (r1.light !== true) throw new Error('Light should be ON');

mockService.setLightState(false);
const r2 = mockService.generateReading();
console.log('Mock reading 2 (Light OFF):', r2);
if (r2.light !== false) throw new Error('Light should be OFF');
if (r2.power !== 0.0) throw new Error('Power should be 0 when light is OFF');
if (r2.current > 1.0) throw new Error('Current should be near 0 when light is OFF');

console.log('--- TEST 3: Loading api.js and checking validation ---');
require('./js/api.js');
const apiService = window.apiService;
const validData = apiService.validateTelemetry({
    voltage: "5.02",
    current: "120.50",
    power: "0.60",
    energy: "0.0245",
    light: true
});
console.log('Validated telemetry:', validData);
if (validData.voltage !== 5.02 || validData.current !== 120.50 || validData.power !== 0.60) {
    throw new Error('Telemetry validation parse error');
}

// Test validation rejection on missing field
let failedAsExpected = false;
try {
    apiService.validateTelemetry({ voltage: 5.02, current: 120.5 }); // missing power, energy, light
} catch (e) {
    failedAsExpected = true;
    console.log('Validation correctly rejected missing fields:', e.message);
}
if (!failedAsExpected) throw new Error('Expected validation error for missing fields');

console.log('--- TEST 4: Loading chart.js ---');
require('./js/chart.js');
const chart = new window.PowerHistoryChart('powerChartCanvas', 25);
for (let i = 0; i < 35; i++) {
    chart.addDataPoint(0.55 + Math.random() * 0.1, `12:00:${i < 10 ? '0' + i : i}`);
}
console.log(`Chart buffer length after 35 additions (max 25): ${chart.data.length}`);
if (chart.data.length !== 25) throw new Error('Chart FIFO buffer did not cap at 25 points');

console.log('--- ALL AUTOMATED LOGIC TESTS PASSED SUCCESSFULLY! ---');
