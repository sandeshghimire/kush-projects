# Lesson 35: Shock/Vibration Switch Module — Feel the Shake!

## 🎯 What You'll Learn
- How a vibration switch detects shaking and knocking
- What a spring-contact sensor is and how it works inside
- How to detect brief, instantaneous events (not just "is it happening now?")
- How to count knocks and measure their timing
- How to build a secret knock detector!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Shock/Vibration Switch Module from Elegoo kit
- Active Buzzer Module (for audio feedback)
- LED (any color) or use onboard LED
- Something to tap (the module itself, a table, your desk)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Inside a vibration switch there is a tiny coiled spring — like a miniature Slinky! One end of the spring is always touching a metal contact. When everything is still, the spring sits quietly and the circuit is either open or closed depending on the sensor type. But when you TAP the sensor, shake it, or even bang the table it is sitting on, the spring jiggles! That tiny jiggle makes the spring momentarily disconnect or connect with the contact, creating a brief electrical pulse. The Pico can detect that pulse!

The really cool thing is that vibration switches are **passive** — they do not need any power to the sensing element itself. The spring is just a mechanical part that physically makes or breaks a circuit when disturbed. This makes them extremely reliable and simple. They are used in earthquake detectors, car alarm systems (bang a car door and the alarm trips), anti-theft boxes, and toy motion detectors. Some security systems use them to detect if someone is trying to break a window!

The best project for this sensor is a **secret knock detector**! Instead of a password you type, you knock a specific pattern. Three quick knocks and a slow knock? ACCESS GRANTED. Two quick knocks? ACCESS DENIED. This is the same idea as those fun movie scenes where someone knocks a secret rhythm on a door and a little window opens. You are going to build one!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | DO (digital output) | Goes LOW briefly when vibration/knock detected |
| 3V3 | VCC | Power |
| GND | GND | Ground |
| GP16 | — | Buzzer signal |
| GP25 | — | Onboard LED (no extra wiring) |

---

## 💻 The Code

```c
/**
 * Lesson 35: Shock/Vibration Switch Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The DO pin goes LOW briefly when a knock/vibration is detected.
 * We detect these brief pulses and record their timing.
 *
 * Secret knock detector:
 * - Store a secret knock pattern (delays between knocks)
 * - Compare incoming knocks to the pattern
 * - Grant or deny access!
 */

#include <stdio.h>          // For printf()
#include <stdlib.h>         // For abs()
#include "pico/stdlib.h"    // Main Pico SDK

// Pin definitions
#define VIBRATION_PIN  15   // GP15 — vibration switch digital output
#define BUZZER_PIN     16   // GP16 — buzzer for audio feedback
#define LED_PIN        25   // Onboard LED

// How long to wait after last knock before evaluating the pattern
#define KNOCK_TIMEOUT_MS  2000   // 2 seconds of silence = pattern complete

// Maximum number of knocks in a pattern
#define MAX_KNOCKS 8

// Minimum time between valid knocks (debounce)
#define MIN_KNOCK_INTERVAL_MS  50

// Tolerance for knock timing comparison (in milliseconds)
// How close does each gap need to be to the secret?
#define TIMING_TOLERANCE_MS  300   // Within 300ms = close enough

// =====================================================
// SECRET KNOCK PATTERN
// These are the gaps (in milliseconds) between knocks.
// Pattern: knock, wait 200ms, knock, wait 200ms, knock, wait 600ms, knock
// That is: three quick knocks then one slow knock!
// =====================================================
uint32_t secret_gaps[] = {200, 200, 600};   // Gaps between 4 knocks
int secret_knock_count = 4;   // Total number of knocks (= gaps + 1)

// Helper: short beep
void beep_short() {
    gpio_put(BUZZER_PIN, 1); sleep_ms(80);
    gpio_put(BUZZER_PIN, 0); sleep_ms(80);
}

// Helper: long beep
void beep_long() {
    gpio_put(BUZZER_PIN, 1); sleep_ms(500);
    gpio_put(BUZZER_PIN, 0); sleep_ms(100);
}

// Helper: success fanfare (3 rising beeps)
void fanfare_success() {
    beep_short(); beep_short(); beep_long();
}

// Helper: failure buzz (one long sad buzz)
void fanfare_fail() {
    gpio_put(BUZZER_PIN, 1); sleep_ms(800);
    gpio_put(BUZZER_PIN, 0);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    printf("=== Lesson 35: Shock/Vibration Switch — Secret Knock Detector! ===\n");
    printf("Secret knock: 3 quick knocks then 1 slow knock\n");
    printf("(Gap pattern: ~200ms, ~200ms, ~600ms between knocks)\n\n");

    // Set up vibration sensor as input
    gpio_init(VIBRATION_PIN);
    gpio_set_dir(VIBRATION_PIN, GPIO_IN);
    gpio_pull_up(VIBRATION_PIN);   // Pull-up: HIGH when no vibration

    // Set up buzzer as output
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // Set up LED
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);

    // Arrays to store knock timing data
    uint32_t knock_times[MAX_KNOCKS];   // Timestamps of each knock
    int      knock_count = 0;            // How many knocks recorded

    bool     prev_vibrating  = false;    // Was there vibration last loop?
    uint32_t last_knock_ms   = 0;        // When was the last knock?

    printf("Ready! Try knocking the secret pattern...\n\n");

    while (true) {

        // Read the vibration sensor
        // LOW = vibration detected (spring triggered)
        bool vibrating = !gpio_get(VIBRATION_PIN);   // Invert: LOW means YES

        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Detect a new knock (rising edge of vibration)
        if (vibrating && !prev_vibrating) {
            // Check debounce — ignore if too soon after last knock
            if (now_ms - last_knock_ms > MIN_KNOCK_INTERVAL_MS) {

                // Record this knock!
                if (knock_count < MAX_KNOCKS) {
                    knock_times[knock_count] = now_ms;   // Save timestamp
                    knock_count++;

                    // Short click sound and flash LED
                    gpio_put(LED_PIN, 1);
                    beep_short();
                    gpio_put(LED_PIN, 0);

                    printf("Knock #%d detected at %lu ms\n", knock_count, now_ms);
                    last_knock_ms = now_ms;
                }
            }
        }

        // Check if timeout has passed since last knock — evaluate the pattern!
        if (knock_count > 0 && (now_ms - last_knock_ms) > KNOCK_TIMEOUT_MS) {

            printf("\n--- Evaluating knock pattern ---\n");
            printf("You knocked %d times.\n", knock_count);

            // Check if we have the right number of knocks
            if (knock_count != secret_knock_count) {
                printf("Wrong number of knocks! (expected %d, got %d)\n",
                       secret_knock_count, knock_count);
                printf("ACCESS DENIED!\n\n");
                fanfare_fail();

            } else {
                // Check the timing gaps between knocks
                bool pattern_matches = true;

                for (int i = 0; i < knock_count - 1; i++) {
                    // Calculate gap between knock i and knock i+1
                    uint32_t actual_gap = knock_times[i+1] - knock_times[i];
                    uint32_t expected_gap = secret_gaps[i];

                    // Check if this gap is within tolerance
                    int difference = abs((int)actual_gap - (int)expected_gap);

                    printf("  Gap %d: actual=%lu ms, expected=%lu ms, diff=%d ms %s\n",
                           i + 1,
                           actual_gap,
                           expected_gap,
                           difference,
                           difference <= TIMING_TOLERANCE_MS ? "OK" : "WRONG");

                    if (difference > TIMING_TOLERANCE_MS) {
                        pattern_matches = false;   // This gap was wrong
                    }
                }

                if (pattern_matches) {
                    printf("CORRECT! ACCESS GRANTED!!!\n\n");
                    // Flash LED and play fanfare
                    for (int i = 0; i < 3; i++) {
                        gpio_put(LED_PIN, 1); sleep_ms(100);
                        gpio_put(LED_PIN, 0); sleep_ms(100);
                    }
                    fanfare_success();
                } else {
                    printf("Wrong pattern timing. ACCESS DENIED!\n\n");
                    fanfare_fail();
                }
            }

            // Reset for next attempt
            knock_count  = 0;
            last_knock_ms = 0;
            printf("Ready for next knock attempt...\n\n");
        }

        prev_vibrating = vibrating;
        sleep_ms(5);   // Check 200 times per second for quick response
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **LOW pulse detection:** The vibration sensor's DO pin briefly goes LOW when a knock is detected. We read `vibrating = !gpio_get()` so that `true` means "knock detected".

2. **Edge detection:** We only record a knock when vibrating STARTS (transition from false to true). This means one knock = one count, not one count per loop iteration.

3. **Timestamp recording:** `to_ms_since_boot(get_absolute_time())` gives us the current time in milliseconds since the Pico started. We save this for each knock so we can calculate the gaps later.

4. **Pattern evaluation:** After `KNOCK_TIMEOUT_MS` milliseconds of silence, we evaluate the pattern. First we check the knock count matches. Then we check each gap between consecutive knocks against the secret gap.

5. **Timing tolerance:** Humans are not perfect at timing! We allow `TIMING_TOLERANCE_MS` (300ms) of error. If your gap is between `expected - 300` and `expected + 300`, it passes!

---

## 🎮 Try It!

1. **Test detection:** Tap the module gently with your finger. Watch the knock count go up!

2. **Try the secret knock:** Three quick taps, then wait 0.5-1 seconds, then one more tap. Did you get access granted?

3. **Bang the table:** Put the module on your desk and thump the desk near it. Does it detect the vibration through the desk?

4. **Change the secret:** Modify `secret_gaps[]` and `secret_knock_count` to be a different pattern. Can you program a harder secret knock?

---

## 🏆 Challenge

Add a **lockout mode**! After 3 failed attempts in a row, lock the system for 30 seconds (no attempts accepted, buzzer alarm sounds, LED stays red). Track failed attempts with a counter. Reset the counter on a successful unlock. This is exactly how real security systems prevent "brute force" attacks where someone tries every combination until they get it right!

---

## 📝 Summary

The shock/vibration switch contains a tiny spring that momentarily makes or breaks a circuit when knocked or shaken. By recording the timestamps of each knock and calculating the gaps between them, you can compare an entered knock pattern against a stored secret pattern. Timing tolerance allows for natural human imprecision. This technology is used in real security systems, earthquake sensors, and anti-tamper devices!
