# Lesson 6: Photoresistor Module — Reading Light with the ADC

## What you'll learn
- What an ADC (Analog-to-Digital Converter) is and why it's useful
- How to read the Photoresistor Module from your Elegoo kit
- How to use `adc_init()`, `adc_gpio_init()`, `adc_select_input()`, and `adc_read()`
- How to print numbers to your computer using `printf()` over USB serial
- How to map a sensor reading to different LED colors

## Parts you'll need
- Raspberry Pi Pico 2 W (~$7)
- Elegoo 37 Sensor Kit Photoresistor Module (included in kit)
- Elegoo 37 Sensor Kit RGB LED Module (included in kit)
- Breadboard and jumper wires (included in kit)
- USB cable to connect Pico to your computer

## Background

So far, every sensor you've used has been **digital** — either ON or OFF, HIGH or LOW, yes or no. But the real world isn't like that! Light can be bright, dim, or anywhere in between. Temperature goes up and down gradually. Volume gets louder and quieter. These are called **analog** values — they can be any value in a range, not just two choices.

The **Photoresistor Module** from your Elegoo kit contains a component that changes how much voltage it outputs based on how much light hits it. More light = higher voltage coming out of the A pin. Less light (like when you cover it with your hand) = lower voltage. But your Pico only understands numbers — so how does it read that changing voltage? It uses something called an **ADC (Analog-to-Digital Converter)**. Think of the ADC like a super-precise ruler for voltage. Instead of measuring centimetres, it measures voltage and gives back a number.

The Pico's ADC takes the voltage on a pin (anywhere from 0 V to 3.3 V) and converts it into a number between **0 and 4095**. Why 4095? Because the Pico uses **12 bits** to store the result, and 2 to the power of 12 = 4096 steps (0 through 4095). So 0 means "no voltage at all" and 4095 means "full 3.3 V." The Pico 2 W has three ADC-capable pins: **GP26** (called ADC0), **GP27** (ADC1), and **GP28** (ADC2). Don't use other pins for analog — only these three work!

## Wiring

Connect your **Photoresistor Module** and **RGB LED Module** like this:

| Pico Pin    | Component Pin   | Component            |
|-------------|-----------------|----------------------|
| GP26 (ADC0) | A (analog out)  | Photoresistor Module |
| 3V3         | VCC             | Photoresistor Module |
| GND         | GND             | Photoresistor Module |
| GP15        | R (red)         | RGB LED Module       |
| GP16        | G (green)       | RGB LED Module       |
| GP17        | B (blue)        | RGB LED Module       |
| GND         | GND             | RGB LED Module       |

> **Tip:** The RGB LED Module already has resistors built in, so plug it straight in — no extra parts needed!

> **Tip:** Only GP26, GP27, and GP28 can do ADC. If you try to call `adc_gpio_init()` on any other pin, it will not work correctly.

## The code

```c
/**
 * Lesson 6: Photoresistor Module — Reading Light with the ADC
 *
 * Reads light level from the Photoresistor Module (Elegoo kit).
 * Shows the result on the RGB LED:
 *   Dark (0-1000)       -> RED
 *   Medium (1001-2500)  -> YELLOW (red + green)
 *   Bright (2501-4095)  -> GREEN
 *
 * Also prints the raw reading to the serial monitor so you can
 * watch the numbers change as you cover or shine light on the sensor.
 */

#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/adc.h"
#include <stdio.h>

// --- Pin numbers ---
#define PHOTO_PIN  26   // GP26 = ADC channel 0 (connect to module's A pin)
#define LED_R_PIN  15   // Red channel of RGB LED Module
#define LED_G_PIN  16   // Green channel of RGB LED Module
#define LED_B_PIN  17   // Blue channel of RGB LED Module

// --- Light level thresholds (0-4095 scale) ---
// Feel free to change these to match your room's lighting!
#define DARK_LIMIT    1000  // 0 to this = dark
#define MEDIUM_LIMIT  2500  // DARK_LIMIT+1 to this = medium
                            // anything above MEDIUM_LIMIT = bright

/**
 * set_rgb — turns the RGB LED to a colour.
 * Pass 1 to turn a channel ON, 0 to turn it OFF.
 * red=1, green=1, blue=0 makes YELLOW (cool trick!).
 */
void set_rgb(int red, int green, int blue) {
    gpio_put(LED_R_PIN, red);
    gpio_put(LED_G_PIN, green);
    gpio_put(LED_B_PIN, blue);
}

int main() {
    // -----------------------------------------------
    // 1. Start serial so printf() works
    // -----------------------------------------------
    // stdio_init_all() sets up the USB connection to your computer.
    // After this, printf() will send text to your serial monitor.
    // In VS Code (Pico extension): open the Serial Monitor panel.
    // In Thonny: connect and look at the Shell panel.
    stdio_init_all();

    // Wait 2 seconds for the serial monitor to connect before printing
    sleep_ms(2000);
    printf("=== Lesson 6: Photoresistor Module ===\n");
    printf("Cover the sensor with your hand to see the number drop!\n\n");

    // -----------------------------------------------
    // 2. Set up the RGB LED pins as digital outputs
    // -----------------------------------------------
    gpio_init(LED_R_PIN);
    gpio_set_dir(LED_R_PIN, GPIO_OUT);

    gpio_init(LED_G_PIN);
    gpio_set_dir(LED_G_PIN, GPIO_OUT);

    gpio_init(LED_B_PIN);
    gpio_set_dir(LED_B_PIN, GPIO_OUT);

    set_rgb(0, 0, 0);  // Start with LED off

    // -----------------------------------------------
    // 3. Set up the ADC
    // -----------------------------------------------
    // adc_init() powers up the ADC hardware inside the Pico.
    // Always call this first before anything ADC-related.
    adc_init();

    // adc_gpio_init(26) switches GP26 into ADC mode.
    // This stops it from being a regular digital pin.
    adc_gpio_init(PHOTO_PIN);

    // adc_select_input(0) tells the ADC: "read from channel 0"
    // Channel 0 = GP26
    // Channel 1 = GP27
    // Channel 2 = GP28
    adc_select_input(0);

    // -----------------------------------------------
    // 4. Main loop: read, print, show colour
    // -----------------------------------------------
    while (true) {

        // adc_read() takes a snapshot of the voltage on GP26
        // and returns a number 0 (darkest/0V) to 4095 (brightest/3.3V).
        // uint16_t is a type for positive whole numbers up to 65535.
        uint16_t reading = adc_read();

        // Print the raw number — watch it move in the serial monitor!
        // %4d means "print the integer using at least 4 characters"
        // so the columns stay neatly lined up.
        printf("Light reading: %4d  |  ", reading);

        // Decide what colour to show based on the reading
        if (reading <= DARK_LIMIT) {
            // Very little light — show RED, like a warning
            set_rgb(1, 0, 0);
            printf("Dark in here!   [RED]\n");

        } else if (reading <= MEDIUM_LIMIT) {
            // Medium light — show YELLOW (red AND green = yellow!)
            set_rgb(1, 1, 0);
            printf("Medium light.   [YELLOW]\n");

        } else {
            // Lots of light — show GREEN, like "all clear!"
            set_rgb(0, 1, 0);
            printf("Super bright!   [GREEN]\n");
        }

        // Pause 100 ms before reading again (10 times per second)
        sleep_ms(100);
    }

    return 0;  // We never reach here, but it is good practice to have it
}
```

### How the code works

1. **`stdio_init_all()`** — Starts the USB serial connection between the Pico and your computer. Once this runs, `printf()` can send text that shows up in your serial monitor. Without it, `printf()` does nothing at all.

2. **`adc_init()`** — Powers up the ADC hardware inside the Pico chip. Think of it like flipping the ON switch for the measurement machine before you use it. You only call this once at the start.

3. **`adc_gpio_init(26)`** — Switches GP26 from "regular digital GPIO" mode into "ADC input" mode. This is required — if you skip it, the pin stays in digital mode and your readings will be garbage.

4. **`adc_select_input(0)`** — The Pico has one ADC "reader" that can be pointed at different channels. This line points it at channel 0, which is GP26. If you later want to also read GP27, you would call `adc_select_input(1)` first.

5. **`uint16_t reading = adc_read()`** — Reads the current voltage on the selected pin and converts it to a number 0–4095. `uint16_t` is a data type that holds unsigned (positive-only) 16-bit integers — perfect for 0 to 4095.

6. **`printf("Light reading: %4d | ", reading)`** — Sends text to your computer over USB. The `%4d` is a *format specifier* — it means "insert the integer variable here, using at least 4 character-widths so columns line up."

7. **The `if / else if / else` chain** — Compares the reading against your thresholds and decides which colour to show. Like a bouncer at three different clubs: under 1000 gets the red rope, under 2500 gets the yellow rope, everyone else gets green!

8. **`set_rgb(1, 1, 0)`** — The helper function sets each LED channel on or off. Red=1 and Green=1 at the same time makes yellow — a fun trick of colour mixing, just like painting!

9. **`sleep_ms(100)`** — Waits 100 milliseconds (one tenth of a second) between readings. Reading faster would just flood your serial monitor with numbers so fast you couldn't read them.

## Try it

1. **Hand test:** Slowly lower your hand over the sensor and watch the serial monitor. The number should drop as you block light. Cover it completely — does it hit zero, or just get close?

2. **Flashlight test:** Shine a phone torch directly at the sensor. Can you get the reading close to 4095? How far away can the torch be and still make it bright?

3. **Threshold tune-up:** The numbers `DARK_LIMIT` and `MEDIUM_LIMIT` are guesses for an average room. If your LED is stuck on one colour no matter what, change them! Try halving `DARK_LIMIT` to 500, or raising `MEDIUM_LIMIT` to 3200, and see how that changes things.

4. **Blue surprise:** The blue channel of the RGB LED is never used in this lesson. Add a new condition: if the reading is between 2000 and 2500, show **cyan** (green + blue = cyan). Update the `printf` message too. What does cyan look like on your LED?

## Challenge

**Build a sunlight graph!** Instead of just three levels, print a "bar chart" to the serial monitor using `#` characters. For example, if the reading is 2048 (about half of 4095), print 20 `#` symbols out of a possible 40. Use a loop and the formula `int bars = reading * 40 / 4095;` to calculate how many bars to draw. This technique is called **ASCII art** and it's a classic programmer trick for showing data without a screen. Can you also make the LED colour change smoothly across more than three levels?

## Summary

The Photoresistor Module turns light into voltage, and the Pico's ADC turns that voltage into a number from 0 to 4095 using `adc_read()`. By checking which range the number falls in, your code picks a matching LED colour — red for dark, yellow for medium, green for bright. This is your first program that reacts to a continuously varying real-world signal, which is a huge step beyond simple on/off buttons!
