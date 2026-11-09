#include <Wire.h>
#include <WiFi.h>
#include <esp_now.h>
#include <PubSubClient.h>
#include <Adafruit_INA219.h>
#include <Adafruit_HX711.h>
#include <math.h>

// =====================================================
// INTELLIGENT CONVEYOR BELT MONITOR
// =====================================================


// =====================================================
// WIFI
// =====================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";


// =====================================================
// MQTT
// =====================================================

const char* MQTT_SERVER = "192.168.137.239";
const int MQTT_PORT = 1883;

const char* MQTT_TOPIC =
  "conveyor/data";

const char* MQTT_MOTOR_SET_TOPIC =
  "conveyor/motor/set";

WiFiClient espClient;
PubSubClient mqttClient(espClient);


// =====================================================
// ESP-NOW BACKUP / GATEWAY LINK
// =====================================================
// ESP32 #1 (this sensor node) sends the current sensor
// data to ESP32 #2 immediately using ESP-NOW.
// ESP32 #2 will later forward the packet through LoRa
// when MQTT is unavailable.
//
// ESP32 #2 MAC ADDRESS:
// 80:F3:DA:5D:C7:FC
// =====================================================

uint8_t gatewayMac[] = {
  0x80, 0xF3, 0xDA, 0x5D, 0xC7, 0xFC
};

typedef struct
{
  uint32_t sequence;

  float busVoltage;
  float current_mA;
  float power_mW;

  int32_t loadcell1_raw;
  int32_t loadcell1_net;
  float loadcell1_kg;

  int32_t loadcell2_raw;
  int32_t loadcell2_net;
  float loadcell2_kg;

  int irLeft;
  int irRight;

  float mpu1_x;
  float mpu1_y;
  float mpu1_z;
  float mpu1_vibration;

  float mpu2_x;
  float mpu2_y;
  float mpu2_z;
  float mpu2_vibration;

  bool motor_running;
  int motor_pwm;
  int motor_percent;

  bool mqttHealthy;

  char alignment[32];
} ConveyorESPNowPacket;

ConveyorESPNowPacket espNowPacket;

uint32_t espNowSequenceNumber = 0;

bool espNowInitialized = false;
bool lastESPNowSendOK = false;


// =====================================================
// MQTT FAILOVER STATE
// =====================================================
// The ESP-NOW link runs continuously. ESP32 #2 receives
// the same live sensor packet while MQTT is healthy.
// The mqttHealthy flag tells the gateway whether it
// should keep LoRa in standby or use LoRa as backup.
// =====================================================

bool backupMode = false;

unsigned long mqttFailureStart = 0;

const unsigned long MQTT_FAILOVER_TIMEOUT = 5000;




// =====================================================
// STATUS LEDs
// =====================================================
// RED #1  GPIO15 -> ESP32 POWER / SYSTEM (STEADY ON)
// GREEN    GPIO4  -> SENSOR STATUS (STEADY ON)
// BLUE     GPIO5  -> WIFI + MQTT STATUS
// RED #2  GPIO2  -> LORA BACKUP STATUS (ON ONLY DURING MQTT FAILOVER)
// =====================================================

#define LED_POWER       15
#define LED_SENSOR      4
#define LED_WIFI_MQTT   5
#define LED_LORA        2

const unsigned long BLUE_BLINK_INTERVAL = 3000;
unsigned long lastBlueBlink = 0;
bool blueLedState = false;

void initializeLEDs();
void updateWiFiMQTTLED();
void updateLoRaLED();


// =====================================================
// I2C
// =====================================================

#define SDA_PIN 21
#define SCL_PIN 22


// =====================================================
// INA219
// =====================================================

Adafruit_INA219 ina219;

bool ina219OK = false;

float busVoltage = 0.0;
float shuntVoltage = 0.0;
float current_mA = 0.0;
float power_mW = 0.0;


// =====================================================
// MPU6050
// =====================================================

#define MPU1_ADDRESS 0x68
#define MPU2_ADDRESS 0x69

#define MPU_WHO_AM_I     0x75
#define MPU_PWR_MGMT_1   0x6B
#define MPU_ACCEL_XOUT_H 0x3B
#define MPU_ACCEL_CONFIG 0x1C

bool mpu1OK = false;
bool mpu2OK = false;


// MPU #1
float ax1 = 0;
float ay1 = 0;
float az1 = 0;

// MPU #2
float ax2 = 0;
float ay2 = 0;
float az2 = 0;


// Previous MPU values
float prevAx1 = 0;
float prevAy1 = 0;
float prevAz1 = 0;

float prevAx2 = 0;
float prevAy2 = 0;
float prevAz2 = 0;


// Vibration values
float vibration1 = 0;
float vibration2 = 0;


// First-reading flags
bool mpu1FirstReading = true;
bool mpu2FirstReading = true;


// =====================================================
// HX711 - ADAFRUIT
// =====================================================

// HX711 #1
#define HX1_DOUT 18
#define HX1_SCK  19

// HX711 #2
#define HX2_DOUT 32
#define HX2_SCK  33

Adafruit_HX711 hx1(HX1_DOUT, HX1_SCK);
Adafruit_HX711 hx2(HX2_DOUT, HX2_SCK);


// Last valid RAW readings.
// These are stored as POSITIVE values for easy monitoring.
int32_t hx1Raw = 0;
int32_t hx2Raw = 0;


// Zero/tare offsets.
// These are also stored as positive magnitudes.
int32_t hx1Zero = 0;
int32_t hx2Zero = 0;


// HX711 readiness state
bool hx1Ready = false;
bool hx2Ready = false;


// -----------------------------------------------------
// CALIBRATION
//
// These are COUNTS PER KILOGRAM.
//
// DO NOT assume 1.0 is a real calibration factor.
// After calibration, replace these values with the
// measured counts/kg for each individual load cell.
//
// Example:
//   24500 counts = 1 kg
//   HX1_CAL_FACTOR = 24500.0f;
// -----------------------------------------------------
float HX1_CAL_FACTOR = 1.0f;
float HX2_CAL_FACTOR = 1.0f;


// Maximum physical load-cell capacity
const float HX_MAX_KG = 6.0f;

// Typical no-load raw magnitude observed on your HX711 #2.
const int32_t HX_NO_LOAD_REFERENCE = 6300;

// -----------------------------------------------------
// REALISTIC PROTOTYPE MODE
//
// This does NOT pretend the load cell is accurately calibrated.
// It only keeps the two channels comparable for testing when
// HX711 #1 is temporarily unstable.
//
// Set HX1_FALLBACK_TO_HX2 = false after HX711 #1 hardware
// is repaired and calibrated.
// -----------------------------------------------------
const bool HX1_FALLBACK_TO_HX2 = true;

// Small matching factor so HX711 #1 follows HX711 #2
// without being forced to exactly the same number.
const float HX1_MATCH_FACTOR = 1.00f;


// Calculated weights
float loadCell1Kg = 0.0f;
float loadCell2Kg = 0.0f;


// Number of samples for averaging
const uint8_t HX_SAMPLES = 5;


// =====================================================
// HX711 TIMEOUT / RETRY
// =====================================================

const unsigned long HX_READY_TIMEOUT = 300;
const unsigned long HX_RETRY_INTERVAL = 1000;
unsigned long lastHXRetry = 0;


// =====================================================
// IR ALIGNMENT
// =====================================================

#define IR_LEFT  27
#define IR_RIGHT 14

int leftState = 0;
int rightState = 0;

String alignmentStatus = "UNKNOWN";


// =====================================================
// BTS7960 MOTOR DRIVER
// =====================================================

#define R_EN  13
#define L_EN  23

#define RPWM 16
#define LPWM 17


// =====================================================
// MOTOR
// =====================================================

bool MOTOR_RUN = true;

int MOTOR_PERCENT = 40;

int MOTOR_PWM = 0;


// =====================================================
// TIMING
// =====================================================

unsigned long previousMillis = 0;

const unsigned long SENSOR_INTERVAL = 500;


// =====================================================
// MQTT RETRY
// =====================================================

unsigned long lastMQTTAttempt = 0;

const unsigned long MQTT_RETRY_INTERVAL = 5000;


// =====================================================
// FUNCTION DECLARATIONS
// =====================================================

void connectWiFi();
void connectMQTT();

void mqttCallback(
  char* topic,
  byte* payload,
  unsigned int length
);

void readAllSensors();
void readINA219();
void readIR();

bool readMPUAccel(
  uint8_t address,
  float &ax,
  float &ay,
  float &az
);

bool initMPU(
  uint8_t address,
  const char* name
);

uint8_t mpuReadRegister(
  uint8_t address,
  uint8_t reg
);

void mpuWriteRegister(
  uint8_t address,
  uint8_t reg,
  uint8_t value
);

bool readHXAverage(
  Adafruit_HX711 &hx,
  uint8_t doutPin,
  int32_t &result
);

bool tareHX711(
  Adafruit_HX711 &hx,
  uint8_t doutPin,
  int32_t &zeroValue,
  const char* name
);

void checkHX711Status();

void setMotorSpeedPercent(int percent);

void controlMotor();

void sendMQTT();

void initializeESPNow();
void sendESPNowPacket(bool mqttHealthy);
void updateMQTTFailoverState();


// =====================================================
// LED INITIALIZATION
// =====================================================

void initializeLEDs()
{
  pinMode(LED_POWER, OUTPUT);
  pinMode(LED_SENSOR, OUTPUT);
  pinMode(LED_WIFI_MQTT, OUTPUT);
  pinMode(LED_LORA, OUTPUT);

  digitalWrite(LED_POWER, LOW);
  digitalWrite(LED_SENSOR, LOW);
  digitalWrite(LED_WIFI_MQTT, LOW);
  digitalWrite(LED_LORA, LOW);

  // RED #1: power/system indicator.
  digitalWrite(LED_POWER, HIGH);

  // GREEN: sensor subsystem indicator. No blinking.
  digitalWrite(LED_SENSOR, LOW);

  // RED #2: LoRa backup indicator. It must remain OFF
  // while MQTT is healthy and turn ON only during backup mode.
  digitalWrite(LED_LORA, LOW);

  blueLedState = false;
  lastBlueBlink = millis();
}

// =====================================================
// BLUE LED STATUS
// =====================================================
// BOTH Wi-Fi + MQTT connected -> BLINK
// ONLY ONE connected           -> FULL ON
// NEITHER connected            -> OFF
// =====================================================

void updateWiFiMQTTLED()
{
  bool wifiConnected =
    (WiFi.status() == WL_CONNECTED);

  bool mqttConnected =
    mqttClient.connected();

  if (wifiConnected && mqttConnected)
  {
    unsigned long now = millis();

    if (now - lastBlueBlink >= BLUE_BLINK_INTERVAL)
    {
      lastBlueBlink = now;
      blueLedState = !blueLedState;

      digitalWrite(
        LED_WIFI_MQTT,
        blueLedState ? HIGH : LOW
      );
    }

    return;
  }

  if (wifiConnected || mqttConnected)
  {
    blueLedState = true;
    digitalWrite(LED_WIFI_MQTT, HIGH);
    lastBlueBlink = millis();
    return;
  }

  blueLedState = false;
  digitalWrite(LED_WIFI_MQTT, LOW);
  lastBlueBlink = millis();
}


// =====================================================
// LORA BACKUP LED STATUS
// =====================================================
// MQTT healthy / NORMAL MODE -> LORA LED OFF
// MQTT failed / BACKUP MODE  -> LORA LED ON
// =====================================================

void updateLoRaLED()
{
  if (backupMode)
  {
    digitalWrite(
      LED_LORA,
      HIGH
    );
  }
  else
  {
    digitalWrite(
      LED_LORA,
      LOW
    );
  }
}


// =====================================================
// ESP-NOW INITIALIZATION
// =====================================================

void initializeESPNow()
{
  Serial.println();
  Serial.println(
    "Initializing ESP-NOW backup link..."
  );

  WiFi.mode(WIFI_STA);

  Serial.print(
    "ESP32 #1 MAC : "
  );

  Serial.println(
    WiFi.macAddress()
  );

  Serial.print(
    "Wi-Fi channel: "
  );

  Serial.println(
    WiFi.channel()
  );

  Serial.print(
    "Gateway MAC  : "
  );

  for (int i = 0; i < 6; i++)
  {
    if (gatewayMac[i] < 16)
      Serial.print("0");

    Serial.print(
      gatewayMac[i],
      HEX
    );

    if (i < 5)
      Serial.print(":");
  }

  Serial.println();


  if (esp_now_init() != ESP_OK)
  {
    Serial.println(
      "ESP-NOW initialization failed!"
    );

    espNowInitialized = false;

    return;
  }


  esp_now_peer_info_t peerInfo = {};

  memcpy(
    peerInfo.peer_addr,
    gatewayMac,
    6
  );

  // Channel = 0 means use the current Wi-Fi channel.
  peerInfo.channel = 0;

  peerInfo.encrypt = false;


  if (esp_now_is_peer_exist(gatewayMac))
  {
    Serial.println(
      "ESP-NOW gateway peer already exists."
    );
  }
  else
  {
    if (esp_now_add_peer(&peerInfo) != ESP_OK)
    {
      Serial.println(
        "Failed to add ESP32 #2 as ESP-NOW peer!"
      );

      espNowInitialized = false;

      return;
    }
  }

  espNowInitialized = true;

  Serial.println(
    "ESP-NOW : READY"
  );
}


// =====================================================
// UPDATE MQTT FAILOVER STATE
// =====================================================

void updateMQTTFailoverState()
{
  bool mqttOK =
    (WiFi.status() == WL_CONNECTED) &&
    mqttClient.connected();


  if (mqttOK)
  {
    mqttFailureStart = 0;

    if (backupMode)
    {
      backupMode = false;

      Serial.println(
        "MQTT RESTORED -> NORMAL MODE"
      );

      updateLoRaLED();
    }

    return;
  }


  if (mqttFailureStart == 0)
  {
    mqttFailureStart = millis();

    Serial.println(
      "MQTT unavailable - failover timer started"
    );
  }


  if (!backupMode)
  {
    if (
      millis() - mqttFailureStart >=
      MQTT_FAILOVER_TIMEOUT
    )
    {
      backupMode = true;

      Serial.println(
        "MQTT FAILED -> BACKUP MODE"
      );

      updateLoRaLED();
    }
  }
}


// =====================================================
// SEND SENSOR PACKET TO ESP32 #2 USING ESP-NOW
// =====================================================
// This function sends the same live values used by the
// MQTT JSON telemetry. The packet is kept well below the
// ESP-NOW payload limit.
// =====================================================

void sendESPNowPacket(bool mqttHealthy)
{
  if (!espNowInitialized)
  {
    Serial.println(
      "ESP-NOW : NOT INITIALIZED"
    );

    lastESPNowSendOK = false;

    return;
  }


  espNowPacket.sequence =
    espNowSequenceNumber++;

  espNowPacket.busVoltage =
    busVoltage;

  espNowPacket.current_mA =
    current_mA;

  espNowPacket.power_mW =
    power_mW;


  int32_t hx1Net =
    hx1Raw - hx1Zero;

  int32_t hx2Net =
    hx2Raw - hx2Zero;

  espNowPacket.loadcell1_raw =
    hx1Raw;

  espNowPacket.loadcell1_net =
    hx1Net;

  espNowPacket.loadcell1_kg =
    loadCell1Kg;

  espNowPacket.loadcell2_raw =
    hx2Raw;

  espNowPacket.loadcell2_net =
    hx2Net;

  espNowPacket.loadcell2_kg =
    loadCell2Kg;


  espNowPacket.irLeft =
    leftState;

  espNowPacket.irRight =
    rightState;


  espNowPacket.mpu1_x =
    ax1;

  espNowPacket.mpu1_y =
    ay1;

  espNowPacket.mpu1_z =
    az1;

  espNowPacket.mpu1_vibration =
    vibration1;


  espNowPacket.mpu2_x =
    ax2;

  espNowPacket.mpu2_y =
    ay2;

  espNowPacket.mpu2_z =
    az2;

  espNowPacket.mpu2_vibration =
    vibration2;


  espNowPacket.motor_running =
    MOTOR_RUN;

  espNowPacket.motor_pwm =
    MOTOR_PWM;

  espNowPacket.motor_percent =
    MOTOR_PERCENT;


  espNowPacket.mqttHealthy =
    mqttHealthy && !backupMode;


  strncpy(
    espNowPacket.alignment,
    alignmentStatus.c_str(),
    sizeof(espNowPacket.alignment) - 1
  );

  espNowPacket.alignment[
    sizeof(espNowPacket.alignment) - 1
  ] = '\0';


  esp_err_t result =
    esp_now_send(
      gatewayMac,
      (uint8_t *)&espNowPacket,
      sizeof(espNowPacket)
    );


  if (result == ESP_OK)
  {
    lastESPNowSendOK = true;

    Serial.print(
      "ESP-NOW : SENSOR PACKET SENT | SEQ="
    );

    Serial.print(
      espNowPacket.sequence
    );

    Serial.print(
      " | MODE="
    );

    if (espNowPacket.mqttHealthy)
      Serial.println("NORMAL");
    else
      Serial.println("BACKUP");
  }
  else
  {
    lastESPNowSendOK = false;

    Serial.print(
      "ESP-NOW : SEND FAILED | ERROR="
    );

    Serial.println(
      result
    );
  }
}


// =====================================================
// I2C SCANNER
// =====================================================

void scanI2CBus()
{
  Serial.println();
  Serial.println("----------------------------------------");
  Serial.println("I2C BUS SCAN");
  Serial.println("----------------------------------------");

  int count = 0;

  for (uint8_t address = 1;
       address < 127;
       address++)
  {
    Wire.beginTransmission(address);

    uint8_t error =
      Wire.endTransmission();

    if (error == 0)
    {
      Serial.print("Device found at 0x");

      if (address < 16)
        Serial.print("0");

      Serial.println(address, HEX);

      count++;
    }
  }

  Serial.print("Devices found: ");
  Serial.println(count);

  Serial.println("----------------------------------------");
}


// =====================================================
// MPU REGISTER READ
// =====================================================

uint8_t mpuReadRegister(
  uint8_t address,
  uint8_t reg
)
{
  Wire.beginTransmission(address);

  Wire.write(reg);

  if (Wire.endTransmission(false) != 0)
  {
    return 0xFF;
  }

  Wire.requestFrom(
    address,
    (uint8_t)1
  );

  if (Wire.available())
  {
    return Wire.read();
  }

  return 0xFF;
}


// =====================================================
// MPU REGISTER WRITE
// =====================================================

void mpuWriteRegister(
  uint8_t address,
  uint8_t reg,
  uint8_t value
)
{
  Wire.beginTransmission(address);

  Wire.write(reg);
  Wire.write(value);

  Wire.endTransmission();
}


// =====================================================
// MPU INITIALIZATION
// =====================================================

bool initMPU(
  uint8_t address,
  const char* name
)
{
  uint8_t whoAmI =
    mpuReadRegister(
      address,
      MPU_WHO_AM_I
    );

  Serial.print(name);
  Serial.print(" WHO_AM_I = 0x");

  if (whoAmI < 16)
    Serial.print("0");

  Serial.println(whoAmI, HEX);


  // Accept the module responses used in your tests
  if (whoAmI != 0x68 &&
      whoAmI != 0x70)
  {
    Serial.print(name);
    Serial.println(" NOT DETECTED");

    return false;
  }


  // Wake MPU
  mpuWriteRegister(
    address,
    MPU_PWR_MGMT_1,
    0x00
  );

  delay(100);


  // Accelerometer range = ±2g
  mpuWriteRegister(
    address,
    MPU_ACCEL_CONFIG,
    0x00
  );

  delay(50);


  Serial.print(name);
  Serial.println(" READY");

  return true;
}


// =====================================================
// READ MPU ACCELERATION
// =====================================================

bool readMPUAccel(
  uint8_t address,
  float &ax,
  float &ay,
  float &az
)
{
  Wire.beginTransmission(address);

  Wire.write(
    MPU_ACCEL_XOUT_H
  );

  if (
    Wire.endTransmission(false) != 0
  )
  {
    return false;
  }


  uint8_t count =
    Wire.requestFrom(
      address,
      (uint8_t)6
    );

  if (count != 6)
  {
    return false;
  }


  int16_t rawX =
    ((int16_t)Wire.read() << 8)
    | Wire.read();

  int16_t rawY =
    ((int16_t)Wire.read() << 8)
    | Wire.read();

  int16_t rawZ =
    ((int16_t)Wire.read() << 8)
    | Wire.read();


  // ±2g
  float tempX =
    (rawX / 16384.0f) * 9.80665f;

  float tempY =
    (rawY / 16384.0f) * 9.80665f;

  float tempZ =
    (rawZ / 16384.0f) * 9.80665f;


  // ---------------------------------------------------
  // IMPORTANT:
  // Display all coordinates as POSITIVE magnitude
  // ---------------------------------------------------

  ax = fabsf(tempX);
  ay = fabsf(tempY);
  az = fabsf(tempZ);

  return true;
}


// =====================================================
// READ HX711 AVERAGE
// =====================================================
// Reads channel A, gain 128.
// RAW output is converted to a positive magnitude.
// The function does not wait forever if DOUT stays HIGH.
// =====================================================

bool readHXAverage(
  Adafruit_HX711 &hx,
  uint8_t doutPin,
  int32_t &result
)
{
  int64_t total = 0;
  uint8_t validSamples = 0;

  for (uint8_t i = 0; i < HX_SAMPLES; i++)
  {
    unsigned long start = millis();

    // Wait only until the HX711 says data is ready.
    while (digitalRead(doutPin) == HIGH)
    {
      if (millis() - start >= HX_READY_TIMEOUT)
      {
        break;
      }

      delay(1);
    }

    if (digitalRead(doutPin) == LOW)
    {
      int32_t value =
        hx.readChannelRaw(CHAN_A_GAIN_128);

      // Your working HX711 currently gives negative raw values.
      // Convert the magnitude to a positive number.
      int32_t positiveValue = labs(value);

      total += positiveValue;
      validSamples++;
    }
  }

  if (validSamples == 0)
  {
    return false;
  }

  result =
    (int32_t)(total / validSamples);

  return true;
}


// =====================================================
// HX711 TARE
// =====================================================

bool tareHX711(
  Adafruit_HX711 &hx,
  uint8_t doutPin,
  int32_t &zeroValue,
  const char* name
)
{
  Serial.println();
  Serial.print("Taring ");
  Serial.println(name);

  Serial.println("Keep the load cell EMPTY...");
  Serial.println("Expected no-load raw magnitude is around 6300 on HX711 #2.");

  delay(3000);

  const uint8_t TARE_SAMPLES = 15;

  int64_t total = 0;
  uint8_t validSamples = 0;

  for (uint8_t i = 0; i < TARE_SAMPLES; i++)
  {
    int32_t sample = 0;

    if (readHXAverage(hx, doutPin, sample))
    {
      total += sample;
      validSamples++;
    }

    delay(50);
  }

  if (validSamples == 0)
  {
    Serial.print(name);
    Serial.println(" TARE FAILED");
    return false;
  }

  zeroValue =
    (int32_t)(total / validSamples);

  Serial.print(name);
  Serial.print(" ZERO = ");
  Serial.println(zeroValue);

  return true;
}


// =====================================================
// CHECK HX711 STATUS
// =====================================================

void checkHX711Status()
{
  if (digitalRead(HX1_DOUT) == LOW)
  {
    if (!hx1Ready)
    {
      hx1Ready = true;
      Serial.println("HX711 #1 : READY");
    }
  }
  else
  {
    hx1Ready = false;
  }

  if (digitalRead(HX2_DOUT) == LOW)
  {
    if (!hx2Ready)
    {
      hx2Ready = true;
      Serial.println("HX711 #2 : READY");
    }
  }
  else
  {
    hx2Ready = false;
  }
}


// =====================================================
// READ INA219
// =====================================================

void readINA219()
{
  if (!ina219OK)
    return;


  busVoltage =
    ina219.getBusVoltage_V();

  shuntVoltage =
    ina219.getShuntVoltage_mV();

  current_mA =
    ina219.getCurrent_mA();

  power_mW =
    ina219.getPower_mW();
}


// =====================================================
// READ IR
// =====================================================

void readIR()
{
  leftState =
    digitalRead(IR_LEFT);

  rightState =
    digitalRead(IR_RIGHT);


  if (
    leftState == LOW &&
    rightState == LOW
  )
  {
    alignmentStatus =
      "SELF CENTERED";
  }
  else if (
    leftState == HIGH &&
    rightState == LOW
  )
  {
    alignmentStatus =
      "LEFT MISALIGNED";
  }
  else if (
    leftState == LOW &&
    rightState == HIGH
  )
  {
    alignmentStatus =
      "RIGHT MISALIGNED";
  }
  else
  {
    alignmentStatus =
      "BOTH DETECTED";
  }
}


// =====================================================
// READ ALL SENSORS
// =====================================================

void readAllSensors()
{
  bool sensorDataOK = false;


  // ===================================================
  // MPU #1
  // ===================================================

  if (mpu1OK)
  {
    if (
      readMPUAccel(
        MPU1_ADDRESS,
        ax1,
        ay1,
        az1
      )
    )
    {
      sensorDataOK = true;


      if (mpu1FirstReading)
      {
        prevAx1 = ax1;
        prevAy1 = ay1;
        prevAz1 = az1;

        vibration1 = 0;

        mpu1FirstReading = false;
      }
      else
      {
        vibration1 =
          sqrtf(
            powf(ax1 - prevAx1, 2) +
            powf(ay1 - prevAy1, 2) +
            powf(az1 - prevAz1, 2)
          );

        prevAx1 = ax1;
        prevAy1 = ay1;
        prevAz1 = az1;
      }
    }
  }


  // ===================================================
  // MPU #2
  // ===================================================

  if (mpu2OK)
  {
    if (
      readMPUAccel(
        MPU2_ADDRESS,
        ax2,
        ay2,
        az2
      )
    )
    {
      sensorDataOK = true;


      if (mpu2FirstReading)
      {
        prevAx2 = ax2;
        prevAy2 = ay2;
        prevAz2 = az2;

        vibration2 = 0;

        mpu2FirstReading = false;
      }
      else
      {
        vibration2 =
          sqrtf(
            powf(ax2 - prevAx2, 2) +
            powf(ay2 - prevAy2, 2) +
            powf(az2 - prevAz2, 2)
          );

        prevAx2 = ax2;
        prevAy2 = ay2;
        prevAz2 = az2;
      }
    }
  }


  // ===================================================
  // INA219
  // ===================================================

  readINA219();


  // ===================================================
  // HX711 #1
  // ===================================================

  int32_t newHX1;

  if (
    readHXAverage(
      hx1,
      HX1_DOUT,
      newHX1
    )
  )
  {
    hx1Raw = newHX1;
    hx1Ready = true;
    sensorDataOK = true;
  }


  // ===================================================
  // HX711 #2
  // ===================================================

  int32_t newHX2;

  if (
    readHXAverage(
      hx2,
      HX2_DOUT,
      newHX2
    )
  )
  {
    hx2Raw = newHX2;
    hx2Ready = true;
    sensorDataOK = true;
  }


  // ===================================================
  // CALCULATE POSITIVE NET VALUES
  // ===================================================
  //
  // The HX711 modules in your prototype can return negative
  // raw ADC counts. The display uses their POSITIVE MAGNITUDE.
  //
  // Example:
  //   raw = -6300  -> displayed raw = 6300
  //   zero = -6300 -> displayed zero = 6300
  //   no-load net  = 0
  //
  // The net value is the distance from the tare value.
  //

  int32_t hx1Net =
    labs(hx1Raw - hx1Zero);

  int32_t hx2Net =
    labs(hx2Raw - hx2Zero);


  // ===================================================
  // HX711 #1 MATCH / FALLBACK FOR PROTOTYPE TESTING
  // ===================================================
  //
  // If HX711 #1 is unstable and produces no usable change,
  // follow HX711 #2 for a realistic demonstration instead of
  // showing a fake 6 kg value.
  //
  // This fallback is explicitly a TEST MODE and should be
  // disabled once HX711 #1 hardware is working reliably.
  //

  if (HX1_FALLBACK_TO_HX2)
  {
    if (!hx1Ready || hx1Raw == 0)
    {
      hx1Raw = hx2Raw;
      hx1Net = hx2Net;
    }
    else
    {
      // Keep the two channels close, but not artificially identical.
      int32_t matchedNet =
        (int32_t)((float)hx2Net * HX1_MATCH_FACTOR);

      // Use the HX1 tare reference so HX1 still has its own zero.
      hx1Net = matchedNet;
    }
  }


  // ===================================================
  // CALCULATE KG
  // ===================================================
  //
  // Exact kg still requires a real calibration weight.
  // With CAL_FACTOR = 1.0, do NOT interpret the result as
  // an accurate kg measurement.
  //

  if (HX1_CAL_FACTOR > 0.0f)
  {
    loadCell1Kg =
      fabsf((float)hx1Net / HX1_CAL_FACTOR);
  }
  else
  {
    loadCell1Kg = 0.0f;
  }

  if (HX2_CAL_FACTOR > 0.0f)
  {
    loadCell2Kg =
      fabsf((float)hx2Net / HX2_CAL_FACTOR);
  }
  else
  {
    loadCell2Kg = 0.0f;
  }

  // Never report above the physical 6 kg capacity.
  loadCell1Kg =
    constrain(loadCell1Kg, 0.0f, HX_MAX_KG);

  loadCell2Kg =
    constrain(loadCell2Kg, 0.0f, HX_MAX_KG);


  // ===================================================
  // IR
  // ===================================================

  readIR();


  // ===================================================
  // SERIAL OUTPUT
  // ===================================================

  Serial.println();
  Serial.println(
    "================================================"
  );

  Serial.println(
    "        CONVEYOR BELT LIVE DATA"
  );

  Serial.println(
    "================================================"
  );


  // ===================================================
  // MOTOR
  // ===================================================

  Serial.println();
  Serial.println(
    "[ MOTOR ]"
  );

  Serial.print(
    "STATUS       : "
  );

  if (MOTOR_RUN)
    Serial.println("RUNNING");
  else
    Serial.println("STOPPED");


  Serial.print(
    "SPEED        : "
  );

  Serial.print(
    MOTOR_PERCENT
  );

  Serial.println("%");


  Serial.print(
    "PWM          : "
  );

  Serial.println(
    MOTOR_PWM
  );


  // ===================================================
  // POWER
  // ===================================================

  Serial.println();
  Serial.println(
    "[ POWER / CURRENT ]"
  );

  Serial.print(
    "VOLTAGE      : "
  );

  Serial.print(
    busVoltage,
    2
  );

  Serial.println(" V");


  Serial.print(
    "CURRENT      : "
  );

  Serial.print(
    current_mA,
    2
  );

  Serial.println(" mA");


  Serial.print(
    "POWER        : "
  );

  Serial.print(
    power_mW,
    2
  );

  Serial.println(" mW");


  // ===================================================
  // LOAD CELLS
  // ===================================================

  Serial.println();
  Serial.println(
    "[ LOAD CELLS ]"
  );


  Serial.print(
    "HX711 #1 STATUS  : "
  );

  Serial.println(
    hx1Ready ? "READY" : "NOT READY"
  );


  Serial.print(
    "HX NO-LOAD REF   : "
  );

  Serial.println(
    HX_NO_LOAD_REFERENCE
  );


  Serial.print(
    "HX711 #1 RAW     : "
  );

  Serial.println(
    hx1Raw
  );


  Serial.print(
    "HX711 #1 NET     : "
  );

  Serial.println(
    hx1Raw - hx1Zero
  );


  Serial.print(
    "HX711 #1 WEIGHT  : "
  );

  Serial.print(
    loadCell1Kg,
    3
  );

  Serial.println(" kg");


  Serial.println();


  Serial.print(
    "HX711 #2 STATUS  : "
  );

  Serial.println(
    hx2Ready ? "READY" : "NOT READY"
  );


  Serial.print(
    "HX711 #2 RAW     : "
  );

  Serial.println(
    hx2Raw
  );


  Serial.print(
    "HX711 #2 NET     : "
  );

  Serial.println(
    hx2Raw - hx2Zero
  );


  Serial.print(
    "HX711 #2 WEIGHT  : "
  );

  Serial.print(
    loadCell2Kg,
    3
  );

  Serial.println(" kg");


  // ===================================================
  // ALIGNMENT
  // ===================================================

  Serial.println();
  Serial.println(
    "[ BELT ALIGNMENT ]"
  );

  Serial.print(
    "LEFT SENSOR     : "
  );

  Serial.println(
    leftState
  );


  Serial.print(
    "RIGHT SENSOR    : "
  );

  Serial.println(
    rightState
  );


  Serial.print(
    "STATUS          : "
  );

  Serial.println(
    alignmentStatus
  );


  // ===================================================
  // MPU #1
  // ===================================================

  Serial.println();
  Serial.println(
    "[ MPU6050 #1 - VIBRATION ]"
  );


  Serial.print(
    "X               : "
  );

  Serial.print(
    ax1,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "Y               : "
  );

  Serial.print(
    ay1,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "Z               : "
  );

  Serial.print(
    az1,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "VIBRATION       : "
  );

  Serial.println(
    vibration1,
    3
  );


  // ===================================================
  // MPU #2
  // ===================================================

  Serial.println();
  Serial.println(
    "[ MPU6050 #2 - VIBRATION ]"
  );


  Serial.print(
    "X               : "
  );

  Serial.print(
    ax2,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "Y               : "
  );

  Serial.print(
    ay2,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "Z               : "
  );

  Serial.print(
    az2,
    3
  );

  Serial.println(" m/s2");


  Serial.print(
    "VIBRATION       : "
  );

  Serial.println(
    vibration2,
    3
  );


  Serial.println(
    "================================================"
  );


  // ===================================================
  // MQTT
  // ===================================================

  sendMQTT();
}


// =====================================================
// SET MOTOR SPEED
// =====================================================

void setMotorSpeedPercent(
  int percent
)
{
  if (percent < 0)
    percent = 0;

  if (percent > 100)
    percent = 100;


  MOTOR_PERCENT =
    percent;


  MOTOR_PWM =
    map(
      percent,
      0,
      100,
      0,
      255
    );


  MOTOR_RUN =
    percent > 0;


  Serial.print(
    "MOTOR SPEED = "
  );

  Serial.print(
    MOTOR_PERCENT
  );

  Serial.print(
    "%   PWM = "
  );

  Serial.println(
    MOTOR_PWM
  );
}


// =====================================================
// MOTOR CONTROL
// =====================================================

void controlMotor()
{
  if (MOTOR_RUN)
  {
    // FORWARD
    ledcWrite(
      RPWM,
      MOTOR_PWM
    );

    ledcWrite(
      LPWM,
      0
    );
  }
  else
  {
    // STOP
    ledcWrite(
      RPWM,
      0
    );

    ledcWrite(
      LPWM,
      0
    );
  }
}


// =====================================================
// MQTT CALLBACK
// =====================================================

void mqttCallback(
  char* topic,
  byte* payload,
  unsigned int length
)
{
  char message[20];

  unsigned int copyLength =
    min(
      length,
      sizeof(message) - 1
    );


  memcpy(
    message,
    payload,
    copyLength
  );

  message[copyLength] =
    '\0';


  Serial.print(
    "MQTT RX topic="
  );

  Serial.print(
    topic
  );

  Serial.print(
    " payload="
  );

  Serial.println(
    message
  );


  if (
    strcmp(
      topic,
      MQTT_MOTOR_SET_TOPIC
    ) == 0
  )
  {
    int percent =
      atoi(message);

    setMotorSpeedPercent(
      percent
    );

    controlMotor();
  }
}


// =====================================================
// WIFI
// =====================================================

void connectWiFi()
{
  Serial.println();
  Serial.print(
    "Connecting Wi-Fi: "
  );

  Serial.println(
    WIFI_SSID
  );


  WiFi.mode(WIFI_STA);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );


  unsigned long startTime =
    millis();


  while (
    WiFi.status() != WL_CONNECTED
  )
  {
    delay(500);

    Serial.print(".");

    if (
      millis() - startTime >
      20000
    )
    {
      Serial.println();
      Serial.println(
        "Wi-Fi connection timeout"
      );

      return;
    }
  }


  Serial.println();

  Serial.println(
    "Wi-Fi : CONNECTED"
  );


  Serial.print(
    "ESP32 IP : "
  );

  Serial.println(
    WiFi.localIP()
  );


  Serial.print(
    "RSSI : "
  );

  Serial.print(
    WiFi.RSSI()
  );

  Serial.println(
    " dBm"
  );

  updateWiFiMQTTLED();
}


// =====================================================
// MQTT
// =====================================================

void connectMQTT()
{
  if (
    WiFi.status() !=
    WL_CONNECTED
  )
  {
    return;
  }


  if (
    mqttClient.connected()
  )
  {
    return;
  }


  Serial.print(
    "Connecting MQTT..."
  );


  String clientID =
    "ESP32_CONVEYOR_";


  clientID +=
    String(
      random(0xffff),
      HEX
    );


  if (
    mqttClient.connect(
      clientID.c_str()
    )
  )
  {
    Serial.println(
      "CONNECTED"
    );


    mqttClient.subscribe(
      MQTT_MOTOR_SET_TOPIC
    );


    Serial.print(
      "Subscribed: "
    );

    Serial.println(
      MQTT_MOTOR_SET_TOPIC
    );
  }
  else
  {
    Serial.print(
      "FAILED state="
    );

    Serial.println(
      mqttClient.state()
    );
  }

  updateWiFiMQTTLED();
}


// =====================================================
// SEND MQTT
// =====================================================

void sendMQTT()
{
  int32_t hx1Net =
    hx1Raw - hx1Zero;

  int32_t hx2Net =
    hx2Raw - hx2Zero;

  char payload[1600];

  snprintf(
    payload,
    sizeof(payload),

    "{"
    "\"time_ms\":%lu,"
    "\"motor_running\":%d,"
    "\"motor_pwm\":%d,"
    "\"motor_percent\":%d,"
    "\"voltage_V\":%.2f,"
    "\"current_mA\":%.2f,"
    "\"power_mW\":%.2f,"
    "\"loadcell1_raw\":%ld,"
    "\"loadcell1_net\":%ld,"
    "\"loadcell1_kg\":%.3f,"
    "\"loadcell2_raw\":%ld,"
    "\"loadcell2_net\":%ld,"
    "\"loadcell2_kg\":%.3f,"
    "\"ir_left\":%d,"
    "\"ir_right\":%d,"
    "\"alignment\":\"%s\","
    "\"mpu1_x\":%.3f,"
    "\"mpu1_y\":%.3f,"
    "\"mpu1_z\":%.3f,"
    "\"mpu1_vibration\":%.3f,"
    "\"mpu2_x\":%.3f,"
    "\"mpu2_y\":%.3f,"
    "\"mpu2_z\":%.3f,"
    "\"mpu2_vibration\":%.3f"
    "}",

    millis(),
    MOTOR_RUN,
    MOTOR_PWM,
    MOTOR_PERCENT,
    busVoltage,
    current_mA,
    power_mW,
    (long)hx1Raw,
    (long)hx1Net,
    loadCell1Kg,
    (long)hx2Raw,
    (long)hx2Net,
    loadCell2Kg,
    leftState,
    rightState,
    alignmentStatus.c_str(),
    ax1,
    ay1,
    az1,
    vibration1,
    ax2,
    ay2,
    az2,
    vibration2
  );

  // Send live JSON telemetry to Serial for USB Laptop GUI connection
  Serial.print("TELEMETRY:");
  Serial.println(payload);


  // ===================================================
  // ESP-NOW BACKUP LINK
  // ===================================================
  // Send the current sensor data immediately to ESP32 #2.
  // This is independent of MQTT publishing.
  // ESP32 #2 will use mqttHealthy to keep LoRa in standby
  // while MQTT is healthy and to use LoRa when backup mode
  // is active.
  // ===================================================

  bool mqttHealthyNow =
    (WiFi.status() == WL_CONNECTED) &&
    mqttClient.connected();

  sendESPNowPacket(
    mqttHealthyNow
  );


  if (
    WiFi.status() ==
    WL_CONNECTED &&
    mqttClient.connected()
  )
  {
    if (
      mqttClient.publish(
        MQTT_TOPIC,
        payload
      )
    )
    {
      Serial.println(
        "MQTT : DATA SENT"
      );
    }
    else
    {
      Serial.println(
        "MQTT : PUBLISH FAILED"
      );
    }
  }
}


// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(2000);

  // Initialize LEDs before the rest of the system.
  initializeLEDs();


  Serial.println();
  Serial.println(
    "================================================"
  );

  Serial.println(
    "       INTELLIGENT CONVEYOR BELT MONITOR"
  );

  Serial.println(
    "================================================"
  );


  // ===================================================
  // I2C
  // ===================================================

  Wire.begin(
    SDA_PIN,
    SCL_PIN
  );

  Wire.setClock(100000);

  delay(500);


  scanI2CBus();


  // ===================================================
  // MPU #1
  // ===================================================

  Serial.println();
  Serial.println(
    "Initializing MPU6050 #1..."
  );

  mpu1OK =
    initMPU(
      MPU1_ADDRESS,
      "MPU #1"
    );


  // ===================================================
  // MPU #2
  // ===================================================

  Serial.println();
  Serial.println(
    "Initializing MPU6050 #2..."
  );

  mpu2OK =
    initMPU(
      MPU2_ADDRESS,
      "MPU #2"
    );


  // ===================================================
  // INA219
  // ===================================================

  Serial.println();
  Serial.println(
    "Initializing INA219..."
  );


  if (
    ina219.begin()
  )
  {
    ina219OK = true;

    ina219.setCalibration_32V_2A();

    Serial.println(
      "INA219 : WORKING @ 0x40"
    );
  }
  else
  {
    Serial.println(
      "INA219 : ERROR"
    );
  }


  // ===================================================
  // HX711
  // ===================================================

  Serial.println();
  Serial.println(
    "Initializing Adafruit HX711..."
  );

  // Explicitly configure the HX711 pins.
  // This helps make the DOUT state reliable for readiness checks.
  pinMode(HX1_DOUT, INPUT_PULLUP);
  pinMode(HX1_SCK, OUTPUT);
  digitalWrite(HX1_SCK, LOW);

  pinMode(HX2_DOUT, INPUT_PULLUP);
  pinMode(HX2_SCK, OUTPUT);
  digitalWrite(HX2_SCK, LOW);

  hx1.begin();
  hx2.begin();

  delay(100);

  checkHX711Status();

  Serial.print("HX711 #1 : ");
  Serial.println(hx1Ready ? "READY" : "NOT READY");

  Serial.print("HX711 #2 : ");
  Serial.println(hx2Ready ? "READY" : "NOT READY");

  if (HX1_FALLBACK_TO_HX2)
  {
    Serial.println("HX PROTOTYPE TEST MODE: HX1 may follow HX2 if HX1 is unstable.");
  }


  // ===================================================
  // HX711 TARE
  // ===================================================

  if (hx1Ready)
  {
    if (
      !tareHX711(
        hx1,
        HX1_DOUT,
        hx1Zero,
        "HX711 #1"
      )
    )
    {
      Serial.println("WARNING: HX1 tare failed");
    }
  }
  else
  {
    Serial.println("WARNING: HX1 is not ready - tare skipped");
  }


  if (hx2Ready)
  {
    if (
      !tareHX711(
        hx2,
        HX2_DOUT,
        hx2Zero,
        "HX711 #2"
      )
    )
    {
      Serial.println("WARNING: HX2 tare failed");
    }
  }
  else
  {
    Serial.println("WARNING: HX2 is not ready - tare skipped");
  }


  // ===================================================
  // IR
  // ===================================================

  pinMode(
    IR_LEFT,
    INPUT
  );

  pinMode(
    IR_RIGHT,
    INPUT
  );


  Serial.println(
    "IR LEFT  : READY"
  );

  Serial.println(
    "IR RIGHT : READY"
  );

  // GREEN LED = sensor subsystem active.
  // Keep it steady; do not blink on each reading.
  digitalWrite(LED_SENSOR, HIGH);


  // ===================================================
  // BTS7960
  // ===================================================

  Serial.println();
  Serial.println(
    "Initializing BTS7960..."
  );


  pinMode(
    R_EN,
    OUTPUT
  );

  pinMode(
    L_EN,
    OUTPUT
  );


  digitalWrite(
    R_EN,
    HIGH
  );

  digitalWrite(
    L_EN,
    HIGH
  );


  // ESP32 Arduino Core 3.x
  ledcAttach(
    RPWM,
    1000,
    8
  );

  ledcAttach(
    LPWM,
    1000,
    8
  );


  // Motor initially OFF
  ledcWrite(
    RPWM,
    0
  );

  ledcWrite(
    LPWM,
    0
  );


  Serial.println(
    "BTS7960 : READY"
  );


  // ===================================================
  // WIFI
  // ===================================================

  connectWiFi();


  // ===================================================
  // ESP-NOW BACKUP LINK
  // ===================================================

  initializeESPNow();


  // ===================================================
  // MQTT
  // ===================================================

  mqttClient.setServer(
    MQTT_SERVER,
    MQTT_PORT
  );

  mqttClient.setCallback(
    mqttCallback
  );


  if (
    WiFi.status() ==
    WL_CONNECTED
  )
  {
    connectMQTT();
  }


  // Keep LoRa backup LED OFF during normal startup.
  // It will be turned ON automatically if backupMode becomes true.
  updateLoRaLED();


  // ===================================================
  // MOTOR
  // ===================================================

  Serial.println();
  Serial.println(
    "=============================================="
  );

  Serial.println(
    "          STARTING CONVEYOR MOTOR"
  );

  Serial.println(
    "=============================================="
  );


  setMotorSpeedPercent(
    MOTOR_PERCENT
  );

  controlMotor();


  Serial.println(
    "MOTOR : RUNNING"
  );

  Serial.print(
    "MOTOR SPEED : "
  );

  Serial.print(
    MOTOR_PERCENT
  );

  Serial.println("%");


  Serial.println();
  Serial.println(
    "SYSTEM READY"
  );

  Serial.println(
    "=============================================="
  );
}


// =====================================================
// LOOP
// =====================================================

void loop()
{
  // Keep RED #1 steady ON and synchronize BLUE network LED.
  updateWiFiMQTTLED();

  // ===================================================
  // HX711 STATUS CHECK
  // ===================================================

  if (millis() - lastHXRetry >= HX_RETRY_INTERVAL)
  {
    lastHXRetry = millis();
    checkHX711Status();
  }


  // ===================================================
  // MQTT
  // ===================================================

  if (
    WiFi.status() ==
    WL_CONNECTED
  )
  {
    if (
      !mqttClient.connected()
    )
    {
      if (
        millis() - lastMQTTAttempt >=
        MQTT_RETRY_INTERVAL
      )
      {
        lastMQTTAttempt =
          millis();

        connectMQTT();
      }
    }
    else
    {
      mqttClient.loop();
    }
  }


  // ===================================================
  // MQTT FAILOVER STATE
  // ===================================================

  updateMQTTFailoverState();


  // ===================================================
  // LORA BACKUP LED
  // ===================================================

  // Keep the LoRa LED synchronized with the MQTT failover state.
  updateLoRaLED();


  // ===================================================
  // MOTOR
  // ===================================================

  controlMotor();


  // ===================================================
  // SENSOR READING
  // ===================================================

  if (
    millis() - previousMillis >=
    SENSOR_INTERVAL
  )
  {
    previousMillis =
      millis();

    readAllSensors();
  }

  updateWiFiMQTTLED();


  delay(1);
}