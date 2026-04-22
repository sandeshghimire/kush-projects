# Lesson 29: Small Microphone Sound Sensor — Listen Up!

## 🎯 What You'll Learn
- How the small microphone compares to the large one
- How to find the peak (highest point) in a sound signal
- How to measure the volume envelope (how loud over time)
- How to build a sound-activated visual meter (VU meter!)
- How to use sound to trigger fun LED effects

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Small Microphone Sound Sensor Module from Elegoo kit
- RGB LED Module (for colorful VU meter)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

The small microphone sound sensor works exactly the same way as the large one from Lesson 28 — it converts sound into an analog voltage. The difference is size! The small module has a tinier electret microphone capsule. Smaller microphones are often better at picking up high-frequency sounds (think: sharp sounds like finger snaps, clinking glasses, or high notes from a whistle). The large module is better for deep, low sounds. Together they cover a great range!

Have you ever seen the bouncing bars on a music player or DJ equipment that show how loud the music is? Those are called **VU meters** (Volume Unit meters). They react to the music in real time — loud parts make the bars jump up, quiet parts let them fall. In this lesson we are going to build our own VU meter using the small microphone and an RGB LED! Instead of boring bars on a screen, we will use colors: quiet = green, medium = yellow, loud = red!

Microphones have a really interesting property — the signal they output actually **oscillates** (wobbles up and down) with the sound wave. In silence, the output sits at a middle voltage (around 1.65V or ADC ~2048). When sound hits, the signal bounces up AND down around that middle point. Loud sounds make it bounce far; quiet sounds barely move it. To measure "loudness," we need to look at how far the signal moves from the middle — this is called the **amplitude**!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | AO (analog output) | Analog sound level |
| 3V3 | VCC | Power |
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
 * Lesson 29: Small Microphone Sound Sensor Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The microphone signal oscillates around the midpoint (ADC ~2048).
 * Loud sounds create large swings away from the midpoint.
 * We measure amplitude to find the "loudness" level.
 *
 * We build a color VU meter:
 * - Quiet = green
 * - Medium = yellow (red + green)
 * - Loud   = red
 */

#include <stdio.h>          // For printf()
#include <stdlib.h>         // For abs() function
#include "pico/stdlib.h"    // Main Pico SDK
#include "hardware/adc.h"   // ADC library

// Pin definitions
#define MIC_PIN   26   // GP26 = ADC0 — small microphone analog output
#define LED_R_PIN  9   // GP9  — RGB LED red channel
#define LED_G_PIN 10   // GP10 — RGB LED green channel
#define LED_B_PIN 11   // GP11 — RGB LED blue channel

// The midpoint of the ADC range (silence = ~2048 on a 12-bit ADC)
#define ADC_MIDPOINT 2048

// Thresholds for VU meter color changes
#define QUIET_THRESHOLD  100   // Below this = very quiet (green)
#define MEDIUM_THRESHOLD 400   // Below this = medium (yellow), above = loud (red)

// Helper: set RGB LED color
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r ? 1 : 0);   // Set red channel
    gpio_put(LED_G_PIN, g ? 1 : 0);   // Set green channel
    gpio_put(LED_B_PIN, b ? 1 : 0);   // Set blue channel
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 29: Small Microphone Sound Sensor ===\n");
    printf("Color VU meter: quiet=green, medium=yellow, loud=red!\n");
    printf("Make some noise!\n\n");

    // Set up ADC
    adc_init();
    adc_gpio_init(MIC_PIN);   // Set GP26 as analog input

    // Set up RGB LED pins as outputs
    gpio_init(LED_R_PIN); gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN); gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN); gpio_set_dir(LED_B_PIN, GPIO_OUT);

    // Start with green (quiet)
    set_rgb(false, true, false);

    // We will sample the microphone many times per window
    // and find the PEAK amplitude (max deviation from midpoint)
    // This gives us the loudness of the sound during that window.

    printf("Sound level  | Amplitude | Color\n");
    printf("-------------|-----------|-------\n");

    while (true) {

        // Sample the microphone 100 times over 100ms (one sample per ms)
        // Find the maximum and minimum values during this window
        uint16_t max_val = 0;        // Highest sample in window
        uint16_t min_val = 4095;     // Lowest sample in window

        for (int i = 0; i < 100; i++) {
            adc_select_input(0);           // ADC channel 0 = GP26
            uint16_t sample = adc_read();  // Take one reading

            if (sample > max_val) max_val = sample;  // Track maximum
            if (sample < min_val) min_val = sample;  // Track minimum

            sleep_ms(1);   // 1ms between each sample = 100 samples per 100ms
        }

        // Amplitude = half of the total swing (peak-to-peak / 2)
        // This removes the DC offset (the midpoint sitting at ~2048)
        uint16_t peak_to_peak = max_val - min_val;   // Total swing
        uint16_t amplitude    = peak_to_peak / 2;    // Half swing = amplitude

        // Print a simple text bar graph showing the amplitude
        int bars = amplitude / 50;     // Scale: 50 ADC units = one bar
        if (bars > 20) bars = 20;      // Cap at 20 bars for display

        printf("[");
        for (int i = 0; i < 20; i++) {
            printf(i < bars ? "#" : " ");   // Filled or empty bar
        }
        printf("] %4d  ", amplitude);

        // Set the RGB LED color based on amplitude (VU meter!)
        if (amplitude < QUIET_THRESHOLD) {
            // Very quiet — show green
            set_rgb(false, true, false);
            printf("Green (quiet)\n");

        } else if (amplitude < MEDIUM_THRESHOLD) {
            // Medium — show yellow (red + green mixed)
            set_rgb(true, true, false);
            printf("Yellow (medium)\n");

        } else {
            // Loud! — show red
            set_rgb(true, false, false);
            printf("RED! (loud!)\n");
        }
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Peak-to-peak measurement:** The microphone signal bounces up AND down with sound. We take 100 samples, find the highest (`max_val`) and lowest (`min_val`), and subtract: `peak_to_peak = max_val - min_val`. This tells us the total swing of the signal!

2. **Amplitude:** We halve the peak-to-peak value to get the amplitude. In silence, `max_val` and `min_val` will be very close together (tiny swing), so amplitude is near 0. Loud sounds cause a large swing, giving high amplitude.

3. **100-sample window:** Taking 100 samples over 100ms averages out the noise and captures the sound accurately. If we only took one sample, we might just catch the signal at the midpoint and think nothing was happening!

4. **Three-level VU meter:** We compare `amplitude` against two thresholds. Below 100 = quiet (green). Between 100 and 400 = medium (yellow). Above 400 = loud (red). You can tune these numbers!

5. **RGB mixing:** Yellow is made by turning on BOTH red AND green. Just like in real light mixing — red + green = yellow!

---

## 🎮 Try It!

1. **Whisper vs shout:** Whisper near the microphone, then shout. Watch the LED color change from green to red!

2. **Music test:** Play music from your phone near the module. Does the VU meter dance with the beat?

3. **Clap distance:** Clap at different distances from the microphone. How far can you be and still get a red reading?

4. **Tune the thresholds:** Change `QUIET_THRESHOLD` and `MEDIUM_THRESHOLD`. Make it so only a shout gets red!

---

## 🏆 Challenge

Add a **fourth level** to your VU meter! Add a white light (all three LEDs on at once) that only triggers for extremely loud sounds above a `VERY_LOUD_THRESHOLD` of 800. Your levels will then be: green (quiet) → yellow (medium) → red (loud) → white (very loud). This is just like a real VU meter with more zones. Can you also make the LED blink faster the louder the sound is?

---

## 📝 Summary

The small microphone sensor converts sound to an analog voltage that oscillates around a midpoint. By measuring the peak-to-peak swing (max minus min) over a short time window and halving it, you get the amplitude — a measure of loudness. Using this, you built a colorful VU meter that shows green for quiet, yellow for medium, and red for loud sounds — exactly like the meters you see on mixing boards and music equipment!
