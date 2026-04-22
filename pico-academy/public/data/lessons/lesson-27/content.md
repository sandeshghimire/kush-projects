# Lesson 27: Switch Light Module — Your Pico Can See Light!

## 🎯 What You'll Learn
- How a phototransistor detects light differently from a regular sensor
- How to read an analog voltage that changes with light levels
- How to convert ADC numbers into meaningful light readings
- How to make things happen automatically when lights turn on or off
- How to build an automatic night light!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Switch Light Module (phototransistor) from Elegoo kit
- LED (any color) for the night light effect
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Your eyes are amazing — they automatically adjust when you walk from a bright room into a dark one. The pupil in your eye gets bigger to let in more light. A **phototransistor** does something similar but with electricity! When light hits a phototransistor, more electricity flows through it. In bright light, lots of electricity flows. In darkness, almost none flows. This changing flow of electricity creates a changing voltage that the Pico can measure!

The Switch Light Module uses a phototransistor that outputs an **analog voltage**. "Analog" means it gives you lots of values, not just HIGH or LOW. In a completely dark room, the voltage output might be close to 0V. In bright sunlight, it might be close to 3.3V. In normal room lighting, it will be somewhere in between. The Pico's **ADC** (Analog to Digital Converter) reads this voltage as a number from 0 to 4095 — just like a ruler measuring how bright the light is!

This kind of sensor is everywhere in the real world! Street lights use them to turn on automatically when it gets dark and off when dawn arrives. Phones use them to adjust screen brightness so you do not go blind when you look at your phone in the dark. Laptops adjust keyboard backlight using similar sensors. Solar garden lights use this exact circuit! Now you can use one too — and even make your own automatic night light with it!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | AO (analog output) | More light = higher voltage = higher ADC value |
| 3V3 | VCC | Power — 3.3V |
| GND | GND | Ground |
| GP15 | — | Output LED anode (through 330Ω resistor to GND) |

> **Tip:** GP26 is a special pin — it is one of only a few that can read analog voltages on the Pico!

---

## 💻 The Code

```c
/**
 * Lesson 27: Switch Light Module (Phototransistor Light Sensor)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * AO pin gives analog voltage proportional to light level.
 * More light = higher voltage = higher ADC reading.
 * ADC range: 0 (dark) to 4095 (very bright).
 *
 * We use this to make an automatic night light!
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK library
#include "hardware/adc.h"   // ADC library for reading analog values

// Pin definitions
#define LIGHT_SENSOR_PIN  26   // GP26 = ADC0 — reads light level
#define NIGHT_LIGHT_PIN   15   // GP15 — our automatic night light LED

// ADC threshold: below this value = DARK, above = BRIGHT
// Adjust this number to set your sensitivity!
// 0 = completely dark, 4095 = maximum brightness
#define DARK_THRESHOLD   1500   // Night light turns on below this level

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 27: Switch Light Module ===\n");
    printf("The automatic night light is ready!\n");
    printf("Cover the sensor with your hand to trigger it.\n\n");

    // Set up the ADC (Analog to Digital Converter)
    adc_init();                         // Initialise the ADC hardware
    adc_gpio_init(LIGHT_SENSOR_PIN);    // Tell the ADC to use GP26

    // Set up the night light LED as output
    gpio_init(NIGHT_LIGHT_PIN);
    gpio_set_dir(NIGHT_LIGHT_PIN, GPIO_OUT);
    gpio_put(NIGHT_LIGHT_PIN, 0);       // Night light starts off

    uint16_t previous_level = 0;   // Remember last reading to detect changes
    bool     light_was_on   = true; // Track if we last saw light ON or OFF

    printf("Reading light levels every second...\n");
    printf("(ADC value: 0 = total dark, 4095 = super bright)\n\n");

    while (true) {

        // Select ADC channel 0 (connected to GP26)
        adc_select_input(0);

        // Read the ADC — returns a number from 0 to 4095
        uint16_t light_level = adc_read();

        // Convert the ADC reading to a percentage (0% to 100%)
        // Multiply by 100 first to avoid losing the decimal in integer division
        int brightness_percent = (light_level * 100) / 4095;

        // Print the current light level reading
        printf("Light level: %4d / 4095  (%3d%%)  ",
               light_level, brightness_percent);

        // Show a visual bar graph using text characters!
        // Every 400 ADC units = one block character
        int bars = light_level / 400;    // How many bars to show
        printf("[");
        for (int i = 0; i < 10; i++) {      // Always 10 spaces wide
            if (i < bars) {
                printf("#");   // Filled bar
            } else {
                printf(" ");   // Empty bar
            }
        }
        printf("] ");

        // Decide if it is dark or bright
        if (light_level < DARK_THRESHOLD) {
            printf("DARK\n");

            // It is dark! Turn on the night light
            gpio_put(NIGHT_LIGHT_PIN, 1);   // LED ON

            // Only print the "light turned on" message once
            if (light_was_on) {
                printf("  >> Night light ON! (it got dark)\n");
                light_was_on = false;   // Remember it was dark
            }

        } else {
            printf("BRIGHT\n");

            // It is bright! Turn off the night light
            gpio_put(NIGHT_LIGHT_PIN, 0);   // LED OFF

            // Only print the "light turned off" message once
            if (!light_was_on) {
                printf("  >> Night light OFF (it got bright again)\n");
                light_was_on = true;    // Remember it was bright
            }
        }

        // Save current reading for next comparison
        previous_level = light_level;

        // Wait 1 second before next reading
        sleep_ms(1000);
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **ADC setup:** `adc_init()` starts the ADC hardware. `adc_gpio_init(26)` tells the Pico to use GP26 as an analog input. `adc_select_input(0)` says "use ADC channel 0" (which is GP26). Then `adc_read()` gives us a number from 0 to 4095.

2. **Percentage conversion:** We convert the raw ADC reading (0-4095) to a percentage (0-100%) with `(light_level * 100) / 4095`. We multiply by 100 FIRST to keep it accurate in integer math.

3. **Visual bar graph:** The `for` loop prints `#` characters for filled portions and spaces for empty portions. This creates a text bar graph — like a battery indicator! It is much easier to read than raw numbers.

4. **Automatic night light:** If `light_level` is below `DARK_THRESHOLD` (1500), we turn on the LED. Above that, we turn it off. You can change `DARK_THRESHOLD` to make it more or less sensitive.

5. **State change messages:** We only print "Night light ON" when it TRANSITIONS from bright to dark (not every loop). The `light_was_on` variable keeps track of this.

---

## 🎮 Try It!

1. **Cover test:** Slowly cover the sensor with your hand. Watch the bar graph shrink and the night light LED turn on!

2. **Torch test:** Shine a phone flashlight at the sensor. The bar should fill up to 100% and the percentage number should go very high!

3. **Threshold adjustment:** Change `DARK_THRESHOLD` from 1500 to 2000. Does the night light turn on earlier now?

4. **Room survey:** Walk around your house. Print the light levels in different rooms. Which room is brightest? Which is darkest?

---

## 🏆 Challenge

Build a **smart dimmer!** Instead of just ON/OFF, use PWM to smoothly dim the night light LED based on how dark it is. When the sensor reads 0 (pitch black), the LED should be at maximum brightness. When the sensor reads close to the threshold, the LED should be at half brightness. Use the `pwm` functions from Lesson 2 and calculate the duty cycle as `4095 - light_level`. Can you make the LED glow brighter as the room gets darker?

---

## 📝 Summary

The Switch Light Module uses a phototransistor to convert light into an analog voltage that the Pico can measure. More light means higher voltage, which means a higher ADC reading (up to 4095). By comparing the reading against a threshold, you can automatically turn a night light on in the dark and off in the daylight — exactly like the street lights and solar garden lights you see every day!
