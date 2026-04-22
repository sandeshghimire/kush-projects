# Lesson 24: Mini Reed Switch Module — Tiny Magnet Detector!

## 🎯 What You'll Learn
- How the mini reed switch differs from the regular reed switch
- Why smaller sensors are useful in tight spaces
- How to use a pull-up resistor to reliably read a switch
- How to measure how long a magnet stays close (dwell time!)
- How to make a simple combination lock with magnet taps

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Mini Reed Switch Module from Elegoo kit
- A small magnet (a fridge magnet works)
- LED (any color) or use GP25 onboard LED
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

The mini reed switch does the exact same job as the regular reed switch from Lesson 23 — it detects magnets! But it is smaller. Think of it like the difference between a big family car and a tiny sports car. They both get you from A to B, but the small one fits into tight spaces that the big one cannot! The mini version is great for projects where you do not have much room, like putting a detector inside a small toy or box.

Because the mini module is smaller, it sometimes has slightly different sensitivity — the magnet needs to be a bit closer to trigger it. The triggering distance also depends on the strength of your magnet. A strong neodymium magnet (the really powerful silver ones) can trigger it from further away than a regular fridge magnet. Experimenting with different magnets is a great way to understand how the sensor works!

In this lesson we are going to do something extra fun. Instead of just detecting "magnet near or far", we are going to measure HOW LONG the magnet stays close and HOW MANY TIMES it taps. Short tap, long tap, short short long — just like tapping out a secret code! This is the same idea as Morse code, and you could use it to build a magnetic secret knock lock. How cool is that?

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal / DO) | Digital output — HIGH normally, LOW when magnet is near |
| 3V3 | VCC | Power |
| GND | GND | Ground |
| GP25 | — | Onboard LED (no extra wiring needed) |

---

## 💻 The Code

```c
/**
 * Lesson 24: Mini Reed Switch Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Same as the regular reed switch but smaller!
 * We'll measure tap duration to decode short/long taps.
 * Short tap (<300ms) = dot, Long tap (>300ms) = dash — Morse code!
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK library

// Pin for the mini reed switch
#define REED_PIN     15   // GP15 reads the reed switch
#define LED_PIN      25   // Onboard LED — lights when magnet is near

// How long (in ms) separates a "short" tap from a "long" tap
#define SHORT_LONG_MS 300   // Under 300ms = short, 300ms+ = long

// We'll store up to 8 taps in our pattern buffer
#define MAX_TAPS 8

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 24: Mini Reed Switch Module ===\n");
    printf("Tap the magnet to send a secret code!\n");
    printf("Short tap = dot (.)   Long tap = dash (-)\n");
    printf("Wait 1 second after your last tap to see the result.\n\n");

    // Set up reed switch pin as input with pull-up
    gpio_init(REED_PIN);
    gpio_set_dir(REED_PIN, GPIO_IN);     // Input — we are reading it
    gpio_pull_up(REED_PIN);              // Pull-up: pin stays HIGH when switch open

    // Set up onboard LED
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);     // Output — we control the LED
    gpio_put(LED_PIN, 0);               // Start with LED off

    // Arrays to store tap information
    char tap_types[MAX_TAPS];    // Stores '.' or '-' for each tap
    int  tap_count = 0;          // How many taps recorded so far

    bool    magnet_present  = false;  // Is the magnet currently near?
    uint32_t tap_start_ms   = 0;      // When did the current tap start?
    uint32_t last_tap_ms    = 0;      // When did the last tap end?

    printf("Waiting for magnet taps...\n\n");

    while (true) {

        // Read current state: LOW = magnet present, HIGH = no magnet
        bool magnet_now = !gpio_get(REED_PIN);  // Invert so true = magnet present

        // Light up the LED when magnet is near
        gpio_put(LED_PIN, magnet_now ? 1 : 0);  // LED matches magnet state

        // Get current time in milliseconds
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Detect magnet ARRIVING (LOW edge)
        if (magnet_now && !magnet_present) {
            // Magnet just arrived!
            tap_start_ms    = now_ms;     // Record when tap started
            magnet_present  = true;       // Update our state
        }

        // Detect magnet LEAVING (rising edge)
        if (!magnet_now && magnet_present) {
            // Magnet just left!
            uint32_t duration = now_ms - tap_start_ms;  // How long was it near?
            magnet_present    = false;                   // Update state
            last_tap_ms       = now_ms;                  // Remember when tap ended

            // Decide if this was a short or long tap
            char tap_type;
            if (duration < SHORT_LONG_MS) {
                tap_type = '.';    // Short tap = dot
                printf("Short tap! (dot .)\n");
            } else {
                tap_type = '-';    // Long tap = dash
                printf("Long tap! (dash -) [held for %d ms]\n", (int)duration);
            }

            // Store the tap if we have room
            if (tap_count < MAX_TAPS) {
                tap_types[tap_count] = tap_type;   // Save this tap
                tap_count++;                        // Count it
            }
        }

        // If it has been over 1 second since the last tap, show the result!
        if (tap_count > 0 && !magnet_present &&
            (now_ms - last_tap_ms) > 1000) {

            printf("\n--- Your code: ");
            for (int i = 0; i < tap_count; i++) {
                printf("%c", tap_types[i]);   // Print each tap character
                if (i < tap_count - 1) printf(" ");   // Space between taps
            }
            printf(" ---\n");
            printf("(%d taps total)\n\n", tap_count);

            // Check for a secret code!
            // Pattern . - . means "R" in Morse code!
            if (tap_count == 3 &&
                tap_types[0] == '.' &&
                tap_types[1] == '-' &&
                tap_types[2] == '.') {
                printf("*** SECRET CODE ACCEPTED! You typed R! ***\n");
                // Flash the LED 5 times as a reward
                for (int i = 0; i < 5; i++) {
                    gpio_put(LED_PIN, 1); sleep_ms(100);
                    gpio_put(LED_PIN, 0); sleep_ms(100);
                }
            }

            // Reset the tap buffer for next attempt
            tap_count    = 0;
            last_tap_ms  = 0;
            printf("Ready for next code...\n\n");
        }

        sleep_ms(10);   // Check 100 times per second — very responsive!
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Pull-up resistor:** We use `gpio_pull_up()` to keep the pin at HIGH when the switch is open. Without this, the pin would "float" and give us random readings. The pull-up is like a safety net!

2. **Inverted logic:** `bool magnet_now = !gpio_get(REED_PIN)` — notice the `!` (NOT). Since the pin reads LOW when the magnet is present, we invert it so our `magnet_now` variable is `true` when the magnet IS present. This makes the rest of the code easier to read.

3. **Edge detection:** We detect the ARRIVING edge (magnet comes close) and the LEAVING edge (magnet moves away). The time between these two events is the tap duration.

4. **Short vs long taps:** If the magnet was close for less than 300ms, it is a short tap (dot). 300ms or more is a long tap (dash). This is the same idea as Morse code!

5. **1-second timeout:** After 1 second of no activity, we display all the taps collected. This is the natural pause between words in Morse code.

---

## 🎮 Try It!

1. **Single tap:** Quickly bring the magnet close and pull it away. Does it show a dot?

2. **Hold it:** Hold the magnet close for 2 seconds then remove. Does it show a dash?

3. **Spell something:** Try tapping `. -` which is the letter A in Morse code. Can you spell out 3 letters?

4. **Secret code:** Modify the code to check for your own secret pattern. What 3-tap pattern will you choose?

---

## 🏆 Challenge

Build a **magnetic combination lock**! Define a secret code (for example: short, short, long, short = . . - .). Store the secret in an array like `char secret[] = {'.', '.', '-', '.'}`. After each set of taps, compare what the user tapped against the secret. If they match, flash a congratulations pattern on the LED! Use a `for` loop and compare each character to check if the code is correct.

---

## 📝 Summary

The mini reed switch works the same way as the regular reed switch but in a smaller size — perfect for tight spaces. By measuring how long the magnet stays close, you can distinguish short taps from long taps, opening up the possibility of encoding secret messages just like Morse code. This technique of timing events is used in lots of real electronics, from doorbells that play different tunes to secret knock detectors on doors!
