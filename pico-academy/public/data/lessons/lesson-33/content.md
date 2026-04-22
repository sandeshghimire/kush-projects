# Lesson 33: SMD RGB LED Module — Tiny Rainbow in a Chip!

## 🎯 What You'll Learn
- What SMD means and why smaller components are useful
- How to mix red, green, and blue light to make any color
- How PWM (Pulse Width Modulation) creates smooth color fades
- How to make a rainbow cycling animation
- How to store and play back a sequence of colors

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- SMD RGB LED Module from Elegoo kit (surface-mount version)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

**SMD** stands for **Surface Mount Device**. It means the component is soldered directly onto the circuit board instead of having long legs that poke through holes. Surface mount components are TINY — sometimes so small you need a magnifying glass to see them! They are used in smartphones, laptops, and all modern electronics because they pack more components into less space. Your SMD RGB LED module uses a surface-mount LED but puts it on a small board that is still easy for you to use with jumper wires.

The SMD RGB LED works exactly the same as the regular RGB LED from earlier lessons — it has three separate LEDs (red, green, blue) inside one tiny package. The difference is just size and how it is made. Same four pins: R, G, B, and GND. Same common cathode setup. Same color mixing rules!

Color mixing with light is really fun. Red + Green = Yellow. Red + Blue = Magenta (purple-pink). Green + Blue = Cyan (bright blue-green). Red + Green + Blue all together = White! But using PWM (from Lesson 2), you can control HOW BRIGHT each color is — from 0% to 100%. This means you can make millions of different shades! Want orange? Use 100% red and about 50% green. Want pink? Use 100% red and 30% blue. In this lesson we will use PWM to make buttery smooth color fades and a gorgeous rainbow animation!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel — use PWM for smooth fading |
| GP10 | G (Green) | Green channel — use PWM for smooth fading |
| GP11 | B (Blue) | Blue channel — use PWM for smooth fading |
| GND | GND | Common ground (common cathode) |

---

## 💻 The Code

```c
/**
 * Lesson 33: SMD RGB LED Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Same as the regular RGB LED — just smaller!
 * We use PWM for smooth color fading.
 * PWM duty cycle 0 = off, 65535 = full brightness.
 *
 * Programs:
 * 1. Basic on/off color mixing
 * 2. Smooth rainbow fade using PWM
 * 3. Color sequence player
 */

#include <stdio.h>           // For printf()
#include "pico/stdlib.h"     // Main Pico SDK
#include "hardware/pwm.h"    // PWM library for smooth fading

// Pin definitions
#define LED_R_PIN  9   // GP9  — Red channel
#define LED_G_PIN 10   // GP10 — Green channel
#define LED_B_PIN 11   // GP11 — Blue channel

// PWM range (0 = off, 65535 = full brightness)
#define PWM_MAX 65535

// Initialize a pin for PWM output
// Returns the PWM slice number for later use
uint pwm_init_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);  // Set pin to PWM function
    uint slice = pwm_gpio_to_slice_num(pin); // Get the PWM slice
    pwm_set_wrap(slice, PWM_MAX);            // Set PWM resolution (0-65535)
    pwm_set_enabled(slice, true);            // Enable PWM on this slice
    return slice;                            // Return slice number
}

// Set RGB color using PWM values (0-255 for each channel)
// We scale from 0-255 (common color format) to 0-65535 (PWM range)
void set_color(uint8_t r, uint8_t g, uint8_t b) {
    // Scale: multiply by 257 to convert 0-255 to roughly 0-65535
    pwm_set_gpio_level(LED_R_PIN, r * 257);   // Set red brightness
    pwm_set_gpio_level(LED_G_PIN, g * 257);   // Set green brightness
    pwm_set_gpio_level(LED_B_PIN, b * 257);   // Set blue brightness
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 33: SMD RGB LED Module ===\n");
    printf("Starting rainbow light show!\n\n");

    // Initialize all three pins for PWM
    pwm_init_pin(LED_R_PIN);   // Set up red channel
    pwm_init_pin(LED_G_PIN);   // Set up green channel
    pwm_init_pin(LED_B_PIN);   // Set up blue channel

    // ---- Part 1: Show basic named colors ----
    printf("Part 1: Named colors\n");

    // Define colors as R, G, B values (0-255)
    // Each color is a set of three numbers: red, green, blue
    const char *color_names[] = {
        "Red", "Orange", "Yellow", "Green", "Cyan", "Blue", "Purple", "White", "Off"
    };
    uint8_t colors[][3] = {
        {255,   0,   0},   // Red
        {255, 128,   0},   // Orange
        {255, 255,   0},   // Yellow
        {  0, 255,   0},   // Green
        {  0, 255, 255},   // Cyan
        {  0,   0, 255},   // Blue
        {255,   0, 255},   // Purple (Magenta)
        {255, 255, 255},   // White (all channels on)
        {  0,   0,   0},   // Off
    };

    int num_colors = 9;   // How many colors in the array

    for (int i = 0; i < num_colors; i++) {
        printf("  Showing: %s\n", color_names[i]);
        set_color(colors[i][0], colors[i][1], colors[i][2]);  // Set the color
        sleep_ms(1500);   // Show each color for 1.5 seconds
    }

    // ---- Part 2: Smooth rainbow fade ----
    printf("\nPart 2: Rainbow fade!\n");

    // Rainbow uses the HSV (Hue-Saturation-Value) color wheel idea
    // We cycle through hue from 0 to 360 degrees
    // Each hue maps to a specific R,G,B combination
    for (int repeat = 0; repeat < 3; repeat++) {    // Do 3 full rainbow cycles

        for (int hue = 0; hue < 360; hue += 2) {   // Step through hues

            // Convert hue to RGB using the color wheel algorithm
            // The color wheel divides into 6 segments of 60 degrees each
            int segment  = hue / 60;           // Which 60-degree segment
            int position = hue % 60;           // Position within segment
            int rising   = position * 255 / 60;  // 0 to 255 within segment
            int falling  = 255 - rising;          // 255 to 0 within segment

            uint8_t r = 0, g = 0, b = 0;

            // Each segment of the wheel has specific R,G,B behavior
            switch (segment) {
                case 0: r = 255;       g = rising;  b = 0;       break; // Red to Yellow
                case 1: r = falling;   g = 255;     b = 0;       break; // Yellow to Green
                case 2: r = 0;         g = 255;     b = rising;  break; // Green to Cyan
                case 3: r = 0;         g = falling; b = 255;     break; // Cyan to Blue
                case 4: r = rising;    g = 0;       b = 255;     break; // Blue to Purple
                case 5: r = 255;       g = 0;       b = falling; break; // Purple to Red
            }

            set_color(r, g, b);    // Apply the calculated color
            sleep_ms(10);          // 10ms per step = smooth 3.6 second cycle
        }
    }

    // ---- Part 3: Breathing effect ----
    printf("\nPart 3: Blue breathing effect!\n");

    for (int cycle = 0; cycle < 5; cycle++) {   // 5 breath cycles

        // Fade IN (brightness 0 to 255)
        for (int brightness = 0; brightness <= 255; brightness += 3) {
            set_color(0, 0, brightness);  // Blue only, increasing
            sleep_ms(10);
        }

        // Fade OUT (brightness 255 to 0)
        for (int brightness = 255; brightness >= 0; brightness -= 3) {
            set_color(0, 0, brightness);  // Blue only, decreasing
            sleep_ms(10);
        }
        sleep_ms(200);  // Brief pause between breaths
    }

    // ---- Main loop: continuous slow rainbow ----
    printf("\nContinuous rainbow loop!\n");
    int hue = 0;

    while (true) {
        // Same color wheel calculation as above
        int segment  = hue / 60;
        int position = hue % 60;
        int rising   = position * 255 / 60;
        int falling  = 255 - rising;

        uint8_t r = 0, g = 0, b = 0;
        switch (segment) {
            case 0: r = 255;     g = rising;  b = 0;       break;
            case 1: r = falling; g = 255;     b = 0;       break;
            case 2: r = 0;       g = 255;     b = rising;  break;
            case 3: r = 0;       g = falling; b = 255;     break;
            case 4: r = rising;  g = 0;       b = 255;     break;
            case 5: r = 255;     g = 0;       b = falling; break;
        }

        set_color(r, g, b);
        sleep_ms(20);     // Smooth but not too fast

        hue = (hue + 1) % 360;   // Advance hue, wrap at 360
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **PWM setup:** `gpio_set_function(pin, GPIO_FUNC_PWM)` switches the pin from regular on/off mode to PWM mode. The `pwm_set_wrap()` sets the counter maximum to 65535, giving us 65536 brightness levels!

2. **set_color() function:** Takes R, G, B values from 0-255 (the standard color format used in apps and websites) and scales them to 0-65535 for the PWM hardware. Neat!

3. **Color arrays:** We store colors as arrays of 3 values `{R, G, B}`. The 2D array `colors[][3]` holds multiple colors. `colors[i][0]` is the red channel of color `i`, `colors[i][1]` is green, `colors[i][2]` is blue.

4. **Rainbow algorithm:** The hue goes from 0 to 360 (like degrees on a circle). We divide the circle into 6 segments of 60 degrees. In each segment, one color channel rises from 0 to 255 while another falls. This creates the smooth rainbow progression!

5. **Breathing effect:** We increment brightness from 0 to 255, then decrement back to 0. Because we do this in small steps (±3) with 10ms delays, it looks like a smooth, gentle pulse!

---

## 🎮 Try It!

1. **Color mixing:** Change one of the color entries to a color you mix yourself. Try `{255, 100, 0}` for a deep amber. What other custom colors can you make?

2. **Rainbow speed:** Try changing `sleep_ms(20)` in the main loop to `sleep_ms(5)`. How does the speed change?

3. **Your favorite color:** Add your favorite color to the `colors` array and `color_names` array. See it light up on the LED!

4. **Breathing color:** Change the breathing effect to use purple (`set_color(brightness, 0, brightness)`) or orange (`set_color(brightness, brightness/2, 0)`).

---

## 🏆 Challenge

Build a **mood light controller**! Define 4 "moods" — each mood has a target color (R, G, B). When you press a button (GP14), cycle to the next mood. When you reach the target mood, smoothly fade the LED FROM the current color TO the target color over 2 seconds. You will need to gradually change each channel value step by step! Hint: calculate how many steps to change per millisecond for each channel.

---

## 📝 Summary

The SMD RGB LED module is a smaller version of the regular RGB LED — same three channels (red, green, blue), same common cathode, same concept, just tinier! By using PWM to control brightness and applying the color wheel algorithm, you can create smooth rainbow fades and breathing effects. The color wheel divides 360 degrees into 6 segments where channels smoothly rise and fall, producing every color of the rainbow with buttery smooth transitions!
