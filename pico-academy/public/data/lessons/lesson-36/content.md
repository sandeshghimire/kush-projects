# Lesson 36: 3-Axis Acceleration Sensor Module — Feel the Tilt!

## 🎯 What You'll Learn

- What an accelerometer is and how it feels movement
- What "axes" (X, Y, Z) mean in electronics
- How to read three analog signals from a sensor using the Pico's ADC
- How to turn those numbers into tilt directions — like left, right, up, down!
- How to build a tilt-controlled LED indicator

---

## 🛒 Parts You Need

- Raspberry Pi Pico 2 W (~$6)
- 3-Axis Acceleration Sensor Module (ADXL335) from Elegoo kit
- 3× LEDs (different colours — red, green, yellow work great)
- 3× 220Ω resistors
- Breadboard and jumper wires
- USB cable

---

## 🌟 Background

Have you ever noticed that your phone screen flips sideways when you rotate it? Or that games let you steer a car by tilting your phone? That magic comes from an **accelerometer** — a tiny chip that can feel which direction is "down"!

An accelerometer works a bit like a marble inside a box. Imagine a tiny marble sitting in the middle of a small box with springs on all sides. When you tilt the box, gravity pulls the marble toward one side. The springs get squished more on that side and stretched on the other. By measuring how much each spring is squished, the chip knows which way you tilted it!

The sensor in your Elegoo kit is the **ADXL335**. It has **three output pins** — one for each **axis**:

- **X axis** — tilting left or right (rolling)
- **Y axis** — tilting forward or backward (pitching)
- **Z axis** — pointing up or down (flat vs. flipped)

Each pin gives out a **voltage** that changes depending on tilt. When perfectly flat, all three outputs are roughly in the middle of their range (about 1.65V). Tilt the sensor and the voltages shift! Your Pico reads those voltages using its **ADC** (Analog-to-Digital Converter) and turns them into numbers from 0 to 4095.

Accelerometers are EVERYWHERE:

- Your phone uses one to flip the screen
- Car airbags use one to detect a crash and inflate instantly
- Game controllers use one so you can steer by tilting
- Fitness trackers use one to count your steps
- Aeroplanes use them to stay level!

---

## 🔌 Wiring

| ADXL335 Module Pin    | Pico 2 W Pin | Notes                           |
| --------------------- | ------------ | ------------------------------- |
| VCC                   | 3V3 (pin 36) | 3.3V power — IMPORTANT, not 5V! |
| GND                   | GND          | Ground                          |
| X                     | GP26         | ADC channel 0 — X axis voltage  |
| Y                     | GP27         | ADC channel 1 — Y axis voltage  |
| Z                     | GP28         | ADC channel 2 — Z axis voltage  |
| Red LED (via 220Ω)    | GP15         | Lights up when tilted LEFT      |
| Green LED (via 220Ω)  | GP14         | Lights up when tilted FORWARD   |
| Yellow LED (via 220Ω) | GP13         | Lights up when tilted RIGHT     |

> **Important!** The ADXL335 runs on 3.3V — never connect it to 5V or you could damage it. Your Pico's 3V3 pin is perfect!

---

## 💻 The Code

```c
/**
 * Lesson 36: 3-Axis Acceleration Sensor (ADXL335)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The ADXL335 gives us three analog voltages for X, Y, and Z.
 * We read them with the ADC and figure out which way the sensor is tilting.
 *
 * ADC values when flat: all three are roughly 2048 (middle of 0-4095 range)
 * Tilt the sensor and the values shift up or down!
 */

#include "pico/stdlib.h"      // Always include this first!
#include "hardware/adc.h"     // We need the ADC to read analog signals
#include <stdio.h>            // For printf (printing to serial)

// ── Pin definitions ───────────────────────────────────────────────────────────
// ADC input pins (these are special pins that can read voltages)
#define X_ADC_PIN  26    // X axis — GP26 = ADC channel 0
#define Y_ADC_PIN  27    // Y axis — GP27 = ADC channel 1
#define Z_ADC_PIN  28    // Z axis — GP28 = ADC channel 2

// LED output pins (for visual tilt display)
#define LED_LEFT   15   // Lights up when tilting LEFT  (X is low)
#define LED_FWD    14   // Lights up when tilting FORWARD (Y is high)
#define LED_RIGHT  13   // Lights up when tilting RIGHT (X is high)

// ── How far to tilt before the LED turns on ──────────────────────────────────
// ADC center value is ~2048 when flat. We trigger if we move 400 units away.
// Make this bigger (e.g. 600) if LEDs turn on too easily.
// Make it smaller (e.g. 200) if you have to tilt a lot before anything happens.
#define TILT_THRESHOLD  400

// ── Helper: read one ADC channel ─────────────────────────────────────────────
uint16_t read_adc(uint channel) {
    adc_select_input(channel);   // Choose which pin to read (0, 1, or 2)
    return adc_read();           // Read the value (0 = 0V, 4095 = 3.3V)
}

int main() {
    // Start up the Pico
    stdio_init_all();

    // ── Set up the ADC ────────────────────────────────────────────────────────
    adc_init();                  // Turn on the ADC hardware
    adc_gpio_init(X_ADC_PIN);    // Tell GP26 to be an ADC input (not digital)
    adc_gpio_init(Y_ADC_PIN);    // Same for GP27
    adc_gpio_init(Z_ADC_PIN);    // Same for GP28

    // ── Set up the LED output pins ─────────────────────────────────────────────
    gpio_init(LED_LEFT);  gpio_set_dir(LED_LEFT,  GPIO_OUT);
    gpio_init(LED_FWD);   gpio_set_dir(LED_FWD,   GPIO_OUT);
    gpio_init(LED_RIGHT); gpio_set_dir(LED_RIGHT, GPIO_OUT);

    printf("=== Lesson 36: Accelerometer Tilt Detector ===\n");
    printf("Keep the sensor flat and watch the numbers!\n\n");
    printf("X\t\tY\t\tZ\t\tTilt\n");
    printf("------\t\t------\t\t------\t\t----------\n");

    while (true) {
        // ── Read all three axes ───────────────────────────────────────────────
        uint16_t x = read_adc(0);   // X axis reading
        uint16_t y = read_adc(1);   // Y axis reading
        uint16_t z = read_adc(2);   // Z axis reading

        // ── Calculate how far each axis is from the center (2048) ─────────────
        // If flat: x_offset ≈ 0, y_offset ≈ 0, z_offset ≈ 0
        // If tilted left: x_offset will be a large negative number
        int x_offset = (int)x - 2048;   // Negative = tilted left, Positive = tilted right
        int y_offset = (int)y - 2048;   // Negative = tilted back,  Positive = tilted forward

        // ── Figure out the tilt direction ────────────────────────────────────
        // Turn all LEDs off first, then light the right one
        gpio_put(LED_LEFT,  false);
        gpio_put(LED_FWD,   false);
        gpio_put(LED_RIGHT, false);

        const char *tilt = "FLAT";     // Default label

        if (x_offset < -TILT_THRESHOLD) {
            gpio_put(LED_LEFT, true);  // Light the LEFT LED
            tilt = "LEFT";
        } else if (x_offset > TILT_THRESHOLD) {
            gpio_put(LED_RIGHT, true); // Light the RIGHT LED
            tilt = "RIGHT";
        } else if (y_offset > TILT_THRESHOLD) {
            gpio_put(LED_FWD, true);   // Light the FORWARD LED
            tilt = "FORWARD";
        } else if (y_offset < -TILT_THRESHOLD) {
            tilt = "BACKWARD";         // No LED for backward — your challenge!
        }

        // ── Print values to serial so you can see what's happening ────────────
        printf("%d\t\t%d\t\t%d\t\t%s\n", x, y, z, tilt);

        sleep_ms(100);   // Read 10 times per second — fast enough to feel responsive
    }

    return 0;
}
```

---

## 🔍 How the Code Works (Step by Step)

1. **`adc_init()`** turns on the Pico's built-in ADC hardware — you only call this once at the start.

2. **`adc_gpio_init(pin)`** tells each pin to act as an analog input instead of a digital pin. Without this, the ADC might read garbage values!

3. **`adc_select_input(channel)`** chooses WHICH pin to read. Channel 0 = GP26, Channel 1 = GP27, Channel 2 = GP28.

4. **`adc_read()`** actually measures the voltage and converts it to a number between 0 and 4095. Think of it like a ruler — 0 means 0 volts, 4095 means 3.3 volts, 2048 means right in the middle.

5. **`x_offset = x - 2048`** finds how far from the centre the reading is. If the sensor is perfectly flat, all offsets will be close to zero. Tilt it and the offset grows!

6. **The threshold check** only lights the LED if the tilt is bigger than 400 units. This stops the LEDs from flickering when the sensor is nearly flat but wobbling slightly.

---

## 🧪 Try It!

1. **Watch the numbers:** Open your serial monitor at 115200 baud and watch the X, Y, Z values as you tilt the sensor in different directions. What do you notice?

2. **Calibrate it:** Everyone's sensor is slightly different. When yours is flat, what numbers do you see? If X shows 2100 instead of 2048, your sensor's "flat" is 2100. You can update the code to use your actual flat value!

3. **Add a 4th direction:** Currently there is no LED for "BACKWARD". Can you add a 4th LED and wire it up? Then add code to light it when `y_offset < -TILT_THRESHOLD`!

4. **Make a bubble level:** A real bubble level lights up a centre LED when flat and an outer LED when tilted. Can you use the onboard LED for "FLAT" and the three coloured LEDs for different tilts?

5. **Speed tilt:** How fast can you tilt the sensor and still see the LED change? Try making the `sleep_ms(100)` smaller (like 10) for super fast readings!

---

## 🌍 Where This is Used in Real Life

- **Phones and tablets** — the screen rotates because an accelerometer detects which edge is pointing down
- **Car airbags** — they fire in milliseconds when an accelerometer detects a crash
- **Drones** — use accelerometers to stay level automatically
- **Wii Remote** — you steer and swing by tilting the controller!
- **Fitness bands** — count your steps by detecting the up/down pattern of walking

---

## 📝 What You Learned

- An accelerometer measures tilt using tiny springs inside a chip
- The ADXL335 has three output pins: X, Y, and Z — one for each direction
- The Pico reads these as voltages using its ADC (Analog-to-Digital Converter)
- When flat, all three readings are around 2048; tilt it and the numbers change
- Subtracting 2048 gives us how far we tilted from "flat"
- This is the same technology inside your phone, game controllers, and drones!
