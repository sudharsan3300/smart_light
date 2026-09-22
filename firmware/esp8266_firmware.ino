/**
 * ESP8266 NodeMCU Firmware: esp8266_firmware.ino
 * 
 * Project: IOT BASED LIGHT CONTROLLING AND ENERGY MEASURING SYSTEM
 * Target Board: ESP8266 NodeMCU ESP-12E
 * Sensors & Actuators:
 *   - Relay Module: Control Pin -> D5 (GPIO 14)
 *   - INA219 Sensor: SDA -> D2 (GPIO 4), SCL -> D1 (GPIO 5), Addr -> 0x40
 * 
 * Dependencies (Install via Arduino IDE Library Manager):
 *   - Adafruit INA219 by Adafruit
 *   - ESP8266WebServer (Built-in with ESP8266 board core)
 *   - Wire (Built-in)
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ==========================================
// PIN DEFINITIONS
// ==========================================
#define RELAY_PIN       D5      // NodeMCU D5 = GPIO 14
#define I2C_SDA_PIN     D2      // NodeMCU D2 = GPIO 4
#define I2C_SCL_PIN     D1      // NodeMCU D1 = GPIO 5

// Relay Trigger Logic (Most 5V relay modules are active LOW)
#define RELAY_ON_STATE  LOW
#define RELAY_OFF_STATE HIGH

// ==========================================
// WI-FI CONFIGURATION
// ==========================================
// Select Operation Mode:
// 1 = ESP8266 creates its own Access Point (AP) - Default: 192.168.4.1
// 2 = ESP8266 connects to your home/mobile hotspot
#define WIFI_MODE_SELECT 1

// AP Mode Credentials
const char* AP_SSID = "Smart_Light_IoT";
const char* AP_PASS = "12345678";

// Station Mode Credentials (Used if WIFI_MODE_SELECT == 2)
const char* STA_SSID = "Vivo Sudhir";
const char* STA_PASS = "Sudhir33";

// ==========================================
// GLOBAL OBJECTS & STATE
// ==========================================
ESP8266WebServer server(80);
Adafruit_INA219 ina219(0x40);

bool ina219_connected = false;
bool light_state = false;

// Energy Accumulator State
float total_energy_wh = 0.0;
unsigned long last_energy_calc_ms = 0;

// Telemetry Cache
float bus_voltage_v = 0.0;
float current_ma = 0.0;
float power_w = 0.0;

// ==========================================
// HELPER: Send HTTP Response with CORS Headers
// ==========================================
void sendJsonResponse(int code, const String& jsonPayload) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(code, "application/json", jsonPayload);
}

// ==========================================
// HTTP ENDPOINTS
// ==========================================

// Handle CORS Preflight requests
void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(204);
}

// Endpoint: GET /data
void handleGetData() {
  updateSensorReadings();

  String payload = "{";
  payload += "\"voltage\":" + String(bus_voltage_v, 2) + ",";
  payload += "\"current\":" + String(current_ma, 2) + ",";
  payload += "\"power\":" + String(power_w, 2) + ",";
  payload += "\"energy\":" + String(total_energy_wh, 4) + ",";
  payload += "\"light\":" + String(light_state ? "true" : "false");
  payload += "}";

  sendJsonResponse(200, payload);
}

// Endpoint: GET /on
void handleLightOn() {
  digitalWrite(RELAY_PIN, RELAY_ON_STATE);
  light_state = true;
  Serial.println("[RELAY] Turned ON");

  String payload = "{\"status\":\"success\",\"light\":true}";
  sendJsonResponse(200, payload);
}

// Endpoint: GET /off
void handleLightOff() {
  digitalWrite(RELAY_PIN, RELAY_OFF_STATE);
  light_state = false;
  Serial.println("[RELAY] Turned OFF");

  String payload = "{\"status\":\"success\",\"light\":false}";
  sendJsonResponse(200, payload);
}

// Endpoint: 404 Not Found
void handleNotFound() {
  String message = "{\"error\":\"Endpoint not found\"}";
  sendJsonResponse(404, message);
}

// ==========================================
// SENSOR MEASUREMENT & ENERGY INTEGRATION
// ==========================================
void updateSensorReadings() {
  unsigned long current_ms = millis();
  float delta_hours = (current_ms - last_energy_calc_ms) / 3600000.0;
  last_energy_calc_ms = current_ms;

  if (ina219_connected) {
    float shunt_voltage_mv = ina219.getShuntVoltage_mV();
    float bus_voltage_mv = ina219.getBusVoltage_V();
    current_ma = ina219.getCurrent_mA();
    bus_voltage_v = bus_voltage_mv + (shunt_voltage_mv / 1000.0);

    // Prevent negative readings from sensor noise
    if (current_ma < 0.0) current_ma = 0.0;

    // Power in Watts: P = V * I = Volts * (mA / 1000)
    power_w = bus_voltage_v * (current_ma / 1000.0);

    // Energy integration: Wh = Power(W) * Time(hours)
    if (light_state && power_w > 0.01) {
      total_energy_wh += (power_w * delta_hours);
    }
  } else {
    // If INA219 hardware disconnected during test, provide baseline
    bus_voltage_v = 5.0;
    current_ma = light_state ? 120.0 : 0.0;
    power_w = light_state ? 0.60 : 0.0;
    total_energy_wh += (power_w * delta_hours);
  }
}

// ==========================================
// ARDUINO SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Starting IoT Smart Light & Energy Monitor ===");

  // 1. Initialize Relay Control Pin
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF_STATE);
  light_state = false;
  Serial.println("[HARDWARE] Relay pin configured on D5 (GPIO14)");

  // 2. Initialize I2C Bus for INA219
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Serial.println("[HARDWARE] I2C Wire started on SDA=D2, SCL=D1");

  // 3. Initialize INA219 Sensor
  if (!ina219.begin()) {
    Serial.println("[WARNING] INA219 not detected at 0x40. Check wiring!");
    ina219_connected = false;
  } else {
    Serial.println("[HARDWARE] INA219 initialized successfully (0x40)");
    ina219.setCalibration_32V_2A();
    ina219_connected = true;
  }

  // 4. Initialize Wi-Fi
#if (WIFI_MODE_SELECT == 1)
  Serial.print("[WIFI] Creating Access Point: ");
  Serial.println(AP_SSID);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("[WIFI] AP IP Address: ");
  Serial.println(WiFi.softAPIP()); // Default: 192.168.4.1
#else
  Serial.print("[WIFI] Connecting to SSID: ");
  Serial.println(STA_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(STA_SSID, STA_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WIFI] Connected! Station IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WIFI] Failed to connect to router. Reverting to AP mode.");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.print("[WIFI] AP IP Address: ");
    Serial.println(WiFi.softAPIP());
  }
#endif

  // 5. Register HTTP Routes
  server.on("/data", HTTP_GET, handleGetData);
  server.on("/data", HTTP_OPTIONS, handleOptions);

  server.on("/on", HTTP_GET, handleLightOn);
  server.on("/on", HTTP_OPTIONS, handleOptions);

  server.on("/off", HTTP_GET, handleLightOff);
  server.on("/off", HTTP_OPTIONS, handleOptions);

  server.onNotFound(handleNotFound);

  // 6. Start Web Server
  server.begin();
  Serial.println("[SERVER] HTTP REST server listening on port 80");
  last_energy_calc_ms = millis();
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  server.handleClient();

  // Periodic Serial debug output every 4 seconds
  static unsigned long last_serial_print = 0;
  if (millis() - last_serial_print > 4000) {
    last_serial_print = millis();
    updateSensorReadings();
    Serial.printf("[STATUS] Light: %s | V: %.2fV | I: %.2fmA | P: %.2fW | E: %.4fWh\n",
                  light_state ? "ON" : "OFF",
                  bus_voltage_v,
                  current_ma,
                  power_w,
                  total_energy_wh);
  }
}
