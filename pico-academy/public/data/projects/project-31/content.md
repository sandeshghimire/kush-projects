# Project 31: Magnet Strength Meter — Measure the Invisible Force!

## 🎯 What You'll Learn
- How a Linear Hall Sensor measures magnetic field strength
- How to read analog values and map them to LED levels
- How magnets create invisible fields you can actually measure
- How compasses and metal detectors use magnetic sensors

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Linear Hall Sensor Module | $2.00 |
| LEDs x4 (green, green, yellow, red) | $0.40 |
| 220Ω Resistors x4 | $0.40 |
| Various magnets (fridge magnets work great!) | $1.00 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.80** |

## 🌟 The Story

Magnets are super mysterious! You cannot see their force, you cannot smell it, but you can definitely feel it when two magnets snap together — or push each other away. Scientists measure magnetic fields in units called "Gauss" or "Tesla." Did you know the Earth itself is a giant magnet?

A Linear Hall Sensor is like a magnetic field detector for your Pico. The stronger the field, the more the sensor's voltage changes. You can measure exactly how strong a magnet is by seeing how much the voltage shifts! Bring a magnet close and watch the LEDs light up one by one — like a "magnet-o-meter"! The closer and stronger the magnet, the more LEDs glow.

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Linear Hall Sensor VCC | Pico 3.3V | Power |
| Linear Hall Sensor GND | Pico GND | Ground |
| Linear Hall Sensor AO | Pico GP26 (ADC0) | Analog output |
| Green LED 1 long leg | Pico GP2 via 220Ω | Level 1 — weak field |
| Green LED 2 long leg | Pico GP3 via 220Ω | Level 2 — medium field |
| Yellow LED long leg | Pico GP4 via 220Ω | Level 3 — strong field |
| Red LED long leg | Pico GP5 via 220Ω | Level 4 — very strong! |
| All LED short legs | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // For reading the Hall sensor
#include <stdio.h>          // For printf
#include <stdlib.h>         // For abs() function

// Pin definitions
#define HALL_PIN    26      // Linear Hall sensor analog output
#define ADC_INPUT    0      // ADC channel for GP26

// LED strength indicator pins
#define LED1_PIN    2       // Level 1 — weakest
#define LED2_PIN    3       // Level 2
#define LED3_PIN    4       // Level 3
#define LED4_PIN    5       // Level 4 — strongest

// The sensor outputs ~2048 (halfway) with no magnet
// A north pole pushes it higher, south pole pushes it lower
// We measure distance from 2048 to get field strength
#define BASELINE    2048    // No-magnet baseline value
#define LEVEL1_THRESH  100  // Weak field threshold
#define LEVEL2_THRESH  300  // Medium field
#define LEVEL3_THRESH  600  // Strong field
#define LEVEL4_THRESH  900  // Very strong field

// Samples for smoothing
#define SAMPLES  20

// Read and average multiple ADC readings
uint16_t read_hall_sensor() {
    uint32_t total = 0;
    for (int i = 0; i < SAMPLES; i++) {
        total += adc_read();
        sleep_us(200);
    }
    return (uint16_t)(total / SAMPLES);
}

// Update LED bar based on field strength
void update_strength_leds(int strength) {
    gpio_put(LED1_PIN, strength >= LEVEL1_THRESH ? 1 : 0);  // Level 1
    gpio_put(LED2_PIN, strength >= LEVEL2_THRESH ? 1 : 0);  // Level 2
    gpio_put(LED3_PIN, strength >= LEVEL3_THRESH ? 1 : 0);  // Level 3
    gpio_put(LED4_PIN, strength >= LEVEL4_THRESH ? 1 : 0);  // Level 4
}

// Print a text bar to serial monitor
void print_strength_bar(int strength, int raw) {
    printf("Raw: %4d | Strength: %4d |", raw, strength);

    // Calculate number of bars (0-4)
    int bars = 0;
    if (strength >= LEVEL1_THRESH) bars = 1;
    if (strength >= LEVEL2_THRESH) bars = 2;
    if (strength >= LEVEL3_THRESH) bars = 3;
    if (strength >= LEVEL4_THRESH) bars = 4;

    // Draw the bar
    for (int i = 0; i < bars; i++) printf("***");
    for (int i = bars; i < 4; i++) printf("   ");

    // Label
    if (bars == 0) printf(" No magnet");
    else if (bars == 1) printf(" Weak");
    else if (bars == 2) printf(" Medium");
    else if (bars == 3) printf(" Strong!");
    else printf(" VERY STRONG!");

    printf("\n");
}

// Calibrate the baseline (no magnet present)
uint16_t calibrate() {
    printf("Calibrating... keep magnets away!\n");
    uint32_t total = 0;
    for (int i = 0; i < 50; i++) {          // 50 samples for calibration
        total += adc_read();
        sleep_ms(20);
    }
    uint16_t baseline = (uint16_t)(total / 50);
    printf("Baseline: %d\n\n", baseline);
    return baseline;
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up ADC
    adc_init();
    adc_gpio_init(HALL_PIN);
    adc_select_input(ADC_INPUT);

    // Set up LED pins
    int led_pins[] = {LED1_PIN, LED2_PIN, LED3_PIN, LED4_PIN};
    for (int i = 0; i < 4; i++) {
        gpio_init(led_pins[i]);
        gpio_set_dir(led_pins[i], GPIO_OUT);
        gpio_put(led_pins[i], 0);
    }

    printf("=== MAGNET STRENGTH METER ===\n");
    printf("The more LEDs light up, the stronger the magnet!\n\n");

    // Calibrate with no magnet
    uint16_t baseline = calibrate();

    // Startup test — light all LEDs
    for (int i = 0; i < 4; i++) { gpio_put(led_pins[i], 1); sleep_ms(100); }
    sleep_ms(300);
    for (int i = 3; i >= 0; i--) { gpio_put(led_pins[i], 0); sleep_ms(100); }

    printf("Bring a magnet close!\n");
    printf("Try different magnets to compare their strength.\n\n");

    int max_strength = 0;           // Track maximum strength seen

    while (true) {                  // Loop forever

        uint16_t raw = read_hall_sensor();      // Read Hall sensor

        // Calculate field strength = how far from baseline
        // Works for both north pole (above baseline) and south pole (below)
        int deviation = (int)raw - (int)baseline;   // Difference from baseline
        int strength = abs(deviation);              // Absolute value (always positive)

        // Update displays
        update_strength_leds(strength);             // Update LEDs
        print_strength_bar(strength, raw);          // Print bar

        // Track maximum
        if (strength > max_strength) {
            max_strength = strength;
            printf(">>> New maximum strength: %d <<<\n", max_strength);
        }

        sleep_ms(100);              // Update 10 times per second
    }

    return 0;
}
```

## 🔍 How It Works

1. The Linear Hall Sensor outputs a voltage proportional to magnetic field strength
2. With no magnet, it outputs about 1.65V (halfway between 0V and 3.3V)
3. A north pole pushes the voltage higher; a south pole pushes it lower
4. The Pico reads the voltage and measures how far it is from the baseline
5. More deviation = stronger field = more LEDs light up!

## 🎮 Try It!

- Try a fridge magnet — how many LEDs does it trigger?
- Try a stronger magnet from an old hard drive or speaker — wow, right?
- Try both poles of the same magnet — does the reading differ?
- Hold the magnet at different distances — watch the LEDs turn off one by one

## 🏆 Challenge

Add a buzzer that beeps faster as the magnet gets closer, like a metal detector! Use the strength value to calculate the delay between beeps. Strong field = fast beeping. Weak field = slow beeping. Now you have a real-sounding metal detector!

## 📝 What You Built

You built a magnetic field strength meter using a Linear Hall Sensor — the same technology used inside smartphones for compass apps and in car sensors that detect wheel rotation! You learned how magnetic fields interact with electronics and how to measure invisible forces.
