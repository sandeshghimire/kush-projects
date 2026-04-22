# Project 35: Knock Knock Game — Can You Copy the Secret Beat?

## 🎯 What You'll Learn
- How a vibration/shock sensor detects physical taps
- How to generate and store knock patterns
- How to compare patterns (like Simon Says but with knocks!)
- How to build a complete input-and-compare game

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Shock/Vibration Switch Module | $1.50 |
| Active Buzzer Module | $1.00 |
| Green LED | $0.10 |
| Red LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Push Button (start game) | $0.50 |
| 10kΩ Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.50** |

## 🌟 The Story

"Knock knock! Who's there?" There is something special about a secret knock — only people who know the pattern can enter the clubhouse! In movies, spies use special knock codes to meet in secret. This game is inspired by that idea!

The Pico will tap out a pattern using the buzzer — short beep, long beep, short beep — and then it is YOUR turn to knock the same pattern back on the table (the vibration sensor will feel your knocks). Match the pattern and you win a point! Get it wrong and you lose a turn. As you get better, the patterns get longer and trickier. Can you make it to Level 5?

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Vibration Sensor VCC | Pico 3.3V | Power |
| Vibration Sensor GND | Pico GND | Ground |
| Vibration Sensor OUT | Pico GP6 | Signal: LOW = vibration detected |
| Buzzer + pin | Pico GP15 | Game audio |
| Buzzer - pin | Pico GND | Ground |
| Green LED long leg | Pico GP13 via 220Ω | Correct! |
| Green LED short leg | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | Wrong! |
| Red LED short leg | Pico GND | Ground |
| Start Button one leg | Pico GP10 | Begin game |
| Start Button other leg | Pico GND | Ground |
| 10kΩ resistor | GP10 to 3.3V | Pull-up |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include <stdio.h>          // For printf
#include <stdlib.h>         // For rand() random numbers

// Pin definitions
#define VIBR_PIN    6       // Vibration sensor output
#define BUZZER_PIN  15      // Buzzer for game audio
#define GREEN_LED   13      // Correct answer indicator
#define RED_LED     14      // Wrong answer indicator
#define START_BTN   10      // Start game button

// Knock types
#define KNOCK_SHORT 1       // Short knock
#define KNOCK_LONG  2       // Long knock

// Game settings
#define MAX_PATTERN  6      // Maximum pattern length
#define SHORT_THRESH 400    // Vibration under 400ms = short knock
#define LONG_THRESH  800    // Vibration over 400ms = long knock
#define KNOCK_TIMEOUT 3000  // 3 seconds to respond

// Short beep = short knock signal
void beep_short() {
    gpio_put(BUZZER_PIN, 1);    // Buzzer on
    sleep_ms(120);               // Short burst
    gpio_put(BUZZER_PIN, 0);    // Buzzer off
    sleep_ms(200);               // Gap
}

// Long beep = long knock signal
void beep_long() {
    gpio_put(BUZZER_PIN, 1);    // Buzzer on
    sleep_ms(500);               // Long burst
    gpio_put(BUZZER_PIN, 0);    // Buzzer off
    sleep_ms(300);               // Gap
}

// Play a knock pattern on the buzzer (teaching phase)
void play_pattern(int *pattern, int length) {
    printf("Listen to the pattern:\n");
    for (int i = 0; i < length; i++) {       // Play each knock
        if (pattern[i] == KNOCK_SHORT) {
            printf("  SHORT ");
            beep_short();                     // Play short beep
        } else {
            printf("  LONG  ");
            beep_long();                      // Play long beep
        }
    }
    printf("\n");
}

// Generate a random knock pattern for this round
void make_pattern(int *pattern, int length) {
    for (int i = 0; i < length; i++) {
        // Random short or long (1 or 2)
        pattern[i] = (rand() % 2) + 1;
    }
}

// Play win sound
void play_win() {
    for (int i = 0; i < 3; i++) {
        gpio_put(BUZZER_PIN, 1);
        gpio_put(GREEN_LED, 1);
        sleep_ms(80);
        gpio_put(BUZZER_PIN, 0);
        gpio_put(GREEN_LED, 0);
        sleep_ms(60);
    }
    gpio_put(GREEN_LED, 1);    // Keep green on for a moment
    sleep_ms(500);
    gpio_put(GREEN_LED, 0);
}

// Play fail sound
void play_fail() {
    gpio_put(BUZZER_PIN, 1);
    gpio_put(RED_LED, 1);
    sleep_ms(600);
    gpio_put(BUZZER_PIN, 0);
    gpio_put(RED_LED, 0);
    sleep_ms(200);
    gpio_put(RED_LED, 1);
    sleep_ms(400);
    gpio_put(RED_LED, 0);
}

// Wait for a knock and return its type (SHORT or LONG), or 0 for timeout
int wait_for_knock() {
    uint32_t start = to_ms_since_boot(get_absolute_time());

    // Wait for knock to start (vibration detected)
    while (gpio_get(VIBR_PIN) != 0) {                 // Wait for LOW signal
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if ((now - start) > KNOCK_TIMEOUT) {           // Timeout?
            printf("Timeout — no knock received!\n");
            return 0;                                  // No knock = fail
        }
    }

    // Knock started! Measure how long it lasts
    uint32_t knock_start = to_ms_since_boot(get_absolute_time());

    // Wait for knock to end (vibration stops)
    sleep_ms(20);                                      // Debounce
    uint32_t knock_end = to_ms_since_boot(get_absolute_time());
    while (gpio_get(VIBR_PIN) == 0) {                 // Wait for signal to go HIGH
        knock_end = to_ms_since_boot(get_absolute_time());
        if ((knock_end - knock_start) > 1500) break;  // Too long? Stop waiting
    }

    uint32_t duration = knock_end - knock_start;      // Knock duration
    printf("  Knock: %dms", (int)duration);

    if (duration < SHORT_THRESH) {
        printf(" -> SHORT\n");
        return KNOCK_SHORT;                            // Short knock
    } else {
        printf(" -> LONG\n");
        return KNOCK_LONG;                             // Long knock
    }
}

// Check if button is pressed
bool button_pressed(uint pin) {
    if (gpio_get(pin) == 0) {
        sleep_ms(50);
        if (gpio_get(pin) == 0) {
            while (gpio_get(pin) == 0) sleep_ms(10);
            return true;
        }
    }
    return false;
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Initialize random with time-based seed
    srand(to_ms_since_boot(get_absolute_time()));

    // Set up vibration sensor
    gpio_init(VIBR_PIN);
    gpio_set_dir(VIBR_PIN, GPIO_IN);
    gpio_pull_up(VIBR_PIN);         // Pull-up: HIGH = no vibration

    // Set up outputs
    gpio_init(BUZZER_PIN); gpio_set_dir(BUZZER_PIN, GPIO_OUT); gpio_put(BUZZER_PIN, 0);
    gpio_init(GREEN_LED);  gpio_set_dir(GREEN_LED,  GPIO_OUT); gpio_put(GREEN_LED, 0);
    gpio_init(RED_LED);    gpio_set_dir(RED_LED,    GPIO_OUT); gpio_put(RED_LED, 0);

    // Set up start button
    gpio_init(START_BTN);
    gpio_set_dir(START_BTN, GPIO_IN);
    gpio_pull_up(START_BTN);

    printf("=== KNOCK KNOCK GAME ===\n");
    printf("Listen to the knock pattern, then knock it back!\n");
    printf("Short knock = quick tap. Long knock = hold tap.\n\n");

    int score = 0;                  // Player score
    int level = 1;                  // Current level (pattern length)
    int pattern[MAX_PATTERN];       // The pattern to match

    while (true) {                  // Game loop

        printf("Press start button to begin!\n");
        printf("Score: %d  Level: %d\n\n", score, level);

        // Wait for start
        while (!button_pressed(START_BTN)) {
            gpio_put(GREEN_LED, 1); sleep_ms(300);    // Blink green while waiting
            gpio_put(GREEN_LED, 0); sleep_ms(300);
        }

        printf("--- LEVEL %d ---\n", level);
        sleep_ms(500);

        make_pattern(pattern, level);   // Generate random pattern
        play_pattern(pattern, level);   // Play it for the player

        printf("\nYour turn! Knock the pattern:\n");
        sleep_ms(500);

        bool correct = true;            // Assume correct until proven wrong

        for (int i = 0; i < level; i++) {   // Check each knock
            int knock = wait_for_knock();   // Wait for player's knock

            if (knock == 0) {               // Timeout?
                printf("TOO SLOW!\n");
                correct = false;
                break;
            }

            if (knock != pattern[i]) {      // Wrong knock type?
                printf("WRONG! Expected %s\n",
                       pattern[i] == KNOCK_SHORT ? "SHORT" : "LONG");
                correct = false;
                break;
            }

            printf("Correct! ");
            sleep_ms(300);                  // Small pause between knocks
        }

        if (correct) {                      // All knocks matched!
            printf("\n*** CORRECT! Well done! ***\n");
            play_win();                     // Victory sound!
            score++;                        // Add to score
            if (level < MAX_PATTERN) level++;  // Increase difficulty!
            printf("Score: %d\n\n", score);
        } else {
            printf("\n*** WRONG! Try again! ***\n");
            play_fail();                    // Fail sound
            printf("Score: %d\n\n", score);
            // Level stays the same — try again!
        }

        sleep_ms(1500);                     // Pause before next round
    }

    return 0;
}
```

## 🔍 How It Works

1. The vibration sensor has a tiny spring inside that bounces when you knock
2. Bouncing = electrical signal on OUT pin goes LOW
3. The Pico measures how long each knock lasts (short = quick tap, long = held tap)
4. The game generates a random pattern and plays it as beeps
5. You knock back the pattern and the Pico checks if you got it right!

## 🎮 Try It!

- Start at Level 1 (just 1 knock) to get the feel for it
- Place the sensor on a hollow cardboard box for better vibration pickup
- Try tapping the surface gently vs. firmly — find the sweet spot
- Challenge a friend: take turns trying to beat each other's high score!

## 🏆 Challenge

Add a "Simon Says" visual mode! Instead of (or as well as) beeps, light up LEDs in a pattern. Green for short, red for long. The player knocks back the visual pattern. Add a high score that saves and compares across rounds — track it using a simple variable!

## 📝 What You Built

You built a complete knock pattern memory game using a vibration sensor — like a physical version of Simon Says! You learned how vibration sensors work, how to generate and compare patterns, and how to build a full game loop with levels, scoring, and feedback sounds.
