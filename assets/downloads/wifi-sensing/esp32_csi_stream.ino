// esp32_csi_stream.ino: stream Wi-Fi Channel State Information (CSI) over USB.
// Board: ESP32, ESP32-S3 or ESP32-C3 (2.4 GHz). Arduino IDE: Boards Manager "esp32 by Espressif" 3.x,
// Library Manager "ESP32Ping". Tools > USB CDC On Boot: Enabled (S3/C3 with native USB).
//
// How it works: CSI is only measured when a packet arrives. So this sketch pings your router about
// 50 times a second; every reply is a packet the radio measures. Each measurement becomes one line:
//     C,<seq>,<ms>,<rssi>,<a1>,<a2>, ... <a52>
// where a1..a52 are the strengths of the 52 subcarriers (lower frequency first).
// The lesson page, or analyze_breathing.py, turns that stream into breaths per minute.
#include <WiFi.h>
#include <ESP32Ping.h>
#include "esp_wifi.h"

const char* WIFI_SSID = "YOUR_WIFI_NAME";   // your own network, or a phone hotspot you control
const char* WIFI_PASS = "YOUR_PASSWORD";
const int   PING_GAP_MS = 20;               // ~50 packets per second; 10 ms = faster, 40 ms = slower

struct Sample { uint32_t ms; int8_t rssi; uint8_t amp[52]; };
static QueueHandle_t queue;
static uint8_t routerMac[6];
static uint32_t seq = 0;

// Runs in the Wi-Fi task for every received packet. Keep it short: copy numbers, no printing.
static void onCsi(void* ctx, wifi_csi_info_t* info) {
  if (!info || !info->buf || info->len < 128) return;
  if (memcmp(info->mac, routerMac, 6) != 0) return;       // only packets from our router
  Sample s;
  s.ms = millis();
  s.rssi = info->rx_ctrl.rssi;
  // Legacy long training field: 64 complex values, bytes are [imaginary, real].
  // Order in the buffer is k = 0..31, then -32..-1. We keep k = -26..-1 and 1..26.
  int n = 0;
  for (int k = -26; k <= 26; k++) {
    if (k == 0) continue;
    int idx = (k < 0) ? 64 + k : k;
    float im = info->buf[2 * idx];
    float re = info->buf[2 * idx + 1];
    s.amp[n++] = (uint8_t)min(255.0f, sqrtf(re * re + im * im));
  }
  xQueueSend(queue, &s, 0);                               // drop the sample if the queue is full
}

void setup() {
  Serial.begin(921600);                                   // fast: ~50 lines/s x ~220 characters
  queue = xQueueCreate(32, sizeof(Sample));
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);                                   // a sleeping radio skips packets
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);
  memcpy(routerMac, WiFi.BSSID(), 6);

  wifi_csi_config_t cfg = {};
  cfg.lltf_en = true;            // use the legacy training field (always 64 values)
  cfg.htltf_en = false;
  cfg.stbc_htltf2_en = false;
  cfg.ltf_merge_en = false;
  cfg.channel_filter_en = false; // false = no smoothing between neighbouring subcarriers
  cfg.manu_scale = false;
  cfg.shift = 0;
  esp_wifi_set_csi_config(&cfg);
  esp_wifi_set_csi_rx_cb(&onCsi, NULL);
  esp_wifi_set_csi(true);
  Serial.println("# CSI streaming. Sit still, breathe normally, keep 1-3 m from the router.");
}

void loop() {
  Ping.ping(WiFi.gatewayIP(), 1);                         // make the router send us a packet
  Sample s;
  while (xQueueReceive(queue, &s, 0) == pdTRUE) {
    Serial.printf("C,%lu,%lu,%d", (unsigned long)seq++, (unsigned long)s.ms, s.rssi);
    for (int i = 0; i < 52; i++) Serial.printf(",%u", s.amp[i]);
    Serial.println();
  }
  delay(PING_GAP_MS);
}
