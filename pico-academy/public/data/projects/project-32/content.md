# Project 32: Compass Pointer — Find Your Way with Magnetism!

## 🎯 What You'll Learn
- How an Analog Hall Sensor detects magnetic fields directionally
- How to use threshold comparisons to show direction
- How a compass needle finds north
- How smartphones know which way you are facing

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Analog Hall Sensor Module | $2.00 |
| LEDs x4 (any colours) | $0.40 |
| 220Ω Resistors x4 | $0.40 |
| Bar magnet (or strong fridge magnet) | $1.00 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.80** |

## 🌟 The Story

Long before GPS existed, sailors and explorers used a magnetic compass to find their way. A compass needle is just a tiny magnet that lines up with the Earth's magnetic field. The north end of the needle always points roughly toward the Earth's north magnetic pole — like magic!

Your Analog Hall Sensor can feel which direction a magnetic field is coming from. By reading the output value, you can tell if the magnet's north or south pole is closest, and roughly which way the strongest field is coming from. Use four LEDs as arrows and move a bar magnet around — the LEDs will show which direction the field is strongest. It is your very own magnetic compass!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Analog Hall Sensor VCC | Pico 3.3V | Power |
| Analog Hall Sensor GND | Pico GND | Ground |
| Analog Hall Sensor AO | Pico GP26 (ADC0) | Analog output |
| LED North long leg | Pico GP2 via 220Ω | "North" indicator |
| LED South long leg | Pico GP3 via 220Ω | "South" indicator |
| LED East long leg | Pico GP4 via 220Ω | "Strong field" indicator |
| LED West long leg | Pico GP5 via 220Ω | "Weak field" indicator |
| All LED short legs | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // For reading the Hall sensor
#include <stdio.h>          // For printf
#include <stdlib.h>         // For abs()

// Pin definitions
#define HALL_PIN    26      // Analog Hall sensor output
#define ADC_INPUT    0      // ADC channel for GP26

// LED indicator pins
// These represent compass directions on your sensor
#define LED_NORTH   2       // North pole detected
#define LED_SOUTH   3       // South pole detected
#define LED_STRONG  4       // Strong field (magnet very close)
#define LED_WEAK    5       // Weak field (magnet far away)

// Field strength thresholds
#define WEAK_THRESHOLD    50    // Small deviation from baseline
#define MEDIUM_THRESHOLD 200    // Medium magnetic field
#define STRONG_THRESHOLD 500    // Strong magnetic field

// Samples for smoothing
#define SAMPLES  15

// Calibrated baseline (no magnet)
uint16_t baseline = 2048;   // Default — will be calibrated

// Read and smooth the Hall sensor
uint16_t read_hall() {
    uint32_t total = 0;
    for (int i = 0; i < SAMPLES; i++) {
        total += adc_read();
        sleep_us(300);
    }
    return (uint16_t)(total / SAMPLES);
}

// Turn off all direction LEDs
void leds_all_off() {
    gpio_put(LED_NORTH, 0);
    gpio_put(LED_SOUTH, 0);
    gpio_put(LED_STRONG, 0);
    gpio_put(LED_WEAK, 0);
}

// Update LEDs based on field direction and strength
void update_compass_leds(int deviation, int strength) {

    leds_all_off();                             // Clear all first

    if (strength < WEAK_THRESHOLD) {
        // No significant field — no direction LEDs
        // Blink weak LED to show "searching"
        gpio_put(LED_WEAK, 1);
        printf("No strong field. Move a magnet close!\n");
        return;
    }

    // Determine pole: positive deviation = north pole, negative = south pole
    if (deviation > 0) {
        gpio_put(LED_NORTH, 1);                 // North pole nearby!
        printf("NORTH pole detected! ");
    } else {
        gpio_put(LED_SOUTH, 1);                 // South pole nearby!
        printf("SOUTH pole detected! ");
    }

    // Show strength
    if (strength >= STRONG_THRESHOLD) {
        gpio_put(LED_STRONG, 1);                // Strong field
        printf("Very close / Strong field\n");
    } else if (strength >= MEDIUM_THRESHOLD) {
        printf("Medium field\n");
    } else {
        gpio_put(LED_WEAK, 1);                  // Weak field
        printf("Weak field — farther away\n");
    }
}

// Calibrate with no magnet nearby
void calibrate() {
    printf("=== CALIBRATING ===\n");
    printf("Remove all magnets! Calibrating in 3 seconds...\n");
    sleep_ms(3000);

    uint32_t total = 0;
    for (int i = 0; i < 100; i++) {            // 100 samples
        total += adc_read();
        sleep_ms(10);
    }
    baseline = (uint16_t)(total / 100);
    printf("Baseline set: %d\n\n", baseline);
}

// Show a visual compass rose in the serial monitor
void print_compass(int deviation, int strength) {
    printf("Raw deviation: %+5d | Strength: %4d | Pole: ",
           deviation, strength);

    if (strength < WEAK_THRESHOLD) {
        printf("? (no field)\n");
    } else if (deviation > 0) {
        printf("N (North)\n");
    } else {
        printf("S (South)\n");
    }
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up ADC
    adc_init();
    adc_gpio_init(HALL_PIN);
    adc_select_input(ADC_INPUT);

    // Set up LED pins
    int led_pins[] = {LED_NORTH, LED_SOUTH, LED_STRONG, LED_WEAK};
    for (int i = 0; i < 4; i++) {
        gpio_init(led_pins[i]);
        gpio_set_dir(led_pins[i], GPIO_OUT);
        gpio_put(led_pins[i], 0);
    }

    printf("=== COMPASS POINTER ===\n");
    printf("LED N = North pole nearby\n");
    printf("LED S = South pole nearby\n");
    printf("LED STRONG = Very close!\n");
    printf("LED WEAK = Searching...\n\n");

    // Calibrate baseline
    calibrate();

    // Startup test — light up sequence
    for (int i = 0; i < 4; i++) { gpio_put(led_pins[i], 1); sleep_ms(150); }
    sleep_ms(300);
    for (int i = 3; i >= 0; i--) { gpio_put(led_pins[i], 0); sleep_ms(150); }

    printf("Move a bar magnet near the sensor!\n");
    printf("Try both poles — notice the different LEDs!\n\n");

    while (true) {                  // Loop forever

        uint16_t raw = read_hall();                 // Read Hall sensor

        // Calculate deviation from baseline
        int deviation = (int)raw - (int)baseline;  // Positive or negative
        int strength = abs(deviation);              // Always positive

        update_compass_leds(deviation, strength);   // Update LEDs
        print_compass(deviation, strength);         // Print to serial

        sleep_ms(150);              // Update display
    }

    return 0;
}
```

## 🔍 How It Works

1. The Analog Hall Sensor outputs a voltage that changes with the magnetic field
2. No magnet = baseline voltage (~1.65V, reads as ~2048)
3. North pole nearby = voltage goes higher than baseline (positive deviation)
4. South pole nearby = voltage goes lower than baseline (negative deviation)
5. The LEDs show which pole is closest and how strong the field is!

## 🎮 Try It!

- Hold a bar magnet with the N end pointing at the sensor — which LED lights up?
- Flip the magnet so S points at the sensor — does a different LED light up?
- Move the magnet farther away slowly — at what distance does it stop detecting?
- Can you locate the Earth's magnetic field without a magnet? (Very faint!)

## 🏆 Challenge

Mount the sensor on a rotating platform (a lazy Susan, or just tape it to a turntable). As you spin it, the reading changes. Program the Pico to find and remember the direction where the Earth's magnetic field is strongest — that is roughly magnetic north! Print "NORTH FOUND!" when the sensor alignment is correct.

## 📝 What You Built

You built a simple magnetic compass using an Analog Hall Sensor — similar to the magnetometer chips inside every smartphone! You learned how magnetic poles create directional fields, how sensors measure them, and how explorers have used magnetism for navigation for over 1,000 years.
