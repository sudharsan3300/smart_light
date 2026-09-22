/**
 * Configuration File: config.js
 * 
 * Centralized settings for the IoT Smart Light Energy Monitor.
 * Modify these settings to switch between Demo Mode and Real Hardware,
 * or when the ESP8266 IP address changes.
 */

const CONFIG = {
    // Set to true to run with realistic simulated telemetry (for viva/presentations without hardware)
    // Set to false to fetch real data from the ESP8266
    USE_MOCK_DATA: true,

    // ESP8266 Base URL (Default AP IP is http://192.168.4.1, or Station IP from your router)
    ESP8266_API_URL: "http://192.168.4.1",

    // Polling interval in milliseconds (2000 ms = 2 seconds)
    UPDATE_INTERVAL: 2000,

    // Network & Wi-Fi Details (Displayed on the dashboard)
    WIFI_SSID: "Smart_Light_IoT",
    ESP8266_IP: "192.168.4.1",

    // Target URL encoded into the QR code for smartphone access
    QR_URL: "http://192.168.4.1",

    // Hardware pin reference (informational)
    PINS: {
        RELAY: "D5 (GPIO14)",
        INA219_SDA: "D2 (GPIO4)",
        INA219_SCL: "D1 (GPIO5)",
        INA219_ADDR: "0x40"
    }
};

// Expose globally
window.CONFIG = CONFIG;
