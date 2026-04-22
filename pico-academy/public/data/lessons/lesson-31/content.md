# Lesson 31: Linear Hall Sensor Module — Feeling Invisible Force Fields!

## 🎯 What You'll Learn
- How a linear Hall sensor measures the STRENGTH of a magnetic field
- Why the output voltage is highest with no magnet (at middle voltage)
- How to read analog values and map them to meaningful measurements
- How to detect magnetic polarity (which pole is facing the sensor)
- How to build a magnetic field strength meter!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Linear Hall Sensor Module from Elegoo kit (has "A" or "AO" pin for analog)
- RGB LED Module (to show field strength as colors)
- A small magnet (a fridge magnet or toy magnet works great)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

In Lesson 16 you learned about Hall sensors. Now we go deeper! The **linear Hall sensor** is a superhero sensor because it tells you not just "magnet nearby — yes or no?" but also HOW STRONG the field is and even WHICH WAY the magnet is pointing! It measures the magnetic field and outputs a voltage that smoothly changes depending on the field strength and direction.

Here is the clever part: with NO magnet nearby, the sensor outputs exactly HALF of the supply voltage (about 1.65V, which is an ADC reading of around 2048 out of 4095). This middle point is called the "resting" or "null" point. Bring a north pole magnet close and the voltage goes UP from the middle. Bring a south pole close and the voltage goes DOWN. The further from 2048 you are, the stronger the field — and which direction (up or down from 2048) tells you the polarity!

Think of it like a seesaw that is perfectly balanced in the middle. A north pole magnet pushes down one side, a south pole pushes down the other side. How far the seesaw tips tells you how strong the magnet is. This makes the linear Hall sensor useful for all sorts of things: measuring the current in a wire (current creates magnetic fields!), detecting the position of a rotating magnet, building a compass, or even making an electronic guitar pick-up. Pretty cool for a tiny chip!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | A or AO (analog output) | Analog voltage proportional to field strength |
| 3V3 | VCC | Power — must be 3.3V |
| GND | GND | Ground |

**RGB LED Module:**

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Common ground |

---

## 💻 The Code

```c
/**
 * Lesson 31: Linear Hall Sensor Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * ADC Midpoint (~2048) = no magnet
 * Above midpoint = one pole (north)
 * Below midpoint = other pole (south)
 * Further from midpoint = stronger field
 *
 * RGB LED shows:
 *   Green  = no significant field (near midpoint)
 *   Blue   = north pole detected
 *   Red    = south pole detected
 *   Bright = strong field
 */

#include <stdio.h>          // For printf()
#include <stdlib.h>         // For abs()
#include "pico/stdlib.h"    // Main Pico SDK
#include "hardware/adc.h"   // ADC library

// Pin definitions
#define HALL_PIN    26   // GP26 = ADC0 — linear Hall sensor analog output
#define LED_R_PIN    9   // GP9  — RGB red
#define LED_G_PIN   10   // GP10 — RGB green
#define LED_B_PIN   11   // GP11 — RGB blue

// The ADC value when no magnet is present (half of 4095 ≈ 2048)
// You might need to calibrate this for your specific sensor!
#define ADC_MIDPOINT  2048

// How far from midpoint counts as "magnet detected"
// Below this = background noise, not a real magnet
#define DETECTION_THRESHOLD  100

// Helper to set RGB LED
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 31: Linear Hall Sensor Module ===\n");
    printf("Bring a magnet close from different directions!\n\n");

    // Set up ADC for Hall sensor
    adc_init();
    adc_gpio_init(HALL_PIN);   // GP26 as analog input

    // Set up RGB LED pins
    gpio_init(LED_R_PIN); gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN); gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN); gpio_set_dir(LED_B_PIN, GPIO_OUT);

    // Start with green (no field)
    set_rgb(false, true, false);

    // Calibration: take 100 readings at rest to find true midpoint
    printf("Calibrating... hold the sensor still, no magnet!\n");
    uint32_t calib_sum = 0;
    for (int i = 0; i < 100; i++) {
        adc_select_input(0);
        calib_sum += adc_read();
        sleep_ms(10);
    }
    uint16_t zero_point = calib_sum / 100;   // Average rest value
    printf("Calibration done! Zero point: %d (expected ~%d)\n\n",
           zero_point, ADC_MIDPOINT);

    printf("ADC Value | Deviation | Field Strength | Direction | LED\n");
    printf("----------|-----------|----------------|-----------|-----\n");

    while (true) {

        // Read the Hall sensor
        adc_select_input(0);            // ADC channel 0 = GP26
        uint16_t reading = adc_read(); // Raw ADC value (0-4095)

        // Calculate deviation from zero point
        // Positive = above midpoint, negative = below midpoint
        int deviation = (int)reading - (int)zero_point;

        // Calculate field strength (absolute deviation, 0 = no field)
        int strength = abs(deviation);  // abs() makes negative values positive

        // Print a bar showing field strength
        int bars = strength / 50;
        if (bars > 20) bars = 20;

        printf("%9d | %9d | [", reading, deviation);
        for (int i = 0; i < 20; i++) {
            printf(i < bars ? "#" : " ");
        }
        printf("]%4d | ", strength);

        // Decide what to display based on deviation
        if (strength < DETECTION_THRESHOLD) {
            // No significant field — green LED
            printf("No field    | Green\n");
            set_rgb(false, true, false);

        } else if (deviation > 0) {
            // Positive deviation = one magnetic pole (let's call it North)
            printf("NORTH pole  | Blue\n");
            set_rgb(false, false, true);   // Blue for North

        } else {
            // Negative deviation = other magnetic pole (South)
            printf("SOUTH pole  | Red\n");
            set_rgb(true, false, false);   // Red for South
        }

        sleep_ms(200);   // Update 5 times per second
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Calibration:** We take 100 readings with no magnet to find the true zero point for our specific sensor. Every sensor is slightly different, so this makes our readings more accurate!

2. **Deviation:** `deviation = reading - zero_point` tells us how far the reading has shifted from zero. Positive means the field pushed the value up; negative means it pushed the value down.

3. **Strength:** `abs(deviation)` gives us the absolute value (always positive) — this is the field strength regardless of direction.

4. **Polarity detection:** The sign (+ or -) of the deviation tells us the polarity! Positive = one pole (we call it North and show blue), Negative = other pole (South, show red).

5. **Detection threshold:** We ignore small deviations (under 100) as background noise. Only deviations larger than 100 ADC units count as a real magnetic field.

---

## 🎮 Try It!

1. **Slow approach:** Bring a magnet very slowly toward the sensor. Watch the deviation grow. How close do you need to be before it crosses the threshold?

2. **Flip the magnet:** Bring the magnet close with one face toward the sensor. Note the color. Now flip the magnet over and bring the OTHER face close. The color should change!

3. **Two magnets:** What happens when you bring two different magnets near? Do they read the same?

4. **Mapping range:** How high can you get the strength number? Try the strongest magnet you can find!

---

## 🏆 Challenge

Build a **magnetic field map**! Move the magnet to 5 different positions around the sensor (above, below, left, right, and directly on top). Record the deviation for each position. Can you figure out which positions give the strongest reading? Draw a diagram showing the field strength at each spot. This is how scientists map magnetic fields in laboratories!

---

## 📝 Summary

The linear Hall sensor outputs a voltage that sits at the midpoint when no magnet is near. Bringing a magnet close pushes the output up or down depending on which pole is facing the sensor, and by how much depends on the strength. By measuring how far the reading deviates from the midpoint, you can determine both the strength and polarity of any nearby magnetic field. This sensor is used in current meters, position sensors, and electronic compasses!
