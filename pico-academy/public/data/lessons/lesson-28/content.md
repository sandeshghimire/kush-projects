# Lesson 28: Large Microphone Sound Sensor — Your Pico Can Hear You!

## 🎯 What You'll Learn
- How a microphone converts sound into electricity
- What analog output means and how to read it
- How to detect loud sounds (like claps) and quiet sounds
- How to build a clap-activated switch
- How sound levels change in different environments

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Large Microphone Sound Sensor Module from Elegoo kit
- LED (any color) or use the onboard LED
- Active Buzzer Module (optional)
- Small Phillips screwdriver (for adjusting sensitivity dial)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Your ears are incredible instruments — they can detect everything from the softest whisper to a thunderclap! A microphone works on a similar principle. Inside the microphone capsule is a tiny flexible membrane (like a super thin piece of plastic wrap). When sound waves hit the membrane, it vibrates. This vibration creates a tiny changing electrical signal. Bigger/louder sound = bigger vibrations = bigger electrical signal!

The Large Microphone Sound Sensor Module has two outputs. The **DO** (digital output) is either HIGH or LOW — it only tells you "loud" or "quiet". But the **AO** (analog output) gives you the full range — a number from 0 to 4095 on the Pico's ADC. This is much more useful! You can see exactly how loud a sound is, not just whether it crossed a threshold. The module also has a sensitivity dial (potentiometer) that you can turn with a screwdriver to adjust how sensitive the microphone is.

Fun fact: the large microphone module has a bigger electret microphone capsule than the small version (which you will see in Lesson 29). Bigger microphone = better at picking up low frequencies (deep sounds like bass drums and rumbling). It is like having a bigger ear! Smaller microphones are better for high-pitched sounds like whistles. In this lesson we will use the analog output to build a **clap detector** — a classic electronics project where clapping your hands turns something on or off!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | AO (analog output) | Analog sound level — use this for best results |
| GP15 | DO (digital output) | HIGH = quiet, LOW = loud (threshold set by dial) |
| 3V3 | VCC | Power |
| GND | GND | Ground |
| GP16 | — | LED output (to show sound detection) |

---

## 💻 The Code

```c
/**
 * Lesson 28: Large Microphone Sound Sensor Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * AO pin gives analog sound level (0 = silent, 4095 = very loud).
 * DO pin gives digital HIGH/LOW based on dial threshold.
 *
 * We build a clap detector:
 * - Detect a sudden loud peak (clap)
 * - Toggle an LED on/off with each clap
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK
#include "hardware/adc.h"   // ADC library

// Pin definitions
#define MIC_AO_PIN  26   // GP26 = ADC0 — analog sound level
#define MIC_DO_PIN  15   // GP15 — digital output (HIGH/LOW)
#define LED_PIN     16   // GP16 — LED we toggle with claps

// Sound level threshold for clap detection
// Claps are very sudden loud spikes above the background noise
// Increase this number if random noise is triggering false claps
#define CLAP_THRESHOLD  2500   // ADC value that counts as a clap

// How long to wait after a clap before detecting another one
// This prevents one clap from counting as many claps
#define CLAP_COOLDOWN_MS  500   // 500ms = half a second

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 28: Large Microphone Sound Sensor ===\n");
    printf("Clap your hands to toggle the LED!\n");
    printf("(Try adjusting the dial on the module if it is too sensitive)\n\n");

    // Set up ADC for analog microphone input
    adc_init();
    adc_gpio_init(MIC_AO_PIN);   // Tell ADC to use GP26

    // Set up digital microphone output as input
    gpio_init(MIC_DO_PIN);
    gpio_set_dir(MIC_DO_PIN, GPIO_IN);   // Digital output is an input for us

    // Set up LED as output
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);   // Start with LED off

    bool     led_state       = false;   // Is LED currently on?
    bool     clap_detected   = false;   // Did we just detect a clap?
    uint32_t last_clap_ms    = 0;       // When was the last clap?
    int      clap_count      = 0;       // Total claps counted

    // Calculate an ambient noise baseline (average of 50 quick readings)
    printf("Calibrating... please be quiet for 2 seconds!\n");
    uint32_t baseline_sum = 0;
    for (int i = 0; i < 50; i++) {
        adc_select_input(0);        // Select ADC channel 0
        baseline_sum += adc_read(); // Add to sum
        sleep_ms(20);               // Short delay between readings
    }
    uint16_t baseline = baseline_sum / 50;   // Average = baseline noise
    printf("Baseline noise level: %d\n\n", baseline);
    printf("Ready! Clap near the microphone!\n\n");

    while (true) {

        // Read current sound level from analog output
        adc_select_input(0);           // Select ADC channel 0 (GP26)
        uint16_t sound_level = adc_read();   // Read analog value (0-4095)

        // Get current time
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Print sound level every 200ms as a meter
        // (we use a simple text bar)
        int bars = sound_level / 200;   // Scale for display
        if (bars > 20) bars = 20;       // Cap at 20 bars
        printf("Sound: [");
        for (int i = 0; i < 20; i++) {
            printf(i < bars ? "#" : " ");   // Print # or space
        }
        printf("] %4d", sound_level);

        // Check for a clap: sudden spike well above baseline
        // and cooldown period has passed since last clap
        bool spike    = (sound_level > CLAP_THRESHOLD);
        bool cooled   = (now_ms - last_clap_ms > CLAP_COOLDOWN_MS);

        if (spike && cooled) {
            // CLAP DETECTED!
            clap_count++;
            last_clap_ms = now_ms;       // Record this clap time

            // Toggle the LED state
            led_state = !led_state;      // Flip: true becomes false, false becomes true
            gpio_put(LED_PIN, led_state ? 1 : 0);   // Apply new LED state

            printf("  *** CLAP #%d! LED %s ***",
                   clap_count,
                   led_state ? "ON" : "OFF");
        }

        printf("\n");   // New line after each reading

        sleep_ms(50);   // Read 20 times per second
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Analog reading:** `adc_select_input(0)` followed by `adc_read()` reads the current sound level as a number from 0 to 4095. The microphone creates a tiny voltage that changes with sound, and the ADC converts that to a number.

2. **Baseline calibration:** We take 50 readings over 2 seconds to calculate the average background noise level. This helps distinguish real claps from random noise. The better your baseline, the more reliable the clap detection!

3. **Clap detection:** A clap is detected when the sound level spikes above `CLAP_THRESHOLD` AND the cooldown period has passed. The cooldown prevents one clap from being counted multiple times.

4. **LED toggle:** `led_state = !led_state` flips the boolean. If it was `true` (on), it becomes `false` (off). If it was `false` (off), it becomes `true` (on). This is the classic "toggle" operation!

5. **Text bar meter:** The `for` loop that prints `#` and spaces creates a simple ASCII bar graph. This is a great trick for visualizing analog values in a serial monitor!

---

## 🎮 Try It!

1. **Clap test:** Clap once loudly. Does the LED toggle? Clap again — does it toggle back?

2. **Sensitivity dial:** Use a screwdriver to adjust the potentiometer on the module. The DO pin threshold changes. Can you make it react to just a whisper?

3. **Volume meter:** Just watch the bar graph. Talk loudly, talk softly, play music. How does the level change?

4. **Distance test:** How far away can you clap and still have it detected? Try from across the room!

---

## 🏆 Challenge

Build a **double-clap light switch**! A single clap does nothing. But two claps within 1 second toggles the LED. Use a timer to detect if two claps happen close together. Keep a `clap_buffer` that stores the time of recent claps, and check if two are within 1000ms of each other. This is much harder to accidentally trigger than a single clap!

---

## 📝 Summary

The large microphone sound sensor converts sound waves into an analog voltage that the Pico reads as a number from 0 to 4095. By detecting sudden spikes above the background noise level, you can identify claps and use them to control outputs like LEDs. The sensitivity dial lets you tune the module for different environments. This is the same technology used in voice-activated devices, sound-reactive lights, and baby monitors!
