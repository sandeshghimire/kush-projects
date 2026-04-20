# Lesson 14: Tracking Module — Follow the Line!

## What you'll learn
- How robot line-follower sensors work using reflected infrared light
- How to read a digital sensor that outputs HIGH or LOW based on surface color
- How to detect changes ("edges") in sensor readings without missing any
- How to count surface-change events — just like a barcode reader!

## Parts you'll need
- Raspberry Pi Pico 2 W
- Tracking/Line Module (from the Elegoo 37 Kit — also called a line sensor or line follower)
- RGB LED Module (R → GP9, G → GP10, B → GP11)
- Active Buzzer Module (GP16)
- Breadboard and jumper wires
- USB cable
- A piece of black electrical tape and a white sheet of paper (for testing)

## Background

Have you ever seen a robot car that follows a black line on the floor at a science fair or competition? That trick is powered by a sensor almost exactly like the one in your kit! The Tracking Module has a tiny IR LED that shines invisible infrared light straight down at the floor (or whatever surface is underneath it). Right next to the IR LED is an IR receiver (a phototransistor) that watches for the reflection coming back.

Here is the key: different surfaces reflect IR light very differently. A **white** surface is like a mirror for IR — it bounces almost all the light straight back to the receiver. A **black** surface is more like a sponge — it absorbs most of the IR light, so almost nothing bounces back. The module has a tiny comparator chip that turns this difference into a clean digital signal: either HIGH or LOW. Most Elegoo tracking modules output LOW when over a black surface and HIGH when over a white surface, but some modules are the opposite! You will write your code to test this and print what it finds.

The module also has a small blue potentiometer (a tiny adjustable knob) that you can turn to change the sensitivity — how close the surface needs to be, and how strong the reflection needs to be. If your readings seem wrong, try gently turning that potentiometer with a small screwdriver. In this lesson you will make the RGB LED show green for white and red for black, beep the active buzzer only when the surface changes (not continuously — that would be incredibly annoying!), and count how many black stripes you pass over. Counting stripes is the exact same way barcode readers work at the checkout line in a supermarket!

## Wiring

| Pico Pin | Component |
|---|---|
| GP15 | Tracking Module — S or DO (signal / digital output) |
| 3V3 (pin 36) | Tracking Module — VCC |
| GND | Tracking Module — GND |
| GP9 | RGB LED Module — R |
| GP10 | RGB LED Module — G |
| GP11 | RGB LED Module — B |
| 3V3 | RGB LED Module — VCC (or +) |
| GND | RGB LED Module — GND |
| GP16 | Active Buzzer Module — S |
| 3V3 | Active Buzzer Module — VCC |
| GND | Active Buzzer Module — GND |

> **Important note on VCC:** Most Elegoo tracking modules work fine on 3.3V (the Pico's 3V3 pin). However, some versions are designed for 5V and may give unreliable readings on 3.3V. If you notice the sensor always reads the same value no matter what surface you test, try wiring VCC to the **VBUS pin** (pin 40 on the Pico) instead — that gives 5V from the USB cable. The signal output from the module is still 3.3V compatible.

> **Tip:** Hold the sensor about 3-10 mm (a quarter to a centimeter) above the surface. Too far away and it will not detect anything; too close and it might read incorrectly. The module typically has an LED that lights up when it detects a reflective surface.

## The code

```c
/**
 * Lesson 14: Tracking Module — Follow the Line!
 * Hardware: Raspberry Pi Pico 2 W  |  Language: C, Pico SDK
 *
 * Reads the Tracking (line follower) Module on GP15.
 * Shows green/red on RGB LED for white/black surface.
 * Beeps the Active Buzzer only on surface changes (edge detection).
 * Counts black-stripe crossings and prints to serial.
 * Includes a lap counter challenge mode.
 *
 * Wiring:
 *   Tracking Module S/DO → GP15
 *   RGB LED R/G/B         → GP9 / GP10 / GP11
 *   Active Buzzer S       → GP16
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define TRACK_PIN    15   // Tracking sensor digital output
#define BUZZER_PIN   16   // Active buzzer (just needs HIGH/LOW)
#define LED_R_PIN     9
#define LED_G_PIN    10
#define LED_B_PIN    11

// ── Sensor interpretation ─────────────────────────────────────────────────────
// Most Elegoo tracking modules: LOW = black surface, HIGH = white surface.
// If your sensor seems backwards, change these two lines:
#define SURFACE_BLACK  false   // false = LOW signal = black
#define SURFACE_WHITE  true    // true  = HIGH signal = white

// ── Minimum time between beeps (prevents buzzer chatter on noisy edges) ──────
#define MIN_BEEP_INTERVAL_MS 200

// ── RGB LED PWM helpers ───────────────────────────────────────────────────────
void rgb_init(void) {
    gpio_set_function(LED_R_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_G_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_B_PIN, GPIO_FUNC_PWM);

    pwm_set_wrap(pwm_gpio_to_slice_num(LED_R_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_G_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_B_PIN), 255);

    pwm_set_enabled(pwm_gpio_to_slice_num(LED_R_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_G_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_B_PIN), true);
}

void rgb_set(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, (r * r) / 255);   // Gamma correction
    pwm_set_gpio_level(LED_G_PIN, (g * g) / 255);
    pwm_set_gpio_level(LED_B_PIN, (b * b) / 255);
}

// ── Active buzzer: just pull HIGH to beep, LOW to stop ───────────────────────
void buzzer_beep_ms(uint duration_ms) {
    gpio_put(BUZZER_PIN, 1);
    sleep_ms(duration_ms);
    gpio_put(BUZZER_PIN, 0);
}

// ── Self-test: print which surface type triggers which signal level ───────────
void self_test(void) {
    printf("\n--- Sensor Self-Test ---\n");
    printf("Reading current surface: ");
    bool reading = gpio_get(TRACK_PIN);
    printf("Signal is %s\n", reading ? "HIGH" : "LOW");
    printf("According to code constants: this is %s surface.\n",
           (reading == SURFACE_WHITE) ? "WHITE" : "BLACK");
    printf("If that seems wrong, swap SURFACE_BLACK and SURFACE_WHITE in the code!\n");
    printf("------------------------\n\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 14: Tracking Module — Follow the Line! ===\n");
    printf("Hold the sensor 5-10 mm above a surface.\n");
    printf("Try: white paper, black tape, your hand...\n\n");

    // ── Pin setup ─────────────────────────────────────────────────────────────
    gpio_init(TRACK_PIN);
    gpio_set_dir(TRACK_PIN, GPIO_IN);
    // No pull-up needed — the module drives the line actively

    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);   // Start silent

    rgb_init();
    rgb_set(0, 0, 64);   // Dim blue = starting up

    // ── Self-test to help user calibrate ──────────────────────────────────────
    sleep_ms(500);
    self_test();

    // ── Initial state ─────────────────────────────────────────────────────────
    bool last_reading   = gpio_get(TRACK_PIN);
    bool last_is_white  = (last_reading == SURFACE_WHITE);

    int  black_count    = 0;   // How many times we have crossed a black surface
    int  stripe_count   = 0;   // Lap counter: counts complete white→black→white cycles

    bool in_black_zone  = !last_is_white;   // Are we currently over black?
    bool stripe_open    = false;            // Have we started entering a stripe?

    uint32_t last_beep_time = 0;
    uint32_t loop_count     = 0;

    printf("Monitoring started! Move the sensor over different surfaces.\n");
    printf("Stripe counter counts each time you cross a black stripe on white.\n\n");

    if (last_is_white) {
        rgb_set(0, 200, 0);    // Green = white surface
        printf("Starting on: WHITE surface\n");
    } else {
        rgb_set(200, 0, 0);    // Red = black surface
        printf("Starting on: BLACK surface\n");
    }

    while (true) {
        bool reading  = gpio_get(TRACK_PIN);
        bool is_white = (reading == SURFACE_WHITE);

        // ── Detect surface change (edge detection) ────────────────────────────
        if (is_white != last_is_white) {
            // Surface has changed!
            last_is_white = is_white;
            uint32_t now = to_ms_since_boot(get_absolute_time());

            if (is_white) {
                // ── Transitioning to WHITE ────────────────────────────────────
                rgb_set(0, 200, 0);    // Green
                printf(">>> WHITE surface  (black crossings so far: %d)\n", black_count);

                // Did we just complete a stripe crossing? (white → black → white)
                if (stripe_open) {
                    stripe_count++;
                    stripe_open = false;
                    printf("    *** Stripe #%d complete! ***\n", stripe_count);
                }

                // Beep only if enough time has passed since last beep
                if ((now - last_beep_time) >= MIN_BEEP_INTERVAL_MS) {
                    buzzer_beep_ms(30);   // Short high beep — white
                    last_beep_time = now;
                }

            } else {
                // ── Transitioning to BLACK ────────────────────────────────────
                rgb_set(200, 0, 0);    // Red
                black_count++;
                stripe_open = true;   // Start of a potential stripe crossing
                printf(">>> BLACK surface  (crossing #%d)\n", black_count);

                if ((now - last_beep_time) >= MIN_BEEP_INTERVAL_MS) {
                    buzzer_beep_ms(60);   // Longer lower beep — black
                    last_beep_time = now;
                }
            }
        }

        // ── Print status every 2 seconds even with no change ─────────────────
        loop_count++;
        if (loop_count >= 200) {   // 200 × 10 ms = 2 seconds
            loop_count = 0;
            printf("[Status] Surface: %-5s  |  Black crossings: %d  |  Stripes: %d\n",
                   is_white ? "WHITE" : "BLACK",
                   black_count,
                   stripe_count);
        }

        sleep_ms(10);   // Check 100 times per second
    }
}
```

### How the code works

1. **Reading the sensor** — `gpio_get(TRACK_PIN)` returns `true` (HIGH) or `false` (LOW) based on what the tracking module's comparator outputs. The constants `SURFACE_WHITE` and `SURFACE_BLACK` at the top of the file tell the code what signal level means what. If your module is "backwards" (HIGH for black, LOW for white), just swap those two constants.

2. **Edge detection** — The key technique here is comparing the current reading to `last_is_white` (the reading from the previous loop). If they differ, the surface has changed. The code only acts on the moment of change, not on every loop iteration. This is called "edge detection" — you detect the edge (transition) not the level. Without this, the buzzer would beep hundreds of times per second while the surface stays the same.

3. **Stripe counting** — A full stripe crossing is: enter white, enter black, return to white. The code uses a `stripe_open` flag. When the sensor enters a black zone, `stripe_open` is set to `true`. When it returns to white with `stripe_open` already true, the stripe count goes up and `stripe_open` is reset. This correctly counts complete crossings rather than just black entries.

4. **Buzzer chatter prevention** — Even with edge detection, a slightly noisy sensor near the edge of a stripe might flip the reading many times in a short burst. The code tracks `last_beep_time` and refuses to beep again if less than 200 ms has passed. This is called a "re-arm timer" — same idea as the bounce protection from earlier lessons.

5. **Self-test function** — `self_test()` runs once at startup and prints which signal level the sensor is currently producing. This helps you verify the `SURFACE_WHITE` / `SURFACE_BLACK` constants are correct for your specific module without needing a multimeter.

6. **Periodic status print** — A loop counter triggers a status print every 2 seconds even if the surface has not changed. This confirms the program is still running and not frozen.

## Try it

1. **Module calibration** — After wiring up, run the code. The self-test will print the current signal level. Hold the sensor over a white sheet of paper, then over a piece of black electrical tape. Does it print "WHITE" and "BLACK" correctly? If they are swapped, change `SURFACE_BLACK` to `true` and `SURFACE_WHITE` to `false` in the code.

2. **Beep height test** — Listen to the two beep durations: 30 ms for white, 60 ms for black. Can you tell the difference without looking at the serial output? Can you make the white beep and black beep have different pitches by replacing the active buzzer with the passive buzzer module?

3. **Sensitivity dial** — Slowly turn the tiny blue potentiometer on the tracking module with a small screwdriver. Notice how the distance at which it detects surfaces changes. Find the sweet spot where it reliably detects a black strip from about 5 mm away.

4. **Stripe counter** — Lay a white sheet of paper on a desk. Stick three pieces of black tape across it (parallel stripes). Move the sensor slowly across all three stripes. Does the stripe counter reach exactly 3? Try going back and forth — each back-and-forth should add 2 more to the count.

## Challenge

Build a **Lap Counter for a toy car!** Stretch a strip of black tape across a track (or draw a thick black line on paper). Mount or hold the tracking module so it hovers just above the track surface. Every time the sensor crosses the tape, count it as half a lap (because the car crosses the start line twice per full lap — once going, once coming back). Print the lap count and a "FASTEST LAP" time (use `time_us_64()` to measure how long each lap takes). Flash the RGB LED a different color for each lap milestone: lap 1 = red, lap 3 = yellow, lap 5 = green, lap 10 = white and full victory fanfare on the buzzer!

## Summary

The Tracking Module uses reflected infrared light to tell the difference between dark and light surfaces, outputting a simple HIGH or LOW digital signal that your Pico can read in one line of code. Edge detection lets you react only to surface changes rather than the constant signal, which makes your code clean and prevents buzzer chaos. Counting stripes this way is the same principle behind barcodes, line-following robots, and optical encoders — you have just learned a technique used in real engineering!
