# Lesson 7: Sound Sensor Module — Detecting Claps and Loud Noises

## What you'll learn
- How to read both the digital (DO) and analog (A0) outputs of the Sound Sensor Module
- How to use the serial monitor to watch sensor values in real time
- How to count events over time (clap detection!)
- How to combine the sound sensor with the RGB LED and passive buzzer for fun feedback

## Parts you'll need
- Raspberry Pi Pico 2 W (~$7)
- Elegoo 37 Sensor Kit Sound Sensor Module (included in kit)
- Elegoo 37 Sensor Kit RGB LED Module (included in kit)
- Elegoo 37 Sensor Kit Passive Buzzer Module (included in kit)
- Breadboard and jumper wires (included in kit)
- USB cable to connect Pico to your computer

## Background

The **Sound Sensor Module** from your Elegoo kit has a tiny microphone on it. When a sound wave hits the microphone, it wiggles a little membrane inside and creates a tiny electrical signal. The module's circuit amplifies (makes bigger) that signal so the Pico can read it.

The module gives you **two outputs** to work with. The first is the **analog output (A0)** — it gives a number from 0 to 4095, just like the photoresistor in Lesson 6. Quiet = low number, loud = high number. The second is the **digital output (DO)** — it's either HIGH or LOW depending on whether the sound is louder than a set threshold. There's a small dial (called a potentiometer) on the module that you can twist with a small screwdriver to adjust that threshold. Think of DO like a dog's ears: the dog either heard something (HIGH) or didn't (LOW). The analog output is more like asking "how loud was it exactly?"

The really fun part of this lesson is **clap detection**. A clap makes a very short, sharp spike on the sound sensor. If you detect two spikes within about one second, that's probably a double-clap! You'll use the Pico's built-in clock (via `time_us_64()`) to measure the time between sounds, just like a stopwatch. This is also a great lesson for learning to use `printf()` — you will watch the numbers streaming in your serial monitor in real time, which is a super useful skill for debugging any program.

## Wiring

| Pico Pin    | Component Pin  | Component             |
|-------------|----------------|-----------------------|
| GP26 (ADC0) | A0 (analog)    | Sound Sensor Module   |
| GP14        | DO (digital)   | Sound Sensor Module   |
| 3V3         | VCC            | Sound Sensor Module   |
| GND         | GND            | Sound Sensor Module   |
| GP15        | R (red)        | RGB LED Module        |
| GP16        | G (green)      | RGB LED Module        |
| GP17        | B (blue)       | RGB LED Module        |
| GND         | GND            | RGB LED Module        |
| GP18        | S (signal)     | Passive Buzzer Module |
| 3V3         | VCC            | Passive Buzzer Module |
| GND         | GND            | Passive Buzzer Module |

> **Tip:** The DO threshold is set by the small blue potentiometer on the Sound Sensor Module. Turn it clockwise to make the sensor LESS sensitive (needs louder sounds to trigger). Turn it counter-clockwise to make it MORE sensitive. Adjust until a clap triggers the LED but normal talking does not.

## The code

```c
/**
 * Lesson 7: Sound Sensor Module — Detecting Claps and Loud Noises
 *
 * - Reads analog sound level every 200ms and prints it to serial
 * - When DO goes HIGH (loud sound), flashes RGB LED blue and beeps buzzer
 * - Counts claps: if 2 claps happen within 1 second, toggles LED
 *   between red and green (double-clap light switch!)
 */

#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"
#include <stdio.h>

// --- Pin definitions ---
#define SOUND_ANALOG_PIN  26  // GP26 = ADC0, connects to module A0
#define SOUND_DO_PIN      14  // GP14, connects to module DO (digital output)
#define LED_R_PIN         15  // RGB LED red channel
#define LED_G_PIN         16  // RGB LED green channel
#define LED_B_PIN         17  // RGB LED blue channel
#define BUZZER_PIN        18  // Passive buzzer signal pin

// --- Timing ---
#define CLAP_WINDOW_US    1000000  // 1 second in microseconds (us)
#define DEBOUNCE_US        200000  // 200 ms quiet time after a clap

// --- Helper: set RGB LED colour ---
void set_rgb(int r, int g, int b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// --- Helper: beep the passive buzzer at roughly 1000 Hz ---
// We toggle the pin rapidly to make a tone.
// This is "bit-banging" — doing it manually in software.
void beep(uint ms_duration) {
    // 1000 Hz means 1000 cycles per second, so each cycle = 1000 us
    // Half-cycle (HIGH then LOW) = 500 us each
    uint32_t cycles = (ms_duration * 1000) / 1000; // number of full cycles
    for (uint32_t i = 0; i < cycles; i++) {
        gpio_put(BUZZER_PIN, 1);
        sleep_us(500);
        gpio_put(BUZZER_PIN, 0);
        sleep_us(500);
    }
}

int main() {
    // -----------------------------------------------
    // 1. Start serial monitor
    // -----------------------------------------------
    stdio_init_all();
    sleep_ms(2000);  // Give the serial monitor time to connect
    printf("=== Lesson 7: Sound Sensor Module ===\n");
    printf("Try clapping! Watch the numbers in the serial monitor.\n\n");

    // -----------------------------------------------
    // 2. Set up RGB LED pins
    // -----------------------------------------------
    gpio_init(LED_R_PIN);  gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN);  gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN);  gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(0, 0, 0);

    // -----------------------------------------------
    // 3. Set up passive buzzer pin
    // -----------------------------------------------
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // -----------------------------------------------
    // 4. Set up Sound Sensor digital pin (DO)
    // -----------------------------------------------
    gpio_init(SOUND_DO_PIN);
    gpio_set_dir(SOUND_DO_PIN, GPIO_IN);
    // The module already has a pull-up resistor on DO, so we don't
    // need to enable the Pico's internal pull-up here.

    // -----------------------------------------------
    // 5. Set up ADC for analog reading (A0)
    // -----------------------------------------------
    adc_init();
    adc_gpio_init(SOUND_ANALOG_PIN);
    adc_select_input(0);  // GP26 = channel 0

    // -----------------------------------------------
    // 6. Clap detection variables
    // -----------------------------------------------
    // We track the time of the last two claps to detect a double-clap.
    uint64_t clap_time_1  = 0;  // time of the most recent clap
    uint64_t clap_time_2  = 0;  // time of the clap before that
    uint64_t last_clap_us = 0;  // used for debouncing (ignore very fast re-triggers)
    bool light_is_green   = false;  // tracks the clap-light state

    // -----------------------------------------------
    // 7. Main loop
    // -----------------------------------------------
    uint64_t last_print_us = 0;  // tracks when we last printed to serial

    while (true) {
        uint64_t now = time_us_64();  // current time in microseconds

        // --- Print analog reading every 200 ms ---
        if (now - last_print_us >= 200000) {
            uint16_t analog_val = adc_read();
            printf("Sound level: %4d", analog_val);

            // Also print whether the digital threshold is triggered
            if (gpio_get(SOUND_DO_PIN)) {
                printf("  [DO: LOUD!]");
            } else {
                printf("  [DO: quiet]");
            }
            printf("\n");

            last_print_us = now;
        }

        // --- Check digital output for a loud sound ---
        // DO goes HIGH when a sound louder than the threshold is detected.
        bool do_triggered = gpio_get(SOUND_DO_PIN);

        if (do_triggered && (now - last_clap_us > DEBOUNCE_US)) {
            // --- A new clap was detected! ---
            printf(">>> CLAP detected!\n");

            // Flash the LED blue and beep once
            set_rgb(0, 0, 1);   // blue flash
            beep(80);            // short beep
            set_rgb(0, 0, 0);   // LED back off

            // Shift clap times: old most-recent becomes previous
            clap_time_2 = clap_time_1;
            clap_time_1 = now;
            last_clap_us = now;  // remember time for debounce

            // --- Check for a DOUBLE clap ---
            // If two claps happened within CLAP_WINDOW_US, it's a double-clap!
            if (clap_time_2 != 0 && (clap_time_1 - clap_time_2) < CLAP_WINDOW_US) {
                printf("=== DOUBLE CLAP! Toggling light ===\n");

                // Reset clap history so we don't keep triggering
                clap_time_1 = 0;
                clap_time_2 = 0;

                // Toggle the clap-light between red and green
                light_is_green = !light_is_green;
                if (light_is_green) {
                    set_rgb(0, 1, 0);  // green = ON
                    printf("Clap-light: GREEN (on)\n");
                } else {
                    set_rgb(1, 0, 0);  // red = OFF-ish colour
                    printf("Clap-light: RED (standby)\n");
                }

                // Two quick beeps to confirm the toggle
                beep(60);
                sleep_ms(80);
                beep(60);
            }
        }

        // Small delay to prevent hammering the CPU
        sleep_us(1000);  // check every 1 ms
    }

    return 0;
}
```

### How the code works

1. **`stdio_init_all()` and `printf()`** — Just like in Lesson 6, `stdio_init_all()` starts the USB serial link. Then `printf()` sends formatted text to your computer. This is one of the most useful tools a programmer has — when something isn't working, the first thing you do is add `printf()` calls to see what the program is actually doing. Programmers call this *print debugging* and it is used every day by professionals!

2. **Reading DO with `gpio_get(SOUND_DO_PIN)`** — The digital output pin works just like a button: you read it with `gpio_get()`. It returns 1 when the sound exceeds the threshold and 0 when it doesn't. Simple!

3. **`adc_read()`** — As in Lesson 6, this returns 0–4095 based on the voltage on GP26. For the sound sensor, this number bounces up when a sound happens and back down when it's quiet. Watching it in the serial monitor, you can literally "see" sounds!

4. **`time_us_64()`** — This is like a stopwatch built into the Pico. It returns the number of microseconds (millionths of a second!) since the Pico started up. By saving the time when something happens and comparing it to `now`, you can measure gaps between events very precisely.

5. **Debouncing with `last_clap_us`** — A single clap might trigger the sensor several times in a row because the sound wave bounces around. The debounce check `(now - last_clap_us > DEBOUNCE_US)` means "ignore any triggers that happen within 200 ms of the last one." This is the same idea as button debouncing in Lesson 3, just using time instead of counting.

6. **Clap timing with `clap_time_1` and `clap_time_2`** — Every time a clap is confirmed, we push the old `clap_time_1` into `clap_time_2` and save the new time in `clap_time_1`. Then we check: are those two times within one second of each other? If yes — double clap! It's like keeping track of the last two footsteps to see if someone is running.

7. **`beep(80)`** — A helper function that toggles the buzzer pin up and down rapidly to create a 1000 Hz tone. The number you pass is the duration in milliseconds. This is called *bit-banging* — doing something in software that you could also do with hardware (like PWM). It's simple but it works!

8. **`light_is_green = !light_is_green`** — The `!` operator means "flip it." If `light_is_green` is `true`, it becomes `false`. If it is `false`, it becomes `true`. This is how you toggle something back and forth.

## Try it

1. **Watch the serial monitor:** Open the serial monitor and just make different sounds — whisper, talk normally, clap, snap your fingers. Watch how the analog number changes. What's the loudest number you can make it reach?

2. **Tune the threshold:** Use a small screwdriver (or a pencil tip) to slowly turn the potentiometer on the Sound Sensor Module while talking at a normal volume. Find the setting where normal talking doesn't trigger DO (stays LOW) but a clap does (goes HIGH).

3. **Clap the light on:** Once the threshold is tuned, try double-clapping. The LED should toggle between red and green. Can you do it reliably? What's the hardest part — getting both claps close enough together, or preventing false triggers?

4. **Change the beep:** Modify the `beep()` function to use a different frequency. Try `sleep_us(250)` for a high-pitched 2000 Hz beep, or `sleep_us(1000)` for a low 500 Hz tone. Which do you like better?

## Challenge

**Morse code sound printer!** The sound sensor can detect the difference between a short "tap" and a long "clap" (hand near microphone for longer). Try recording the time the DO pin stays HIGH. If it's shorter than 300 ms, print a `.` (dot). If it's longer, print a `-` (dash). After a 2-second silence, print the accumulated dots and dashes. Can you tap out SOS in Morse code (`... --- ...`) and have the Pico print it? You will need to track the start and end time of each sound event using `time_us_64()`.

## Summary

The Sound Sensor Module gives you both a digital (loud/quiet) output and an analog (how loud exactly) output, and you can read both at the same time. By using `time_us_64()` to measure gaps between sound triggers, you built a double-clap detector — a technique used in real smart-home devices. The serial monitor, powered by `stdio_init_all()` and `printf()`, is your window into what the program is really doing, and it is one of the most important debugging tools you'll ever use.
