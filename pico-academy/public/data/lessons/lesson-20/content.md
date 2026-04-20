# Lesson 20: Final Project — Build a Smart Security System!

## What you'll learn
- How to design a real program with multiple states (a **state machine**)
- How to organise a big project into helper functions
- How to combine many sensors into one working system
- How real security systems work — and that you can build one!
- A sneak peek at Wi-Fi on the Pico 2 W (just a teaser — it is exciting!)
- That you are now a genuine electronics programmer. Seriously — well done!

---

## Parts you'll need
- Raspberry Pi Pico 2 W
- Tilt Switch Module (GP2) — your motion detector
- Flame Sensor Module (GP3 digital output) — fire alarm
- DHT11 Temperature & Humidity Module (GP22) — temperature monitor
- Photoresistor Module (GP26 ADC) — light level sensor
- Active Buzzer Module (GP15) — alarm siren
- RGB LED Module (GP9/10/11) — system status light
- Button Switch Module (GP14) — arm/disarm button
- Touch Sensor Module (GP16) — panic button
- Breadboard and lots of jumper wires
- USB cable for power and serial output
- Optional: IR Remote + Receiver (from Lesson 11) for the challenge!

---

## Background

Congratulations — you have made it to Lesson 20! Look back at what you have learned: blinking LEDs, reading buttons, playing melodies, measuring temperature, detecting fire, decoding IR remotes, reading joysticks, counting with encoders, detecting lines, controlling relays, sensing magnetic fields, catching invisible tripwires, touch interfaces, laser modules, and even your own heartbeat! That is an incredible amount of knowledge for anyone, let alone someone just getting started with electronics and programming.

Real security systems — the kind you see on buildings and in homes — use exactly the sensors you have been learning about. A motion detector, a door contact sensor, a temperature alarm, a light sensor, a siren, a status indicator, and a keypad to arm and disarm it. You have all those pieces. Today you are going to wire them together into a single working system with proper software architecture. That means we will write the program the way professional engineers write programs: broken into small, clear functions, organised around a **state machine**.

A **state machine** is one of the most powerful ideas in all of programming. The idea is simple: your system is always in exactly one *state* at a time — like DISARMED, ARMED, or ALARM. Each state has rules about what it does and what triggers it to change to a different state. State machines make big programs manageable because you always know what the system is supposed to be doing and why. Traffic lights use state machines. Vending machines use them. Self-driving cars use them. And now, so will your security system!

Oh — and there is one more thing. Your Pico 2 W has built-in **Wi-Fi**. At the end of this lesson there is a teaser showing you what a Wi-Fi alert would look like in code. A full Wi-Fi lesson is waiting for you in the extended series — but even seeing a glimpse of what is possible will blow your mind. Your security system could send a notification to your phone. How cool is that?

---

## Wiring

This project uses the most wires of any lesson so far! Take your time, label your wires if you can, and double-check every connection before powering on.

### Tilt Switch Module (S / VCC / GND) — Motion/Tamper Detector

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP2 | S (signal) | Changes state when tilted |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### Flame Sensor Module (DO / VCC / GND) — Fire Detector

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP3 | DO (digital output) | LOW when flame detected (check yours!) |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### DHT11 Module (S / VCC / GND) — Temperature Monitor

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP22 | S (data) | 1-wire data line |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### Photoresistor Module (AO / VCC / GND) — Light Detector

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | AO (analog out) | Bright = high ADC value |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### Active Buzzer Module (S / VCC / GND) — Alarm Siren

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal) | HIGH = buzzer on |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### RGB LED Module (R / G / B / GND) — Status Light

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Ground (common cathode) |

### Button Switch Module (S / VCC / GND) — Arm/Disarm Button

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP14 | S (signal) | HIGH when pressed (check yours) |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### Touch Sensor Module (S / VCC / GND) — Panic Button

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP16 | S (signal) | HIGH when touched |
| 3V3 | VCC | Power |
| GND | GND | Ground |

---

## The code

This is the biggest program you have written! Take time to read through it carefully. Notice how each job has its own function, and how clearly the state machine reads.

```c
/**
 * Lesson 20: Smart Security System — Final Project!
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * System States:
 *   DISARMED -> Green LED, sensors ignored
 *   ARMED    -> Slow yellow blink, all sensors active
 *   ALARM    -> Red LED + buzzer, intruder/fire detected!
 *
 * Controls:
 *   Button (GP14): Press 3 times within 3 seconds to ARM or DISARM
 *   Touch  (GP16): Instant PANIC — triggers alarm immediately
 *
 * Sensors (active only when ARMED):
 *   Tilt Switch  (GP2)  — detects movement/tampering
 *   Flame Sensor (GP3)  — detects fire
 *   DHT11        (GP22) — high temperature alarm (> 35°C)
 *   Photoresistor(GP26) — sudden bright light in dark room
 *
 * Indicators:
 *   RGB LED  — Green (disarmed), Yellow blink (armed), Red (alarm)
 *   Buzzer   — Rapid beeps in alarm state
 */

#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/gpio.h"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PIN DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#define TILT_PIN       2    // Tilt switch
#define FLAME_PIN      3    // Flame sensor digital output
#define DHT_PIN       22    // DHT11 data line
#define PHOTO_ADC_PIN 26    // Photoresistor (ADC0)
#define BUZZER_PIN    15    // Active buzzer
#define LED_R_PIN      9    // RGB LED red
#define LED_G_PIN     10    // RGB LED green
#define LED_B_PIN     11    // RGB LED blue
#define BUTTON_PIN    14    // Arm/disarm button
#define TOUCH_PIN     16    // Panic touch sensor

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SYSTEM CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#define ARM_CODE_PRESSES   3      // Number of button presses to arm/disarm
#define ARM_CODE_WINDOW_MS 3000   // All presses must happen within 3 seconds
#define TEMP_ALARM_C       35     // Alarm if temperature exceeds this (Celsius)
#define LIGHT_ALARM_ADC    3000   // Alarm if ADC suddenly jumps above this
#define DEBOUNCE_MS        50     // Button debounce time

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE MACHINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
typedef enum {
    DISARMED,   // System is off — sensors ignored
    ARMED,      // System is watching — ready to alarm
    ALARM       // INTRUDER/FIRE DETECTED — alarm is sounding!
} SystemState;

// Global state — only one state at a time!
SystemState system_state = DISARMED;
char        alarm_reason[64] = "";   // What triggered the alarm?

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DHT11 DRIVER (minimal — same as Lesson 9)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Returns temperature in Celsius, or -999 on error
int dht11_read_temperature(void) {
    uint8_t data[5] = {0};

    // Start signal: pull LOW for 18ms, then release
    gpio_set_dir(DHT_PIN, GPIO_OUT);
    gpio_put(DHT_PIN, 0);
    sleep_ms(18);
    gpio_put(DHT_PIN, 1);
    sleep_us(40);
    gpio_set_dir(DHT_PIN, GPIO_IN);
    gpio_pull_up(DHT_PIN);

    // Wait for DHT11 response
    uint32_t timeout = 10000;
    while (gpio_get(DHT_PIN) == 1 && --timeout);
    if (!timeout) return -999;
    while (gpio_get(DHT_PIN) == 0 && --timeout);
    if (!timeout) return -999;
    while (gpio_get(DHT_PIN) == 1 && --timeout);
    if (!timeout) return -999;

    // Read 40 bits of data
    for (int i = 0; i < 40; i++) {
        // Each bit starts with a 50us LOW pulse
        timeout = 10000;
        while (gpio_get(DHT_PIN) == 0 && --timeout);
        if (!timeout) return -999;

        // Then a HIGH pulse: ~26-28us = 0, ~70us = 1
        uint32_t high_time = 0;
        while (gpio_get(DHT_PIN) == 1 && high_time < 200) {
            sleep_us(1);
            high_time++;
        }
        data[i / 8] <<= 1;
        if (high_time > 40) data[i / 8] |= 1;
    }

    // Verify checksum
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if ((checksum & 0xFF) != data[4]) return -999;

    return (int)data[2];  // Temperature integer part in Celsius
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LED & BUZZER HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// Update the status LED based on current system state
void update_leds(SystemState state) {
    static bool yellow_on = false;
    static uint32_t last_blink_ms = 0;

    uint32_t now = to_ms_since_boot(get_absolute_time());

    switch (state) {
        case DISARMED:
            set_rgb(false, true, false);   // Solid GREEN — relaxed!
            break;

        case ARMED:
            // Slow yellow BLINK — system is watching!
            if (now - last_blink_ms >= 500) {
                yellow_on       = !yellow_on;
                last_blink_ms   = now;
            }
            if (yellow_on) {
                set_rgb(true, true, false); // Yellow (red + green = yellow)
            } else {
                set_rgb(false, false, false); // Off
            }
            break;

        case ALARM:
            // Fast RED flash — ALARM!
            if (now - last_blink_ms >= 150) {
                yellow_on     = !yellow_on;
                last_blink_ms = now;
            }
            if (yellow_on) {
                set_rgb(true, false, false);  // Red
            } else {
                set_rgb(false, false, false); // Off
            }
            break;
    }
}

// Sound the alarm buzzer (rapid beep pattern)
// Call this repeatedly while in ALARM state — it handles its own timing
void sound_alarm(void) {
    static uint32_t last_toggle_ms = 0;
    static bool     buzzer_on      = false;

    uint32_t now = to_ms_since_boot(get_absolute_time());
    if (now - last_toggle_ms >= 200) {  // Toggle every 200ms = fast beeping
        buzzer_on       = !buzzer_on;
        last_toggle_ms  = now;
        gpio_put(BUZZER_PIN, buzzer_on ? 1 : 0);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE TRANSITION FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
void arm_system(void) {
    system_state = ARMED;
    alarm_reason[0] = '\0';
    gpio_put(BUZZER_PIN, 0);
    printf("\n🔒 SYSTEM ARMED — watching all sensors...\n");
    printf("   [Press button 3x to disarm | Touch panic sensor = instant alarm]\n\n");

    // Confirmation beep: three short beeps
    for (int i = 0; i < 3; i++) {
        gpio_put(BUZZER_PIN, 1); sleep_ms(80);
        gpio_put(BUZZER_PIN, 0); sleep_ms(80);
    }
}

void disarm_system(void) {
    system_state = DISARMED;
    alarm_reason[0] = '\0';
    gpio_put(BUZZER_PIN, 0);
    set_rgb(false, true, false);
    printf("\n🔓 SYSTEM DISARMED — all clear!\n");
    printf("   [Press button 3x to arm again]\n\n");

    // Confirmation beep: one long beep
    gpio_put(BUZZER_PIN, 1); sleep_ms(400);
    gpio_put(BUZZER_PIN, 0);
}

void trigger_alarm(const char *reason) {
    if (system_state == ALARM) return;  // Already alarming
    system_state = ALARM;
    snprintf(alarm_reason, sizeof(alarm_reason), "%s", reason);
    printf("\n🚨 ALARM TRIGGERED: %s\n", reason);
    printf("   [Press button 3x to disarm the alarm]\n\n");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SENSOR CHECKING FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Only called when system is ARMED.
// Checks all sensors and calls trigger_alarm() if anything is detected.
void check_sensors(void) {

    // ── Tilt Switch: did someone move the device? ─────────────────
    // The tilt switch changes state when tilted — we detect ANY change from
    // the initial position as a tamper event.
    static int  tilt_baseline     = -1;
    static bool tilt_calibrated   = false;

    int tilt_now = gpio_get(TILT_PIN);
    if (!tilt_calibrated) {
        tilt_baseline   = tilt_now;  // Remember starting position
        tilt_calibrated = true;
    } else if (tilt_now != tilt_baseline) {
        trigger_alarm("MOVEMENT DETECTED (tilt sensor)");
        return;
    }

    // ── Flame Sensor: is there fire? ─────────────────────────────
    // Most flame sensors output LOW when flame is detected
    bool flame_detected = !gpio_get(FLAME_PIN);  // Invert if needed for yours
    if (flame_detected) {
        trigger_alarm("FIRE DETECTED (flame sensor)");
        return;
    }

    // ── DHT11: is it getting dangerously hot? ────────────────────
    // Read temperature once every ~5 seconds to avoid overloading the DHT11
    static uint32_t last_dht_read = 0;
    static int      last_temp     = 0;
    uint32_t now = to_ms_since_boot(get_absolute_time());

    if (now - last_dht_read >= 5000) {
        last_dht_read = now;
        int temp = dht11_read_temperature();
        if (temp != -999) {
            last_temp = temp;
            printf("   [Temp: %d°C]\n", temp);
        }
    }
    if (last_temp >= TEMP_ALARM_C) {
        trigger_alarm("HIGH TEMPERATURE (DHT11 sensor)");
        return;
    }

    // ── Photoresistor: sudden bright light in a dark room? ───────
    // We look for the light level suddenly going HIGH — e.g. a torch in a dark room
    adc_select_input(0);
    uint16_t light = adc_read();

    static uint16_t light_baseline   = 0;
    static bool     light_calibrated = false;
    static uint32_t last_calib_time  = 0;

    if (!light_calibrated || (now - last_calib_time > 30000)) {
        // Calibrate baseline every 30 seconds if no alarm has happened
        light_baseline   = light;
        light_calibrated = true;
        last_calib_time  = now;
    }

    // If light jumped suddenly by more than 800 ADC units — suspicious!
    int light_change = (int)light - (int)light_baseline;
    if (light_change > 800 && light > LIGHT_ALARM_ADC) {
        trigger_alarm("UNEXPECTED LIGHT (photoresistor)");
        return;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BUTTON HANDLER (ARM/DISARM CODE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Call every loop. Detects 3 button presses within ARM_CODE_WINDOW_MS.
// When the code is entered, toggles ARM/DISARM (or disarms the alarm).
void handle_button(void) {
    static bool     prev_button      = false;
    static int      press_count      = 0;
    static uint32_t first_press_ms   = 0;
    static uint32_t last_press_ms    = 0;

    bool button_now = gpio_get(BUTTON_PIN);  // HIGH when pressed
    uint32_t now    = to_ms_since_boot(get_absolute_time());

    // Detect button press (rising edge)
    if (button_now && !prev_button) {
        // Debounce: ignore if pressed again too quickly
        if (now - last_press_ms < DEBOUNCE_MS) {
            prev_button = button_now;
            return;
        }
        last_press_ms = now;

        if (press_count == 0) {
            first_press_ms = now;  // Start counting from first press
            press_count    = 1;
        } else {
            press_count++;
        }
        printf("   [Button press %d/%d]\n", press_count, ARM_CODE_PRESSES);
    }

    // Reset counter if window expired
    if (press_count > 0 && (now - first_press_ms) > ARM_CODE_WINDOW_MS) {
        printf("   [Button code timed out — try again]\n");
        press_count = 0;
    }

    // Check if code was completed
    if (press_count >= ARM_CODE_PRESSES) {
        press_count = 0;  // Reset for next use

        if (system_state == DISARMED) {
            arm_system();
        } else {
            disarm_system();  // Works from both ARMED and ALARM states
        }
    }

    prev_button = button_now;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOUCH PANIC BUTTON HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
void handle_panic_button(void) {
    static bool prev_touch = false;
    bool touching = gpio_get(TOUCH_PIN);

    // Only trigger on rising edge (finger just touched)
    if (touching && !prev_touch) {
        if (system_state == ARMED || system_state == DISARMED) {
            printf("   [PANIC BUTTON PRESSED!]\n");
            trigger_alarm("PANIC BUTTON (touch sensor)");
        }
    }
    prev_touch = touching;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  WI-FI TEASER (Pico 2 W exclusive feature!)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Your Pico 2 W has a built-in CYW43 Wi-Fi chip!
// The code below is NOT compiled in this lesson (it is commented out)
// but this is what a Wi-Fi alarm alert would look like.
// A full Wi-Fi lesson is coming — this is just a sneak peek!
//
// #include "pico/cyw43_arch.h"
// #include "lwip/tcp.h"
//
// void wifi_send_alert(const char *reason) {
//     // Step 1: Initialise the Wi-Fi chip
//     if (cyw43_arch_init()) {
//         printf("Wi-Fi chip init failed!\n");
//         return;
//     }
//
//     // Step 2: Connect to your home Wi-Fi network
//     cyw43_arch_enable_sta_mode();
//     if (cyw43_arch_wifi_connect_timeout_ms(
//             "YourNetworkName",   // <-- Put your Wi-Fi name here
//             "YourPassword",      // <-- Put your Wi-Fi password here
//             CYW43_AUTH_WPA2_AES_PSK,
//             30000)) {
//         printf("Could not connect to Wi-Fi!\n");
//         return;
//     }
//     printf("Connected to Wi-Fi!\n");
//
//     // Step 3: Send an HTTP request to a notification service
//     // (for example, ntfy.sh — a free push notification service)
//     // In a full lesson you would open a TCP connection and send:
//     // POST /my-security-system HTTP/1.1
//     // Host: ntfy.sh
//     // Content: ALARM: [reason]
//
//     printf("Alert sent: ALARM triggered — %s\n", reason);
//     cyw43_arch_deinit();
// }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
int main() {
    stdio_init_all();
    sleep_ms(2000);

    printf("\n");
    printf("╔══════════════════════════════════════════════╗\n");
    printf("║   PICO 2 W SMART SECURITY SYSTEM v1.0       ║\n");
    printf("║   Lesson 20 — Final Project                  ║\n");
    printf("╠══════════════════════════════════════════════╣\n");
    printf("║  Button x3 = Arm / Disarm                    ║\n");
    printf("║  Touch pad = Panic button                    ║\n");
    printf("║  Green LED = Disarmed                        ║\n");
    printf("║  Yellow blink = Armed & watching             ║\n");
    printf("║  Red flash + buzzer = ALARM!                 ║\n");
    printf("╚══════════════════════════════════════════════╝\n\n");

    // ── Set up all output pins ───────────────────────────────────
    gpio_init(BUZZER_PIN); gpio_set_dir(BUZZER_PIN, GPIO_OUT); gpio_put(BUZZER_PIN, 0);
    gpio_init(LED_R_PIN);  gpio_set_dir(LED_R_PIN,  GPIO_OUT);
    gpio_init(LED_G_PIN);  gpio_set_dir(LED_G_PIN,  GPIO_OUT);
    gpio_init(LED_B_PIN);  gpio_set_dir(LED_B_PIN,  GPIO_OUT);

    // ── Set up all input pins ─────────────────────────────────────
    gpio_init(TILT_PIN);   gpio_set_dir(TILT_PIN,   GPIO_IN); gpio_pull_up(TILT_PIN);
    gpio_init(FLAME_PIN);  gpio_set_dir(FLAME_PIN,  GPIO_IN); gpio_pull_up(FLAME_PIN);
    gpio_init(BUTTON_PIN); gpio_set_dir(BUTTON_PIN, GPIO_IN); gpio_pull_down(BUTTON_PIN);
    gpio_init(TOUCH_PIN);  gpio_set_dir(TOUCH_PIN,  GPIO_IN);

    // ── Set up ADC for photoresistor ─────────────────────────────
    adc_init();
    adc_gpio_init(PHOTO_ADC_PIN);

    // ── DHT11 pin — starts as input with pull-up ─────────────────
    gpio_init(DHT_PIN);
    gpio_set_dir(DHT_PIN, GPIO_IN);
    gpio_pull_up(DHT_PIN);

    // ── Start in DISARMED state ───────────────────────────────────
    set_rgb(false, true, false);  // Green
    printf("System ready. Press the button 3 times to arm.\n\n");

    // ── Status print timer ────────────────────────────────────────
    uint32_t last_status_ms = 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  MAIN LOOP — the heart of the state machine
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());

        // ── Always handle the button (to arm/disarm from any state) ──
        handle_button();

        // ── Always handle the panic button ───────────────────────────
        handle_panic_button();

        // ── State-specific behaviour ─────────────────────────────────
        switch (system_state) {

            case DISARMED:
                // Just show green LED and wait for arming code
                update_leds(DISARMED);
                break;

            case ARMED:
                // Blink yellow and check all sensors every loop
                update_leds(ARMED);
                check_sensors();
                break;

            case ALARM:
                // Flash red, sound the buzzer, report on serial
                update_leds(ALARM);
                sound_alarm();

                // Print alarm reason every 3 seconds (so user knows what triggered)
                if (now - last_status_ms >= 3000) {
                    printf("🚨 ALARM ACTIVE: %s | Press button 3x to disarm\n",
                           alarm_reason);
                    last_status_ms = now;
                }
                break;
        }

        // ── Periodic status print (every 5 seconds when disarmed/armed) ──
        if (system_state != ALARM && now - last_status_ms >= 5000) {
            const char *state_str = (system_state == DISARMED) ? "DISARMED" : "ARMED";
            printf("[Status: %s]\n", state_str);
            last_status_ms = now;
        }

        sleep_ms(20);  // ~50 loops per second — fast and responsive
    }

    return 0;
}
```

---

### How the code works

1. **The `SystemState` enum** defines the three states: `DISARMED`, `ARMED`, and `ALARM`. An `enum` is like giving names to numbers — instead of remembering that state 0 = disarmed and state 2 = alarm, you can just write `ARMED` and the code is instantly readable. Professional engineers use enums for state machines all the time!

2. **The switch statement in `main()`** is the heart of the state machine. Each time through the loop, it looks at `system_state` and runs only the code for the current state. If we are `DISARMED`, sensors are not checked. If we are `ARMED`, `check_sensors()` runs every loop. If we are `ALARM`, the buzzer keeps sounding and the LED keeps flashing.

3. **`arm_system()`, `disarm_system()`, and `trigger_alarm()`** are the *state transition functions* — they change `system_state` and do the bookkeeping (print messages, save the alarm reason, make confirmation sounds). Keeping transitions in their own functions means the main loop stays clean and easy to understand.

4. **The button code** uses the "press count within a time window" technique — the same concept you used for the touch sensor secret code in Lesson 18. Three presses within 3 seconds triggers the transition. Fewer presses, or presses spread too far apart, are ignored.

5. **`check_sensors()`** uses **calibration baselines** for the tilt switch and photoresistor. Instead of hard-coding threshold values, it remembers what "normal" looks like when the system arms and compares future readings against that. This makes the system work in different environments automatically.

6. **`update_leds()`** and `sound_alarm()` use **static timing variables** to create non-blocking blink and beep patterns. The `static` keyword inside a function means the variable keeps its value between calls — it is like a little memory that belongs to just that function.

7. **The Wi-Fi teaser** shows you commented-out code using `cyw43_arch_init()` — the Pico SDK function that starts the Wi-Fi chip. In a future lesson you will fill in the details, connect to your home network, and actually send a notification when the alarm fires. The hardware is already there on your Pico 2 W — just waiting!

---

## Try it

1. **ARM and DISARM:** Press the button three times and watch the LED change from solid green to blinking yellow. Press three times again to disarm. Can you do it consistently within the 3-second window?

2. **Trigger the tilt alarm:** Arm the system, then pick up the Pico and tilt it sideways. Does the alarm trigger? The tilt switch detected the movement! Press 3x to disarm.

3. **Trigger the panic button:** With the system armed (or even disarmed!), tap the touch sensor. Does it immediately jump to ALARM state regardless of whether anything suspicious was detected by sensors?

4. **Test light alarm:** Arm the system in a dimly lit room. Shine a torch directly at the photoresistor. The sudden light increase should trigger the alarm!

---

## Challenge

**Add the IR Remote as an Alternative Arm/Disarm!**

Dig out the IR receiver and remote from Lesson 11 and add it to your security system:

1. Wire the IR receiver to GP28 (or any free GPIO)
2. Adapt the NEC protocol decoder from Lesson 11 into a helper function `check_ir_remote()`
3. Call it from the main loop
4. Choose one button on the remote to ARM the system (e.g. the "1" button) and another to DISARM (e.g. the "0" button)
5. When a valid code is received and matches, call `arm_system()` or `disarm_system()`

This is how a real commercial security system works — a remote key fob sends a code that arms or disarms without anyone needing to press a physical button!

**Extra challenge:** Add a "stealth mode" — a specific IR button that silences the buzzer for 30 seconds without fully disarming the system (useful for "I know I left the window open, please shut up" situations).

---

## Congratulations — You Did It!

You have completed all 20 lessons! Look at everything you have learned to build and program:

| Lesson | What you learned |
|--------|-----------------|
| 1 | Setting up the Pico 2 W and blinking an LED |
| 2 | PWM colour mixing with an RGB LED |
| 3 | Digital inputs and debouncing buttons |
| 4 | Controlling an active buzzer |
| 5 | Playing melodies with a passive buzzer |
| 6 | Reading analog values with the ADC (photoresistor) |
| 7 | Combining analog + digital readings (sound sensor) |
| 8 | Hardware interrupts (tilt and shock switches) |
| 9 | 1-wire protocol to read temperature and humidity (DHT11) |
| 10 | Multi-sensor alarm systems (flame sensor) |
| 11 | Decoding a real wireless protocol (IR remote) |
| 12 | Dual-axis analog input (joystick) |
| 13 | Quadrature encoding and counting (rotary encoder) |
| 14 | Digital surface detection (line tracking sensor) |
| 15 | Controlling high-power loads safely (relay) |
| 16 | Magnetic field detection — analog and digital (Hall sensors) |
| 17 | Beam-break counting and measurement (photo-interrupter) |
| 18 | Capacitive touch and laser control with timing logic |
| 19 | Signal filtering and peak detection (heartbeat sensor) |
| 20 | State machines and multi-sensor system architecture |

That is 20 hardware modules, dozens of programming concepts, and one complete working security system — all written in C on a microcontroller. You have learned things that many adults who call themselves "programmers" have never done. ADC, PWM, I2C, 1-wire, interrupts, state machines, signal filtering — these are real embedded systems engineering skills.

What comes next? The world of electronics is endless:
- **Wi-Fi and networking** — send data to the internet, control your Pico from a phone
- **I2C and SPI displays** — show your data on an OLED or LCD screen
- **Servo motors and robotics** — make things move!
- **MicroPython** — if you ever want to try a different language
- **Custom PCBs** — design your own circuit boards

But whatever you build next, you now have the foundation to understand it, learn it, and make it work. Keep building. Keep experimenting. Break things and figure out why. Every real engineer does exactly that.

**You are a maker now. Keep going!**

---

## Summary

A state machine is one of the most powerful tools in all of software engineering — it keeps complex programs organised by making sure the system is always in exactly one clearly defined state at a time, with explicit rules for moving between states. You brought together eight different sensors and modules into a single cohesive security system, learned how to calibrate sensors dynamically, and wrote clean modular code with dedicated functions for each responsibility. And with the Wi-Fi teaser, you caught a glimpse of where this journey leads next — a Pico 2 W that does not just sense the world but talks to it!
