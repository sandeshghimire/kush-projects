# Lesson 25: Obstacle Avoidance Sensor — Eyes for Your Robot!

## 🎯 What You'll Learn
- How the obstacle avoidance sensor uses invisible infrared light
- Why robots need sensors to avoid bumping into things
- How to read a digital signal to detect nearby objects
- How to adjust the sensor's sensitivity with its potentiometer
- How to build a simple obstacle alarm

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Obstacle Avoidance Sensor Module from Elegoo kit
- Active Buzzer Module (~$1)
- LED (any color) or use onboard LED
- Small Phillips screwdriver (to adjust the potentiometer)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Have you ever watched a robot vacuum cleaner zip around a room without bumping into the furniture? It uses obstacle sensors! Your Elegoo kit includes one of these — an **obstacle avoidance sensor module**. It is like giving your robot a pair of tiny invisible eyes that can see objects in the dark!

Here is the secret: the module has two parts. One side has a small **IR LED** (infrared LED) that constantly shoots out invisible infrared light — like a tiny flashlight that only insects and sensors can see! The other side has an **IR receiver** (like an IR camera) that watches for the light to bounce back. If an object is close enough, the IR light hits it and bounces back to the receiver. The module detects this and pulls its output pin LOW to say "something is there!". If nothing is close, the light just goes off into the distance and never comes back, so the output stays HIGH.

The really cool feature is the **potentiometer** — a tiny dial you can turn with a screwdriver! Turn it one way and the sensor gets more sensitive (detects objects from further away). Turn it the other way and it needs objects to be very close before triggering. This lets you tune the sensor for your exact project. It is like adjusting the volume on a radio, but for obstacle detection sensitivity!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | DO (digital output) | LOW when obstacle detected, HIGH when clear |
| 3V3 | VCC | Power — use 3.3V NOT 5V! |
| GND | GND | Ground |

> **Optional buzzer:**

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP16 | S (signal) | Buzzer for alarm sound |
| 3V3 | VCC | Buzzer power |
| GND | GND | Buzzer ground |

> **Important:** This module works with 3.3V power from the Pico. The output pin goes LOW when an obstacle is detected and HIGH when the path is clear.

---

## 💻 The Code

```c
/**
 * Lesson 25: Obstacle Avoidance Sensor Module (IR Distance)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The DO pin reads:
 *   HIGH = path is clear (no obstacle nearby)
 *   LOW  = obstacle detected! Something is close!
 *
 * Use the potentiometer on the module to adjust sensitivity.
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK library

// Pin connected to the obstacle sensor DO output
#define SENSOR_PIN  15   // GP15 reads obstacle sensor
#define BUZZER_PIN  16   // GP16 controls the alarm buzzer
#define LED_PIN     25   // Onboard LED — shows obstacle detected

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial to connect

    printf("=== Lesson 25: Obstacle Avoidance Sensor ===\n");
    printf("Put your hand in front of the sensor to test it!\n");
    printf("Tip: Use a screwdriver to adjust the sensitivity dial.\n\n");

    // Set up sensor pin as INPUT — we read from it
    gpio_init(SENSOR_PIN);
    gpio_set_dir(SENSOR_PIN, GPIO_IN);   // Input mode
    gpio_pull_up(SENSOR_PIN);            // Pull-up to keep HIGH when clear

    // Set up buzzer as OUTPUT — we control it
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);   // Buzzer off at start

    // Set up onboard LED
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);      // LED off at start

    bool    previous_clear = true;   // Track previous state
    int     obstacle_count = 0;      // Count how many obstacles detected
    uint32_t obstacle_start = 0;     // When did current obstacle arrive?

    printf("Ready! Watching for obstacles...\n\n");

    while (true) {

        // Read the sensor: HIGH = clear, LOW = obstacle!
        bool path_clear = gpio_get(SENSOR_PIN);  // true = HIGH = clear
        bool obstacle   = !path_clear;            // true = obstacle detected

        // Update LED: ON when obstacle, OFF when clear
        gpio_put(LED_PIN, obstacle ? 1 : 0);

        // Get current time
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Detect when an obstacle FIRST appears
        if (obstacle && previous_clear) {
            obstacle_count++;          // Count this detection
            obstacle_start = now_ms;   // Record when it appeared
            printf("OBSTACLE DETECTED! (#%d) Something is in the way!\n",
                   obstacle_count);
        }

        // Detect when obstacle CLEARS
        if (!obstacle && !previous_clear) {
            uint32_t duration = now_ms - obstacle_start;
            printf("Path CLEAR again. Obstacle was there for %d ms.\n\n",
                   (int)duration);
        }

        // Make the buzzer beep while obstacle is present
        if (obstacle) {
            // Rapid beeping means "warning! obstacle!"
            gpio_put(BUZZER_PIN, 1);   // Buzzer ON
            sleep_ms(100);             // Beep for 100ms
            gpio_put(BUZZER_PIN, 0);   // Buzzer OFF
            sleep_ms(100);             // Silence for 100ms
        } else {
            gpio_put(BUZZER_PIN, 0);   // Ensure buzzer is off when clear
            sleep_ms(50);              // Normal loop delay when no obstacle
        }

        // Update state memory
        previous_clear = !obstacle;
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Active LOW sensor:** The sensor pulls its output LOW when an obstacle is detected. We read `path_clear = gpio_get(SENSOR_PIN)` and then `obstacle = !path_clear` to flip it so `obstacle` is `true` when something is blocking the sensor.

2. **State change detection:** We track `previous_clear` so we only print a message when the obstacle APPEARS or DISAPPEARS — not every single loop iteration. This keeps the output clean.

3. **Obstacle timing:** We record `obstacle_start` when an obstacle first appears, then calculate how long it stayed when it clears. This lets us know if someone briefly passed in front or stood there for a long time.

4. **Buzzer pattern:** While an obstacle is present, the buzzer beeps rapidly (100ms on, 100ms off). When clear, the buzzer stays off. The beeping pattern naturally slows down our loop while an obstacle is present.

5. **Potentiometer adjustment:** The module has a small dial that adjusts how far away it can detect objects. Turn it clockwise for more sensitivity (longer range), counter-clockwise for less sensitivity (shorter range).

---

## 🎮 Try It!

1. **Hand test:** Wave your hand slowly in front of the sensor. At what distance does it trigger?

2. **Adjust sensitivity:** Use a small screwdriver to turn the potentiometer. Can you make it detect from further away? From only very close?

3. **Surface test:** Try detecting different surfaces — a white sheet of paper, a dark cloth, your skin. Does the sensor work equally well on all of them?

4. **Speed test:** Move your hand past the sensor very quickly. How fast can you move without it detecting you?

---

## 🏆 Challenge

Build a **robot bumper guard**! Imagine this sensor is mounted on the front of a robot. Write code that keeps track of "clear time" (how long the path has been obstacle-free) and "blocked time" (how long something has been in the way). Print a status every 5 seconds like: `"Last 5 seconds: 3.2s clear, 1.8s blocked"`. Hint: keep two running totals and reset them every 5 seconds!

---

## 📝 Summary

The obstacle avoidance sensor uses invisible infrared light like a tiny torch — it shines IR light forward and listens for any to bounce back. When something close enough reflects the light, the DO pin goes LOW to signal "obstacle detected!". The built-in potentiometer lets you tune the detection distance for your exact needs. This is the core technology used in robot vacuums, automatic doors, and even some car parking sensors!
