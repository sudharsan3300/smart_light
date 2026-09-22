# IOT BASED LIGHT CONTROLLING AND ENERGY MEASURING SYSTEM
### Smart Light Energy Monitor - Web Dashboard & ESP8266 Firmware

---

## 1. Project Overview

The **IoT Based Light Controlling and Energy Measuring System** is an integrated Internet-of-Things (IoT) engineering solution designed to remotely actuate electrical lighting while continuously measuring and visualizing real-time electrical parameters.

The system integrates an **ESP8266 NodeMCU (ESP-12E)** microcontroller, an **electromechanical relay module**, and a high-precision **INA219 I2C digital power monitor**. Telemetry is transmitted over Wi-Fi to a modern, responsive web dashboard that calculates instantaneous power, integrates cumulative energy consumption, and provides intuitive remote control.

---

## 2. Project Objective

1. **Remote Appliance Actuation**: Allow users to toggle lighting wirelessly from any web browser on a laptop, tablet, or smartphone.
2. **Precision Electrical Sensing**: Acquire live bus voltage and load current at high resolution via the INA219 sensor.
3. **Real-Time Energy Accounting**: Calculate instantaneous power ($P = V \times I$) and integrate cumulative energy consumed ($Wh$) over time.
4. **Interactive Dashboard**: Deliver a responsive, glassmorphic monitoring dashboard with real-time rolling charts, connection diagnostics, and QR code pairing.
5. **Viva & Demonstration Readiness**: Feature a built-in **Demo Mode** allowing complete project demonstration even if physical hardware or Wi-Fi is temporarily unavailable.

---

## 3. Hardware Used

| Hardware Component | Specification / Model | Function |
| :--- | :--- | :--- |
| **Microcontroller** | ESP8266 NodeMCU (ESP-12E) | Core processor, Wi-Fi web server, I2C master |
| **Relay Module** | 5V 1-Channel Relay (Optocoupler isolated) | Physical load switching (Actuator) |
| **Current / Voltage Sensor**| INA219 High-Side DC Monitor ($0.1\Omega$ shunt) | Measures bus voltage ($0-26\text{V}$) & current ($\le 3.2\text{A}$) |
| **Load / Light** | Low-voltage DC LED / Bulb | Prototype load for safe laboratory demonstration |
| **Power Supply** | 9V DC Battery / 5V USB Source | System power supply |
| **Wiring & Passive Parts**| Jumper wires, breadboard, terminal blocks | Circuit interconnection |

---

## 4. Features

- **Bidirectional Control**: Instantaneous `[ TURN ON ]` and `[ TURN OFF ]` light actuation with visual glowing state indicators.
- **Real-Time Telemetry Cards**:
  - **Voltage**: Bus voltage in Volts ($V$).
  - **Current**: Load current in Milliamperes ($mA$).
  - **Power**: Instantaneous power in Watts ($W$).
  - **Energy**: Accumulated consumption in Watt-hours ($Wh$).
- **Rolling Real-Time Power Chart**: HTML5 Canvas graph tracking the rolling last 25 readings without third-party CDN bloat.
- **Dynamic QR Code Access**: Generates a QR code on-screen for one-scan smartphone access; includes **Copy URL** and **Download PNG** buttons.
- **Zero-Config Demo Mode**: Generates realistic DC load jitter and accumulated energy drift when hardware is offline.
- **Connection Diagnostics**: Automatic heartbeat detection with clear status indicators (🟢 Connected / 🔴 Connection Lost / 🟡 Demo Mode).

---

## 5. Technology Used

- **Frontend**: Semantic HTML5, Modern CSS3 (CSS Grid, Flexbox, Glassmorphism, CSS Custom Properties), Vanilla JavaScript (ES6+ Classes).
- **Visualization**: Standalone HTML5 Canvas 2D engine (100% offline-compatible; does not fail when connected to offline ESP8266 SoftAP).
- **Communication Protocol**: HTTP RESTful API with CORS (`Access-Control-Allow-Origin: *`).
- **Firmware**: Arduino C++ for ESP8266, Adafruit INA219 library, ESP8266WebServer.

---

## 6. Project Structure

```text
smart-light-dashboard/
│
├── index.html                  # Semantic dashboard structure and UI elements
├── README.md                   # Complete documentation and viva defense manual
│
├── css/
│   └── style.css               # Glassmorphic dark theme, responsive grid, animations
│
├── js/
│   ├── config.js               # Centralized configuration variables
│   ├── mockData.js             # Realistic telemetry simulation for Demo Mode
│   ├── api.js                  # REST API client with abort timeout and error handling
│   ├── chart.js                # Canvas-based real-time 25-point rolling power graph
│   ├── qr.js                   # QR code generation, clipboard copy, and PNG export
│   └── app.js                  # Application orchestrator, polling loop, and UI binders
│
└── firmware/
    └── esp8266_firmware.ino    # Arduino sketch for NodeMCU ESP-12E
```

---

## 7. How to Run Locally

You can run the dashboard locally on any computer using a simple local web server:

### Option A: Using Python (Recommended & Easiest)
Open a terminal in the `smart-light-dashboard` directory:
```bash
python -m http.server 8080
```
Then navigate to: `http://localhost:8080` in your web browser.

### Option B: Using Node.js
```bash
npx serve .
```

### Option C: Direct File Opening
Double-click `index.html` to open it directly in Google Chrome, Microsoft Edge, or Firefox.

---

## 8. How DEMO MODE Works

When physical hardware is disconnected or during a viva presentation without Wi-Fi:
1. `mockData.js` automatically simulates realistic physical phenomena.
2. When the light is **ON**: Voltage hovers at $5.02\text{V} \pm 0.03\text{V}$, current hovers around $120.5\text{mA} \pm 2\text{mA}$, power computes to $\approx 0.60\text{W}$, and cumulative energy increments smoothly every 2 seconds.
3. When the light is **OFF**: Current drops to residual noise ($< 0.4\text{mA}$), power drops to $0.00\text{W}$, and energy accumulation pauses.
4. The status badge displays **DEMO MODE** in high-contrast amber so simulated data is never mistaken for physical readings.

---

## 9. How to Enable Real ESP8266 Data

There are two easy ways to switch to live ESP8266 data:

1. **Direct UI Switch (Instant)**:
   Click the **"Switch to Real ESP8266"** button in the dashboard header.
2. **Configuration File**:
   Open `js/config.js` and set:
   ```javascript
   USE_MOCK_DATA: false
   ```

---

## 10. ESP8266 API Endpoints

The ESP8266 HTTP web server exposes three primary REST endpoints on port 80:

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/data` | Returns latest sensor readings and actuator state as JSON |
| `GET` | `/on` | Energizes relay pin D5 and activates the light |
| `GET` | `/off` | De-energizes relay pin D5 and turns off the light |

---

## 11. Expected JSON Format

### Endpoint: `GET /data`
```json
{
  "voltage": 5.02,
  "current": 120.50,
  "power": 0.60,
  "energy": 0.0245,
  "light": true
}
```

### Field Definitions:
- `voltage`: Bus voltage measured across the load in Volts ($V$).
- `current`: Load current measured across the shunt resistor in Milliamperes ($mA$).
- `power`: Computed real-time power in Watts ($W$).
- `energy`: Integrated cumulative energy consumption in Watt-hours ($Wh$).
- `light`: Boolean state (`true` = ON, `false` = OFF).

---

## 12. How to Change the ESP8266 IP Address

When switching from Access Point mode to a home router or phone hotspot:
1. **Via the Dashboard UI**:
   Scroll to the **"ESP8266 API Target URL"** card at the bottom, type your new IP (e.g., `http://172.18.240.57`), and click **"Set IP"**.
2. **Via `js/config.js`**:
   Update `ESP8266_API_URL` and `QR_URL`:
   ```javascript
   ESP8266_API_URL: "http://172.18.240.57",
   QR_URL: "http://172.18.240.57"
   ```

---

## 13. How the QR Code Works

- The QR code dynamically encodes the URL configured in `CONFIG.QR_URL`.
- During your presentation, examiners or teammates can scan the QR code with their mobile phone cameras to immediately launch the dashboard on their phone.
- **Copy URL**: One-click copies the link to your clipboard.
- **Download QR**: Exports the QR code as a high-resolution PNG image for project presentation slides or print reports.
- *Note*: The mobile phone and laptop must be connected to the same Wi-Fi network or directly to the ESP8266's `Smart_Light_IoT` Wi-Fi hotspot.

---

## 14. How to Switch Between DEMO and REAL Mode

Click the button in the top right header:
- When in Demo Mode: Button reads **"Switch to Real ESP8266"**.
- When in Real Hardware Mode: Button reads **"Switch to Demo Mode"**.

---

## 15. Hardware Pin Configuration

| Component Pin | NodeMCU Board Pin | ESP8266 GPIO | Description |
| :--- | :--- | :--- | :--- |
| **Relay Signal (IN)** | **D5** | GPIO 14 | Digital Output (Active LOW / HIGH) |
| **Relay VCC** | 5V / Vin | 5V Rail | Powers the 5V relay coil |
| **Relay GND** | GND | Ground | Common Ground |
| **INA219 SDA** | **D2** | GPIO 4 | I2C Serial Data |
| **INA219 SCL** | **D1** | GPIO 5 | I2C Serial Clock |
| **INA219 VCC** | 3V3 | 3.3V Rail | Sensor Logic Supply |
| **INA219 GND** | GND | Ground | Common Ground |

---

## 16. Important INA219 Limitation & AC Safety Note

> [!WARNING]
> **Academic & Viva Safety Distinction**:
> The **INA219** is an integrated DC high-side current and voltage sensor rated up to **26V DC and 3.2A DC**.
>
> 1. **Prototype Setup**: This college engineering prototype utilizes a **low-voltage DC source (e.g. 5V - 9V DC)** and a DC light load (LED / 5V DC bulb). The INA219 measures this accurately.
> 2. **AC Mains (230V AC) Deployment**: The INA219 **MUST NEVER** be connected directly to 230V AC mains electrical lines. Doing so will immediately destroy the sensor and presents severe electrical shock/fire hazards.
> 3. **Industrial Extension**: If scaling to an AC household appliance, an optoisolated energy metering module such as the **PZEM-004T** or an **SCT-013 non-invasive Current Transformer (CT)** paired with a voltage transformer must be used.

---

## 17. Troubleshooting

| Symptom | Probable Cause | Remediation |
| :--- | :--- | :--- |
| **"Connection Lost"** banner appears | Laptop is not on the same Wi-Fi as ESP8266 | Connect laptop to `Smart_Light_IoT` Wi-Fi hotspot or ensure both are on the same mobile hotspot. |
| **CORS Error** in browser console | Firmware missing CORS headers | Ensure you flashed `firmware/esp8266_firmware.ino` which includes `Access-Control-Allow-Origin: *`. |
| **Sensor reads 0.00V / 0mA** | INA219 I2C wiring issue | Check SDA is on **D2** and SCL is on **D1**. Check pullup resistors and I2C address (0x40). |
| **Relay stays ON or doesn't toggle** | Inverted active logic | Check `#define RELAY_ON_STATE` in the `.ino` firmware (some relays require `LOW`, others `HIGH`). |
| **QR Code does not load image** | Offline presentation | The built-in offline vector QR engine automatically renders a local pattern if external internet is absent. |

---

## 18. Viva-Friendly Explanation of the Architecture

When the project examiner asks: *"Explain how your IoT system works from sensor to dashboard"*, use this three-layer explanation:

1. **Perception & Actuation Layer**:
   - The **INA219** measures the voltage drop across a precision $0.1\Omega$ internal shunt resistor using a 12-bit ADC. It digitizes the bus voltage and current, transmitting values to the ESP8266 via the **I2C serial protocol** ($400\text{kHz}$ clock on pins D1/D2).
   - The **Relay** acts as an electrically operated galvanic switch controlled by GPIO pin D5.
2. **Edge Computing Layer (ESP8266)**:
   - The ESP8266 computes instantaneous power ($P = V \times I$) and integrates energy numerically:
     $$\Delta E = P \times \frac{\Delta t}{3600} \quad (\text{Watt-hours})$$
   - It runs an embedded HTTP server hosting REST endpoints (`/data`, `/on`, `/off`).
3. **Application & Presentation Layer (Dashboard)**:
   - The web dashboard polls `GET /data` asynchronously every 2 seconds using modern JavaScript `fetch()` and `AbortController`.
   - Incoming telemetry refreshes the DOM metrics, updates the HTML5 canvas power curve, and animates the lamp status.
