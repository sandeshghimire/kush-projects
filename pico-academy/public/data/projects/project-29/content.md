# Project 29: Whisper Challenge — Shhh! Silence is Golden!

## 🎯 What You'll Learn
- How a sensitive microphone detects very quiet sounds
- How to create a countdown timer and scoring game
- How to use LEDs to give visual feedback
- How to build interactive games with the Pico

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Small Microphone Module | $2.00 |
| Green LED | $0.10 |
| Red LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Active Buzzer | $1.00 |
| Push Button | $0.50 |
| 10kΩ Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$14.00** |

## 🌟 The Story

This is the sneakiest game you will ever play! The rules are simple: stay completely silent for 10 whole seconds and you win. Any noise — even breathing too hard — and you lose! The small microphone can hear even the tiniest sounds, so you have to be like a ghost: totally, completely, perfectly quiet.

Your score increases by one every time you complete a 10-second silence. Can you beat your high score? Can you sit so still that not even a whisper escapes? The LED goes green when you are doing well and red the instant it hears a sound. Try it with your friends — who can get the highest score?

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Small Mic Module VCC | Pico 3.3V | Power |
| Small Mic Module GND | Pico GND | Ground |
| Small Mic Module AO | Pico GP26 (ADC0) | Analog output |
| Green LED long leg | Pico GP13 via 220Ω | "Quiet — keep going!" |
| Green LED short leg | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | "TOO LOUD!" |
| Red LED short leg | Pico GND | Ground |
| Buzzer + pin | Pico GP15 | Game sounds |
| Buzzer - pin | Pico GND | Ground |
| Button one leg | Pico GP10 | Start game button |
| Button other leg | Pico GND | Ground |
| 10kΩ resistor | GP10 to 3.3V | Pull-up |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // For reading microphone
#include <stdio.h>          // For printf

// Pin definitions
#define MIC_PIN       26    // Small microphone analog output
#define ADC_INPUT      0    // ADC channel 0
#define GREEN_LED     13    // "Quiet" indicator
#define RED_LED       14    // "Too loud!" indicator
#define BUZZER_PIN    15    // Game sound buzzer
#define BUTTON_PIN    10    // Start button

// Game settings
#define SILENCE_TIME     10000   // Must stay quiet for 10 seconds (ms)
#define SILENCE_THRESH     200   // Peak-to-peak below this = silent
#define SAMPLE_COUNT        30   // Samples to measure peak-to-peak

// Score tracking
int high_score = 0;              // Best score this session
int current_score = 0;           // Current score

// Measure sound level (peak-to-peak, like in project 28)
uint16_t measure_sound() {
    uint16_t peak_high = 0;              // Highest value
    uint16_t peak_low = 4095;            // Lowest value

    for (int i = 0; i < SAMPLE_COUNT; i++) {
        uint16_t s = adc_read();         // Read microphone
        if (s > peak_high) peak_high = s;
        if (s < peak_low)  peak_low  = s;
    }

    return peak_high - peak_low;         // Return the swing
}

// Check if button is pressed
bool button_pressed() {
    if (gpio_get(BUTTON_PIN) == 0) {     // LOW = pressed (pull-up)
        sleep_ms(50);                    // Debounce
        if (gpio_get(BUTTON_PIN) == 0) {
            while (gpio_get(BUTTON_PIN) == 0) sleep_ms(10);  // Wait release
            return true;
        }
    }
    return false;
}

// Short buzzer beep
void beep(int ms) {
    gpio_put(BUZZER_PIN, 1);
    sleep_ms(ms);
    gpio_put(BUZZER_PIN, 0);
    sleep_ms(50);
}

// Victory sound!
void play_win_sound() {
    beep(100);
    beep(100);
    beep(200);
    beep(300);
}

// Fail sound
void play_fail_sound() {
    gpio_put(BUZZER_PIN, 1);
    sleep_ms(500);
    gpio_put(BUZZER_PIN, 0);
}

// Countdown beeps before game starts (3... 2... 1... GO!)
void countdown() {
    printf("Get ready...\n");
    for (int i = 3; i > 0; i--) {
        printf("%d...\n", i);
        beep(100);
        sleep_ms(800);              // Pause between counts
    }
    printf("GO! Stay quiet!\n");
    beep(50);                       // Short start beep
    beep(50);
}

// Show score on LEDs with flashes
void flash_score(int score) {
    printf("Score: %d (High score: %d)\n\n", score, high_score);
    for (int i = 0; i < score && i < 10; i++) {  // Flash up to 10 times
        gpio_put(GREEN_LED, 1);
        sleep_ms(150);
        gpio_put(GREEN_LED, 0);
        sleep_ms(100);
    }
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up ADC for microphone
    adc_init();
    adc_gpio_init(MIC_PIN);
    adc_select_input(ADC_INPUT);

    // Set up output pins
    gpio_init(GREEN_LED);
    gpio_set_dir(GREEN_LED, GPIO_OUT);
    gpio_put(GREEN_LED, 0);

    gpio_init(RED_LED);
    gpio_set_dir(RED_LED, GPIO_OUT);
    gpio_put(RED_LED, 0);

    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // Set up button
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    printf("=== WHISPER CHALLENGE ===\n");
    printf("Stay silent for %d seconds to score!\n", SILENCE_TIME / 1000);
    printf("Press button to start.\n\n");

    // Idle animation — gently blink green
    while (true) {                          // Main game loop

        // Wait for button press to start
        gpio_put(GREEN_LED, 1);
        sleep_ms(500);
        gpio_put(GREEN_LED, 0);
        sleep_ms(500);

        if (!button_pressed()) continue;    // Keep waiting

        // Game starts!
        countdown();                        // 3... 2... 1... GO!

        uint32_t start_time = to_ms_since_boot(get_absolute_time());
        bool game_over = false;

        gpio_put(GREEN_LED, 1);             // Green = go, stay quiet!
        gpio_put(RED_LED, 0);

        while (!game_over) {
            uint32_t now = to_ms_since_boot(get_absolute_time());
            uint32_t elapsed = now - start_time;   // How long so far

            // Check if we won!
            if (elapsed >= SILENCE_TIME) {
                printf("*** YOU WIN! Perfect silence! ***\n");
                current_score++;                    // Add to score!
                if (current_score > high_score) {
                    high_score = current_score;     // New high score!
                    printf("*** NEW HIGH SCORE: %d ***\n", high_score);
                }
                gpio_put(GREEN_LED, 0);
                play_win_sound();                   // Play victory music!
                flash_score(current_score);         // Flash score on LEDs
                game_over = true;
                break;
            }

            // Check sound level
            uint16_t noise = measure_sound();

            if (noise >= SILENCE_THRESH) {          // TOO LOUD!
                printf("NOISE DETECTED! Level: %d  You lose!\n", noise);
                gpio_put(GREEN_LED, 0);
                gpio_put(RED_LED, 1);               // Red = fail!
                play_fail_sound();                  // Sad sound
                sleep_ms(1000);
                gpio_put(RED_LED, 0);
                current_score = 0;                  // Reset score streak!
                printf("Score reset to 0. Try again!\n\n");
                game_over = true;
            } else {
                // Show remaining time
                uint32_t remaining = (SILENCE_TIME - elapsed) / 1000;
                printf("Staying quiet... %d seconds left\n", (int)remaining);
            }

            sleep_ms(200);              // Check 5 times per second
        }

        printf("Press button to play again!\n\n");
    }

    return 0;
}
```

## 🔍 How It Works

1. The small microphone is very sensitive — it picks up even tiny sounds
2. The Pico samples the signal rapidly and measures peak-to-peak (the swing)
3. When it is quiet, the swing is very small (below the threshold)
4. If the swing goes above the threshold, that means sound was detected
5. You need 10 consecutive seconds below the threshold to win and score a point!

## 🎮 Try It!

- Try to get a score of 5 — can you stay quiet for 10 seconds five times in a row?
- Challenge a friend: take turns and compare high scores
- Try adjusting `SILENCE_THRESH` lower to make it even harder
- Increase `SILENCE_TIME` to 20 seconds for extreme difficulty!

## 🏆 Challenge

Add levels! Level 1 is 10 seconds of silence. Level 2 is 15 seconds. Level 3 is 20 seconds. Each time you win, it automatically bumps up the difficulty. Print the current level on the serial monitor. Can you reach Level 10?

## 📝 What You Built

You built a fun and sneaky silence challenge game using a sensitive microphone and a scoring system! You learned about analog sound detection, game loops with timers, scoring systems, and how to build interactive electronics games with the Pico.
