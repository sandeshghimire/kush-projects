# Lesson 16: Hall Effect Sensor — Detecting Magnets!

## What you'll learn
- How Hall effect sensors detect invisible magnetic fields
- The difference between an analog sensor (how strong?) and a digital sensor (yes or no?)
- How to read both Hall sensors from the Elegoo kit at the same time
- How to map a sensor reading to colors on your RGB LED
- How to count events — just like a real bike speedometer!

---

## Parts you'll need
- Raspberry Pi Pico 2 W
- Linear Hall Sensor Module (labeled "Linear Hall" — has analog output pin "A" or "AO")
- Analog/Digital Hall Sensor Module (has digital output pin "D" or "DO")
- RGB LED Module
- Passive Buzzer Module
- A small magnet (a fridge magnet works great!)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## Background

Have you ever played with two magnets and felt that invisible pushing or pulling force between them? That invisible force is called a **magnetic field** — a bubble of energy that surrounds every magnet. You cannot see it, but special sensors can! A **Hall effect sensor** works because a magnetic field can actually push tiny particles called electrons sideways as they move through a wire. When electrons get pushed sideways, they create a small voltage that the sensor can measure. It sounds like magic, but it is just physics doing its job!

Your Elegoo kit has two different Hall sensors, and they work in different ways. The **linear Hall sensor** gives you an **analog reading** — a number that changes smoothly depending on how strong the magnetic field is. Bring a magnet close and the number shoots up; move it away and the number drops back down. Think of it like a thermometer for magnetism: a small number means a weak field, a big number means a strong one. The **digital Hall sensor** is much simpler — it only says "YES, there is a magnet!" or "NO, there is not." No in-between values. That is like comparing a dimmer switch (linear) to a regular light switch (digital).

Hall effect sensors are hiding everywhere in the real world! Bike speedometers use one glued next to the wheel with a tiny magnet on a spoke — each time the magnet zips past, the sensor counts one rotation and the computer figures out your speed. Car engines, elevator doors, and even the lid of your laptop (to detect when it snaps shut) all use Hall sensors. The Elegoo kit puts two of them in your hands — let's use them!

---

## Wiring

Connect everything carefully before plugging in your Pico. Double-check each wire!

### Linear Hall Sensor Module (A / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | A (analog out) | This is the analog signal pin |
| 3V3 | VCC | 3.3 V power |
| GND | GND | Ground |

### Digital Hall Sensor Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S or DO (digital out) | Digital signal pin |
| 3V3 | VCC | 3.3 V power |
| GND | GND | Ground |

### RGB LED Module (R / G / B / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Ground (common cathode) |

### Passive Buzzer Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP18 | S (signal) | PWM tone signal |
| 3V3 | VCC | Power |
| GND | GND | Ground |

> **Tip:** If your RGB LED has a common-anode pin (a + instead of -), connect that pin to 3V3 and swap your logic: HIGH = off, LOW = on. Test with a single colour first to confirm!

---

## The code

```c
/**
 * Lesson 16: Hall Effect Sensor — Detecting Magnets!
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Linear Hall Sensor  -> GP26 (ADC0)
 * Digital Hall Sensor -> GP15
 * RGB LED             -> GP9 (R), GP10 (G), GP11 (B)
 * Passive Buzzer      -> GP18
 *
 * What it does:
 *   - Reads analog hall sensor and shows field strength as LED colour
 *   - Reads digital hall sensor and beeps when a magnet is detected
 *   - Counts how many times a magnet has passed (like a speedometer!)
 *   - Prints all values to the serial monitor
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────
#define ANALOG_HALL_PIN   26   // ADC0 — linear hall sensor analogue output
#define DIGITAL_HALL_PIN  15   // Digital hall sensor output
#define LED_R_PIN          9   // RGB LED red channel
#define LED_G_PIN         10   // RGB LED green channel
#define LED_B_PIN         11   // RGB LED blue channel
#define BUZZER_PIN        18   // Passive buzzer signal

// ── ADC thresholds ───────────────────────────────────────────────
// The ADC gives 0–4095. With no magnet the linear hall sensor sits near
// 2048 (the middle). A magnet pushes the reading higher or lower.
// We measure how far from 2048 the reading is to get "field strength".
#define CENTER_VALUE     2048
#define THRESHOLD_WEAK    200  // Differences bigger than this = weak field
#define THRESHOLD_STRONG  600  // Differences bigger than this = strong field

// ── Buzzer helper ────────────────────────────────────────────────
void buzzer_beep(uint freq_hz, uint duration_ms) {
    // Use PWM to make a musical tone on the buzzer
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint chan  = pwm_gpio_to_channel(BUZZER_PIN);

    // Pico runs at 125 MHz. Divider of 64 keeps the wrap value manageable.
    uint32_t wrap = 125000000 / (64 * freq_hz) - 1;
    pwm_set_clkdiv(slice, 64.0f);
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, chan, wrap / 2); // 50% duty = nice square wave tone
    pwm_set_enabled(slice, true);

    sleep_ms(duration_ms);

    // Turn buzzer off cleanly
    pwm_set_enabled(slice, false);
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_SIO);
    gpio_put(BUZZER_PIN, 0);
}

// ── RGB LED helpers ──────────────────────────────────────────────
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// Traffic-light colours based on magnetic field strength
//   No magnet   -> GREEN  (all clear!)
//   Weak field  -> YELLOW (something is nearby...)
//   Strong field-> RED    (strong magnet detected!)
void show_field_colour(int strength) {
    if (strength < THRESHOLD_WEAK) {
        set_rgb(false, true, false);  // Green — no magnet
    } else if (strength < THRESHOLD_STRONG) {
        set_rgb(true, true, false);   // Yellow — weak magnet nearby
    } else {
        set_rgb(true, false, false);  // Red — strong magnet!
    }
}

// ── Main ─────────────────────────────────────────────────────────
int main() {
    stdio_init_all();   // Start serial output
    sleep_ms(2000);     // Wait for serial monitor to connect
    printf("=== Lesson 16: Hall Effect Sensors ===\n");
    printf("Bring a magnet close to the sensors and watch what happens!\n\n");

    // Set up RGB LED pins as outputs
    gpio_init(LED_R_PIN); gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN); gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN); gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(false, true, false);  // Start green (no magnet)

    // Set up digital hall sensor — input with pull-up resistor
    // Most digital Hall modules output LOW when a magnet is detected
    gpio_init(DIGITAL_HALL_PIN);
    gpio_set_dir(DIGITAL_HALL_PIN, GPIO_IN);
    gpio_pull_up(DIGITAL_HALL_PIN);

    // Set up ADC for the analog hall sensor on GP26
    adc_init();
    adc_gpio_init(ANALOG_HALL_PIN);
    adc_select_input(0);  // Channel 0 = GP26

    // Speedometer variables — counting magnet passes!
    int  magnet_count       = 0;
    bool magnet_was_present = false;  // Was a magnet detected last loop?

    // ── Main loop ────────────────────────────────────────────────
    while (true) {

        // ── Step 1: Read the ANALOG hall sensor ──────────────────
        uint16_t raw = adc_read();  // 0 to 4095

        // How far is this reading from the resting centre value?
        int deviation = (int)raw - CENTER_VALUE;
        if (deviation < 0) deviation = -deviation;  // Absolute value

        // Update the LED colour to show field strength
        show_field_colour(deviation);

        // ── Step 2: Read the DIGITAL hall sensor ─────────────────
        // gpio_get returns 0 (LOW) when magnet is near for most modules
        // We invert with ! so that magnet_now = true means "yes, magnet here"
        bool magnet_now = !gpio_get(DIGITAL_HALL_PIN);

        // ── Step 3: Beep on new detection ────────────────────────
        if (magnet_now && !magnet_was_present) {
            // Rising edge — magnet just arrived!
            buzzer_beep(1200, 60);  // Quick high chirp
        }

        // ── Step 4: Count complete passes (speedometer logic!) ───
        // A pass is counted when the magnet LEAVES (was present, now gone)
        // This is the same trick bike speedometers use!
        if (!magnet_now && magnet_was_present) {
            magnet_count++;
            printf(">>> Magnet passed! Total count: %d\n", magnet_count);
        }

        // ── Step 5: Print everything to serial ───────────────────
        printf("Analog raw: %4u | Deviation: %4d | Digital: %-8s | Passes: %d\n",
               raw,
               deviation,
               magnet_now ? "MAGNET!" : "clear",
               magnet_count);

        // Remember this reading for next time
        magnet_was_present = magnet_now;

        sleep_ms(100);  // 10 checks per second is plenty
    }

    return 0;
}
```

---

### How the code works

1. **`adc_read()`** returns a number from 0 to 4095 from the linear Hall sensor. With no magnet nearby it sits close to 2048 — the midpoint. Bring a magnet close and it shifts up or down depending on which magnetic pole faces the sensor.

2. **Deviation from centre** is calculated by subtracting 2048 and taking the absolute value (removing any minus sign). This tells us the field strength regardless of direction — just like knowing how far you walked from your front door, not which direction you went.

3. **`show_field_colour()`** acts like a traffic light for magnetism: green = no magnet, yellow = getting closer, red = strong field! It picks the right colour based on how big the deviation is compared to our two thresholds.

4. **`!gpio_get(DIGITAL_HALL_PIN)`** reads the digital sensor. Most digital Hall modules output LOW (0) when a magnet is nearby, so we use `!` to flip it — making `true` mean "magnet detected." The `gpio_pull_up()` ensures the pin reads HIGH reliably when there is no magnet.

5. **Counting passes** uses two booleans: `magnet_now` (this loop) and `magnet_was_present` (last loop). When the state flips from TRUE back to FALSE the magnet just left — that is one full pass! This is exactly how a bike speedometer counts wheel rotations.

6. **`buzzer_beep()`** uses PWM hardware to play a quick tone. It sets the PWM frequency, enables the output for the duration, then cleanly shuts off. Short and sweet — just like a doorbell!

---

## Try it

1. **Distance test:** Hold the magnet above the linear sensor and move it slowly closer. Watch the LED go from green to yellow to red. How many centimetres away does yellow start? How close for red?

2. **Flip the magnet:** Turn the magnet over so the other pole faces the sensor. Does the raw ADC number go up when it was going down before? (The `deviation` value should still increase — only the direction of the field changes!)

3. **Speedometer practice:** Wave the magnet past the digital sensor ten times in a row. Does the serial monitor show exactly 10 passes? Try going faster — does the sensor keep up?

4. **Make a door sensor:** Tape the digital Hall module inside a small box and put the magnet on the lid. Open and close the lid — the counter should tick up every time. You just built a magnetic door counter!

---

## Challenge

**Build a Magnet Speed Sensor!**

Tape the digital Hall sensor next to the edge of a spinning toy wheel (or cut a disc from cardboard and spin it on a pencil). Stick a small magnet on the rim of the wheel. Now modify the code to:

- Count rotations for exactly 5 seconds (use a loop with `sleep_ms(100)` called 50 times)
- After 5 seconds, print: `RPM = (count / 5) * 60`
- Reset the count and repeat

Try spinning the wheel slowly, then as fast as you can by hand. What is the highest RPM you can achieve? Real electric motors can spin thousands of RPM — but your Hall sensor could measure those too!

**Bonus challenge:** If the RPM goes above 120, light the RGB LED red and play an alarm beep — a "speeding warning"!

---

## Summary

Hall effect sensors detect invisible magnetic fields by measuring the tiny sideways push that magnetism gives to electrons inside the sensor. The linear version gives you a smooth analog number showing field strength, while the digital version gives a simple yes/no answer — and together they cover almost every use case you will ever need. You also learned the "previous-state" trick for counting events, which is the exact same technique used in everything from bike speedometers to factory conveyor belts!
