# Project 25: Robot Obstacle Detector — Give Your Robot Eyes!

## 🎯 What You'll Learn
- How an Obstacle Avoidance Sensor uses infrared light to detect objects
- How to use sensor output to control LEDs and a buzzer
- How real robots avoid crashing into walls
- How infrared light works (the invisible light!)

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Obstacle Avoidance Sensor Module | $2.00 |
| Active Buzzer Module | $1.00 |
| Red LED | $0.10 |
| Yellow LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.40** |

## 🌟 The Story

How do robot vacuum cleaners avoid bumping into your sofa? They have infrared sensors — just like the ones in TV remotes — that bounce invisible light off objects! When light bounces back fast, there is something close. No bounced light? Clear path ahead!

Today you will build robot eyes! Your Obstacle Avoidance Sensor shoots out invisible infrared light. When something is in the way, the light bounces back and the sensor reports it. Your Pico will blink an LED and beep when something is close. Attach it to a toy car and you have the beginning of an actual robot!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Obstacle Sensor VCC | Pico 3.3V | Power |
| Obstacle Sensor GND | Pico GND | Ground |
| Obstacle Sensor OUT | Pico GP6 | Signal: LOW = obstacle detected |
| Buzzer + pin | Pico GP15 | Warning beeper |
| Buzzer - pin | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | "Obstacle!" warning |
| Red LED short leg | Pico GND | Ground |
| Yellow LED long leg | Pico GP13 via 220Ω | "Scanning" indicator |
| Yellow LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include <stdio.h>          // For printf messages

// Pin definitions
#define SENSOR_PIN  6       // Obstacle sensor output (LOW = obstacle)
#define BUZZER_PIN  15      // Warning buzzer
#define RED_LED     14      // Obstacle warning LED
#define YELLOW_LED  13      // Scanning indicator LED

// Beep frequency variables
int beep_interval = 500;    // Milliseconds between beeps (changes with distance)

// Track previous state to detect changes
bool was_obstacle = false;  // Was there an obstacle last loop?

// Blink and beep once — for obstacle warning
void warning_pulse() {
    gpio_put(BUZZER_PIN, 1);    // Buzzer on
    gpio_put(RED_LED, 1);       // Red LED on
    sleep_ms(100);               // On for 100ms
    gpio_put(BUZZER_PIN, 0);    // Buzzer off
    gpio_put(RED_LED, 0);       // Red LED off
}

// Scanning animation on yellow LED
void scanning_pulse() {
    gpio_put(YELLOW_LED, 1);    // Yellow on
    sleep_ms(50);                // Brief flash
    gpio_put(YELLOW_LED, 0);    // Yellow off
}

int main() {
    stdio_init_all();           // Start USB serial
    sleep_ms(2000);             // Wait for USB

    // Set up sensor pin
    gpio_init(SENSOR_PIN);
    gpio_set_dir(SENSOR_PIN, GPIO_IN);   // Input — reading from sensor
    gpio_pull_up(SENSOR_PIN);            // Pull-up (sensor pulls LOW when triggered)

    // Set up output pins
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    gpio_init(RED_LED);
    gpio_set_dir(RED_LED, GPIO_OUT);
    gpio_put(RED_LED, 0);

    gpio_init(YELLOW_LED);
    gpio_set_dir(YELLOW_LED, GPIO_OUT);
    gpio_put(YELLOW_LED, 0);

    printf("=== ROBOT OBSTACLE DETECTOR ===\n");
    printf("Sensor active! Move objects in front.\n");
    printf("LOW signal = obstacle detected!\n\n");

    // Startup animation
    for (int i = 0; i < 3; i++) {       // Three startup flashes
        gpio_put(YELLOW_LED, 1);
        gpio_put(RED_LED, 1);
        sleep_ms(100);
        gpio_put(YELLOW_LED, 0);
        gpio_put(RED_LED, 0);
        sleep_ms(100);
    }

    int scan_timer = 0;                  // Timer for scanning animation

    while (true) {                       // Loop forever

        // Read the obstacle sensor
        // LOW (0) = obstacle detected!
        // HIGH (1) = no obstacle, path is clear
        bool obstacle = !gpio_get(SENSOR_PIN);  // Invert: LOW = true = obstacle

        if (obstacle) {                  // OBSTACLE DETECTED!

            if (!was_obstacle) {         // Just spotted something new?
                printf("*** OBSTACLE DETECTED! ***\n");
                printf("Stop! Something is in the way!\n");
            }

            // Rapid warning — blink and beep fast
            warning_pulse();             // Flash and beep
            sleep_ms(150);               // Wait a bit

            gpio_put(YELLOW_LED, 0);     // Yellow off during obstacle

        } else {                         // Path is clear

            if (was_obstacle) {          // Just cleared?
                printf("Path clear! Robot can move.\n\n");
            }

            gpio_put(RED_LED, 0);        // Red off — no obstacle
            gpio_put(BUZZER_PIN, 0);     // Buzzer off

            // Do a slow scanning pulse on yellow LED
            scan_timer++;                // Increment timer
            if (scan_timer >= 10) {      // Every 10 loops
                scanning_pulse();        // Brief yellow flash
                scan_timer = 0;          // Reset timer
            }
        }

        was_obstacle = obstacle;         // Remember for next loop
        sleep_ms(50);                    // Check 20 times per second
    }

    return 0;                            // Never reaches here
}
```

## 🔍 How It Works

1. The obstacle sensor has an infrared LED that constantly shoots invisible light forward
2. It also has an infrared receiver that listens for that light to bounce back
3. When an object is close, the light bounces back and the OUT pin goes LOW
4. The Pico reads this signal and triggers the LED and buzzer
5. When the path is clear, the OUT pin stays HIGH and everything is calm

## 🎮 Try It!

- Slowly move your hand toward the sensor — at what distance does it trigger?
- Try different coloured objects — does it detect black objects as easily as white ones?
- Point the sensor at a mirror — does the reflection fool it?
- Try in a dark room vs bright light — does brightness matter?

## 🏆 Challenge

The obstacle sensor has a small potentiometer (tiny dial) on it that adjusts sensitivity. Turn it with a screwdriver to change the detection distance. Then add two sensors pointing in different directions and light different LEDs for "obstacle on left" vs "obstacle on right" — like proper robot eyes!

## 📝 What You Built

You built an infrared obstacle detector — the same technology that stops robot vacuum cleaners from falling down stairs! Your Pico can now see obstacles using invisible light and warn you with flashing LEDs and beeps, just like a real robot's collision avoidance system.
