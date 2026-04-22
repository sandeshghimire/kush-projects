# Project 24: Secret Treasure Box — Crack the Magnetic Code!

## 🎯 What You'll Learn
- How to detect a sequence of magnet touches (like a combination lock)
- How to use timing to tell fast taps from slow taps
- How combination locks work in the real world
- How to store patterns and compare them

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Mini Reed Switch Module | $1.50 |
| Small Magnet | $0.50 |
| Active Buzzer Module | $1.00 |
| Green LED | $0.10 |
| Red LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.40** |

## 🌟 The Story

Spy movies always have secret codes to open treasure vaults. You tap a special rhythm on the door and — click — it unlocks! Today you will build something just as cool. Your Pico will watch for a secret sequence of magnet taps on a Reed Switch.

The secret combo is: SHORT tap, SHORT tap, LONG tap (like Morse code for "open up!"). Touch the magnet for less than half a second for a short tap, or hold it for over a second for a long tap. Get it right and the green light unlocks. Get it wrong — ALARM! Nobody gets into your treasure box without knowing the secret code!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Reed Switch module VCC | Pico 3.3V | Power |
| Reed Switch module GND | Pico GND | Ground |
| Reed Switch module OUT | Pico GP5 | Signal output |
| Buzzer + pin | Pico GP15 | Alarm/unlock sound |
| Buzzer - pin | Pico GND | Ground |
| Green LED long leg | Pico GP13 via 220Ω | "Unlocked" light |
| Green LED short leg | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | "Wrong code" light |
| Red LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include <stdio.h>          // For printf messages
#include <string.h>         // For memcmp (compare arrays)

// Pin definitions
#define REED_PIN    5       // Reed switch signal pin
#define BUZZER_PIN  15      // Buzzer pin
#define GREEN_LED   13      // Green "unlocked" LED
#define RED_LED     14      // Red "wrong code" LED

// Tap timing thresholds (in milliseconds)
#define SHORT_TAP_MIN  50   // At least 50ms to count as a tap
#define SHORT_TAP_MAX  600  // Up to 600ms = SHORT tap
#define LONG_TAP_MIN   700  // 700ms or more = LONG tap
#define SEQUENCE_TIMEOUT 3000  // 3 seconds between taps = sequence ends

// Maximum taps in our combo
#define MAX_TAPS    5       // We track up to 5 taps

// Tap types
#define TAP_SHORT   1       // Short tap
#define TAP_LONG    2       // Long tap

// The secret combination: SHORT, SHORT, LONG
// Change this to make your own secret code!
int secret_code[] = {TAP_SHORT, TAP_SHORT, TAP_LONG};
int secret_length = 3;       // Our code has 3 taps

// Storage for what the user tapped
int user_taps[MAX_TAPS];     // Array to store user's taps
int tap_count = 0;           // How many taps recorded so far

// Play unlock melody (happy sound)
void play_unlock_sound() {
    // Three happy rising beeps
    for (int i = 0; i < 3; i++) {           // Three beeps
        gpio_put(BUZZER_PIN, 1);             // Buzzer on
        sleep_ms(100 + (i * 50));            // Each beep a bit longer
        gpio_put(BUZZER_PIN, 0);             // Buzzer off
        sleep_ms(80);                        // Short gap
    }
}

// Play alarm sound (wrong code)
void play_alarm_sound() {
    for (int i = 0; i < 5; i++) {           // Five angry beeps
        gpio_put(BUZZER_PIN, 1);             // Buzzer on
        gpio_put(RED_LED, 1);               // Red LED on
        sleep_ms(150);                       // On for 150ms
        gpio_put(BUZZER_PIN, 0);             // Buzzer off
        gpio_put(RED_LED, 0);               // Red LED off
        sleep_ms(100);                       // Gap
    }
}

// Play a short "got it" beep when a tap is detected
void tap_feedback(int tap_type) {
    gpio_put(BUZZER_PIN, 1);                 // Buzzer on
    if (tap_type == TAP_SHORT) {
        sleep_ms(50);                        // Short beep for short tap
    } else {
        sleep_ms(200);                       // Long beep for long tap
    }
    gpio_put(BUZZER_PIN, 0);                 // Buzzer off
}

// Check if the user's taps match the secret code
bool check_code() {
    if (tap_count != secret_length) {        // Wrong number of taps
        printf("Wrong number of taps! Expected %d, got %d\n",
               secret_length, tap_count);
        return false;                        // Does not match
    }
    
    for (int i = 0; i < secret_length; i++) {  // Check each tap
        if (user_taps[i] != secret_code[i]) {  // Tap doesn't match?
            printf("Wrong tap at position %d!\n", i + 1);
            return false;                    // Code is wrong
        }
    }
    return true;                             // All taps matched!
}

// Reset for a new attempt
void reset_sequence() {
    tap_count = 0;                           // Clear tap count
    for (int i = 0; i < MAX_TAPS; i++) {    // Clear tap storage
        user_taps[i] = 0;
    }
    printf("Ready for new code attempt...\n");
}

int main() {
    stdio_init_all();           // Start USB serial
    sleep_ms(2000);             // Wait for USB

    // Set up reed switch
    gpio_init(REED_PIN);
    gpio_set_dir(REED_PIN, GPIO_IN);
    gpio_pull_up(REED_PIN);     // Pull-up: HIGH = no magnet, LOW = magnet present

    // Set up outputs
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    gpio_init(GREEN_LED);
    gpio_set_dir(GREEN_LED, GPIO_OUT);
    gpio_put(GREEN_LED, 0);

    gpio_init(RED_LED);
    gpio_set_dir(RED_LED, GPIO_OUT);
    gpio_put(RED_LED, 0);

    printf("=== SECRET TREASURE BOX ===\n");
    printf("Secret code: SHORT, SHORT, LONG\n");
    printf("(tap = touch magnet to sensor)\n");
    printf("Short tap = under 0.6 seconds\n");
    printf("Long tap = over 0.7 seconds\n\n");

    reset_sequence();           // Get ready to receive taps

    uint32_t last_tap_time = 0; // When was the last tap?

    while (true) {              // Loop forever

        // Check if too much time has passed since last tap
        uint32_t now = to_ms_since_boot(get_absolute_time());  // Current time
        if (tap_count > 0 && (now - last_tap_time) > SEQUENCE_TIMEOUT) {
            printf("Timeout! Sequence reset.\n");
            reset_sequence();   // Reset and start over
        }

        // Wait for the magnet to come close (pin goes LOW)
        if (gpio_get(REED_PIN) == 0) {      // Magnet detected!
            uint32_t tap_start = to_ms_since_boot(get_absolute_time());

            // Wait for magnet to be removed (pin goes HIGH)
            while (gpio_get(REED_PIN) == 0) {
                sleep_ms(10);               // Check every 10ms
            }

            uint32_t tap_end = to_ms_since_boot(get_absolute_time());
            uint32_t tap_duration = tap_end - tap_start;  // How long was the tap?

            printf("Tap detected: %dms  ", (int)tap_duration);

            // Determine tap type
            if (tap_duration >= SHORT_TAP_MIN && tap_duration <= SHORT_TAP_MAX) {
                user_taps[tap_count] = TAP_SHORT;  // Record short tap
                printf("-> SHORT tap\n");
                tap_feedback(TAP_SHORT);            // Beep feedback
                tap_count++;                        // Increment count
                last_tap_time = to_ms_since_boot(get_absolute_time());

            } else if (tap_duration >= LONG_TAP_MIN) {
                user_taps[tap_count] = TAP_LONG;   // Record long tap
                printf("-> LONG tap\n");
                tap_feedback(TAP_LONG);             // Beep feedback
                tap_count++;                        // Increment count
                last_tap_time = to_ms_since_boot(get_absolute_time());
            }
            // Too short = ignored (bounce)

            // If we have enough taps, check the code
            if (tap_count >= secret_length) {
                sleep_ms(200);              // Small pause
                if (check_code()) {
                    printf("*** CORRECT CODE! UNLOCKED! ***\n");
                    gpio_put(GREEN_LED, 1); // Green LED on!
                    play_unlock_sound();    // Happy sound!
                    sleep_ms(3000);         // Show unlocked for 3 seconds
                    gpio_put(GREEN_LED, 0); // Turn off
                } else {
                    printf("*** WRONG CODE! ALARM! ***\n");
                    play_alarm_sound();     // Alarm sound!
                }
                reset_sequence();          // Reset for next attempt
            }
        }

        sleep_ms(20);           // Small delay in main loop
    }

    return 0;                   // Never reaches here
}
```

## 🔍 How It Works

1. The Reed Switch detects when the magnet touches it — like a button but invisible!
2. The Pico measures how long each magnet touch lasts
3. Short touches (under 0.6s) = SHORT tap, long touches (over 0.7s) = LONG tap
4. After 3 taps, the Pico checks if the pattern matches the secret code
5. Correct pattern = green light + happy sound! Wrong pattern = red light + alarm!

## 🎮 Try It!

- Try the correct code: SHORT, SHORT, LONG — does the green light come on?
- Try a wrong code on purpose — what happens?
- Change `secret_code` to `{TAP_LONG, TAP_SHORT, TAP_SHORT}` for a new secret
- What happens if you tap too slowly and time out?

## 🏆 Challenge

Make the code longer — try a 5-tap sequence! Also add a "lockout" feature: if someone gets the code wrong 3 times in a row, the alarm stays on for 10 seconds. This stops people from guessing by trying over and over!

## 📝 What You Built

You built a magnetic combination lock that uses tap patterns to unlock — like a secret knock on a clubhouse door! You learned how to measure timing, compare patterns, and build a real security system using just a magnet and a Reed Switch.
