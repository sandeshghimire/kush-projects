# Lesson 32: Analog Hall Sensor Module — Yes or No Magnet Detector!

## 🎯 What You'll Learn
- How the analog Hall sensor differs from the linear Hall sensor
- How a digital threshold sensor works (yes/no output)
- How to reliably detect magnets without false triggers
- How to add debouncing to a magnetic sensor
- How to use magnets to build a non-contact rotation counter!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Analog Hall Sensor Module from Elegoo kit (digital output only version)
- A small magnet
- LED (any color) for visual feedback
- Buzzer (optional, for beep on detection)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Wait — if this lesson is called the "Analog Hall Sensor Module", why does it only have a digital output? Confusing name, right? The module is called "analog" because it is based on a Hall-effect chip that internally measures an analog magnetic field — but the module only brings out a digital signal (HIGH or LOW). Think of it like a fancy kitchen scale that measures weight analog-style, but only shows you a green or red light — not the actual number!

The digital output is simple: HIGH when no magnet is nearby, LOW when a magnet is detected. This is perfect for applications where you just need to know "is there a magnet here right now?" rather than "how strong is the field?" It is simpler to use than the linear Hall sensor from Lesson 31 but less informative.

Here is a great real-world use case: bike speedometers! Glue a tiny magnet to a wheel spoke. Mount the Hall sensor on the bike frame next to the wheel. Every time the wheel spins one full rotation, the magnet passes the sensor and triggers a LOW pulse. Count these pulses and you can calculate: how many rotations per second, times the wheel circumference, equals your speed! This is called a **tachometer** (tack-OM-eter) — a device that measures rotation speed. Let's build one!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | DO or S (digital output) | HIGH = no magnet, LOW = magnet detected |
| 3V3 | VCC | Power |
| GND | GND | Ground |
| GP16 | — | Status LED |

---

## 💻 The Code

```c
/**
 * Lesson 32: Analog Hall Sensor Module (Digital Output)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * DO pin: HIGH = no magnet, LOW = magnet detected
 *
 * We build a rotation counter / tachometer:
 * - Count each time the magnet passes the sensor
 * - Calculate rotations per minute (RPM)
 * - Show speed based on a simulated wheel circumference
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK

// Pin definitions
#define HALL_PIN   15   // GP15 — Hall sensor digital output
#define LED_PIN    16   // GP16 — LED flashes on each detection

// For the tachometer simulation:
// Imagine a wheel with this circumference in centimeters
#define WHEEL_CIRCUMFERENCE_CM 200   // 200cm = 2m (like a bicycle wheel)

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 32: Analog Hall Sensor Module ===\n");
    printf("Move a magnet past the sensor repeatedly to simulate a spinning wheel!\n");
    printf("Each pass = one rotation.\n\n");

    // Set up Hall sensor as input
    gpio_init(HALL_PIN);
    gpio_set_dir(HALL_PIN, GPIO_IN);   // We read from it
    gpio_pull_up(HALL_PIN);            // Pull-up: HIGH when no magnet

    // Set up LED as output
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);   // LED off

    bool     prev_state       = true;   // Previous pin state (HIGH = no magnet)
    uint32_t rotation_count   = 0;      // Total rotations counted
    uint32_t last_trigger_ms  = 0;      // When was the last trigger?
    uint32_t window_start_ms  = 0;      // Start of current 5-second window
    uint32_t window_rotations = 0;      // Rotations in current window

    // Debounce time: ignore re-triggers within this many milliseconds
    // A real bicycle wheel at reasonable speed won't trigger faster than 5ms
    #define DEBOUNCE_MS 50

    window_start_ms = to_ms_since_boot(get_absolute_time());

    printf("Waiting for magnet...\n\n");

    while (true) {

        // Read current state of Hall sensor
        bool current_state = gpio_get(HALL_PIN);  // true = HIGH = no magnet
        bool magnet_now    = !current_state;       // true = LOW = magnet present

        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Detect a NEW trigger (transition from no-magnet to magnet)
        // and check debounce time to avoid double-counting
        if (magnet_now && !(!prev_state) &&
            (now_ms - last_trigger_ms) > DEBOUNCE_MS) {

            // Falling edge detected — magnet just arrived!
            rotation_count++;     // Count this rotation
            window_rotations++;   // Count for current window
            last_trigger_ms = now_ms;

            // Flash the LED briefly
            gpio_put(LED_PIN, 1);

            // Calculate time since last rotation
            uint32_t interval_ms = now_ms - last_trigger_ms;

            printf("Rotation #%lu detected!\n", rotation_count);
        }

        // Detect when magnet goes away (for a cleaner trigger next time)
        if (!magnet_now && !prev_state) {
            gpio_put(LED_PIN, 0);   // Turn off LED when magnet leaves
        }

        // Update LED (mirror magnet state for real-time feedback)
        gpio_put(LED_PIN, magnet_now ? 1 : 0);

        // Every 5 seconds: calculate and display RPM and speed
        if (now_ms - window_start_ms >= 5000) {
            float time_seconds  = 5.0f;                      // 5 second window
            float rps           = window_rotations / time_seconds;  // rotations/sec
            float rpm           = rps * 60.0f;               // rotations/min

            // Speed = rotations per second * circumference
            float speed_cm_s    = rps * WHEEL_CIRCUMFERENCE_CM;
            float speed_km_h    = speed_cm_s * 0.036f;      // cm/s to km/h conversion

            printf("\n--- 5-Second Report ---\n");
            printf("Rotations in window: %lu\n", window_rotations);
            printf("Speed: %.1f RPM\n", rpm);
            printf("Simulated wheel speed: %.2f km/h\n", speed_km_h);
            printf("Total rotations ever: %lu\n", rotation_count);
            printf("-----------------------\n\n");

            // Reset window counters
            window_rotations = 0;
            window_start_ms  = now_ms;
        }

        prev_state = current_state;  // Remember this state for next loop
        sleep_ms(5);                 // Check 200 times per second
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Digital input:** The Hall sensor pin reads HIGH (no magnet) or LOW (magnet present). We invert it with `magnet_now = !current_state` so that `magnet_now = true` when a magnet IS present.

2. **Edge detection:** We count rotations only when the magnet ARRIVES (transition from no-magnet to magnet-present). We do NOT count every loop where the magnet is present — that would count the same magnet hundreds of times!

3. **Debounce:** We use a `DEBOUNCE_MS` of 50ms to ignore re-triggers. If the magnet triggers again within 50ms of the last trigger, we skip it. This prevents one physical pass from being counted multiple times due to vibration.

4. **5-second window:** We count rotations for 5 seconds, then calculate RPM. `rps = rotations / 5` gives us rotations per second. Multiply by 60 for RPM (rotations per minute).

5. **Speed calculation:** Multiply rotations per second by wheel circumference to get distance per second. Multiply by 0.036 to convert from cm/s to km/h. Real bike computers use exactly this formula!

---

## 🎮 Try It!

1. **Single swipe:** Pass the magnet slowly past the sensor once. Does the counter increment by exactly 1?

2. **Fast swipes:** Swipe the magnet past 10 times as fast as you can. Does the counter show 10?

3. **RPM test:** Swipe the magnet 12 times in 5 seconds. You should get about 144 RPM!

4. **Speed simulation:** Calculate how fast a wheel with a 200cm circumference at 60 RPM would go. Does the code agree?

---

## 🏆 Challenge

Build a **lap timer**! Count every 10 rotations as one "lap". Every time 10 rotations are completed, record the time it took. Print a lap history like: `"Lap 1: 8.2s, Lap 2: 7.6s, Lap 3: 7.9s"`. Also track the best (fastest) lap time! This is exactly how motorsport timing systems work — a magnet on the car triggers a sensor as it crosses the finish line each lap.

---

## 📝 Summary

The analog Hall sensor module provides a simple digital HIGH/LOW output — LOW when a magnet is close, HIGH when it is not. By detecting each time a rotating magnet passes the sensor, you can count rotations and calculate speed — exactly like a bicycle speedometer. Debouncing prevents false counts from vibration, and using a time window lets you calculate RPM accurately. This sensor is used in real speedometers, motor controllers, and position detection systems!
