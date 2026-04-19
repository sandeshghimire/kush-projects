# Buzzer & Sound Effects

## What you'll learn
- How a passive buzzer turns electrical signals into sound
- How to use PWM to generate specific musical frequencies
- How to play melodies by sequencing notes with timing
- How sound feedback makes a robot more interactive and fun
- The relationship between frequency (Hz) and musical pitch

## Parts you'll need
- Passive buzzer (~$2)

## Background

Have you ever noticed that robots in movies always make beeps and boops? There's a good reason — sound tells you what's happening even when you're not looking. A beep when the robot starts up says "I'm ready!" A quick buzz when it detects an obstacle says "Watch out!" Our passive buzzer will give our robot a voice.

A **passive buzzer** is different from an active buzzer. An active buzzer has its own built-in tone generator — you just give it power and it makes one fixed sound. A passive buzzer is like a tiny speaker — YOU control what sound it makes by vibrating it at different speeds. Send it a 440 Hz signal and you get the note A. Send 523 Hz and you get C. The Pico's PWM hardware makes this super easy!

**PWM** stands for Pulse Width Modulation. For the buzzer, we use it to flip a pin on and off at a specific frequency. If we flip it 440 times per second, the buzzer vibrates 440 times per second, and we hear the musical note A4. Higher frequency = higher pitch, lower frequency = lower pitch. It's exactly how a guitar string works — a tighter string vibrates faster and sounds higher.

We'll create sound effects for four events: a happy startup jingle, a warning beep for obstacles, a completion fanfare, and a simple melody. Your robot will finally have a personality!

## Wiring

| Buzzer Pin | Pico 2 Pin | Notes |
|------------|------------|-------|
| + (Signal) | GP13 (pin 17) | PWM output |
| - (Ground) | GND (pin 18)  | Ground |

> **Tip:** If your buzzer has three pins, connect VCC to 3V3, GND to GND, and Signal to GP13.

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

#define BUZZER_PIN 13

// Musical note frequencies (Hz)
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523
#define NOTE_D5  587
#define NOTE_E5  659
#define NOTE_G5  784
#define NOTE_REST 0

static uint buzzer_slice;

// Play a tone at a given frequency for a duration (ms)
void play_tone(uint freq, uint duration_ms) {
    if (freq == 0) {
        // Rest — silence
        pwm_set_gpio_level(BUZZER_PIN, 0);
        sleep_ms(duration_ms);
        return;
    }

    // Calculate PWM wrap value for desired frequency
    // PWM freq = sys_clk / (wrap + 1) / divider
    uint32_t sys_clk = clock_get_hz(clk_sys);
    uint32_t wrap = sys_clk / freq - 1;

    // Use a clock divider if wrap is too large (>65535)
    float divider = 1.0f;
    while (wrap > 65535) {
        divider *= 2.0f;
        wrap = (uint32_t)(sys_clk / (freq * divider)) - 1;
    }

    pwm_set_clkdiv(buzzer_slice, divider);
    pwm_set_wrap(buzzer_slice, wrap);
    pwm_set_gpio_level(BUZZER_PIN, wrap / 2);  // 50% duty = loudest

    sleep_ms(duration_ms);

    // Brief silence between notes to separate them
    pwm_set_gpio_level(BUZZER_PIN, 0);
    sleep_ms(20);
}

// --- Sound effects ---

// Happy startup jingle: ascending notes
void sfx_startup(void) {
    printf("SFX: Startup jingle\n");
    play_tone(NOTE_C4, 100);
    play_tone(NOTE_E4, 100);
    play_tone(NOTE_G4, 100);
    play_tone(NOTE_C5, 200);
}

// Warning beep: two quick high tones
void sfx_obstacle(void) {
    printf("SFX: Obstacle warning\n");
    play_tone(NOTE_E5, 80);
    play_tone(NOTE_REST, 50);
    play_tone(NOTE_E5, 80);
}

// Completion fanfare: triumphant ascending pattern
void sfx_complete(void) {
    printf("SFX: Mission complete!\n");
    play_tone(NOTE_G4, 150);
    play_tone(NOTE_C5, 150);
    play_tone(NOTE_E5, 150);
    play_tone(NOTE_G5, 300);
}

// Error/failure sound: descending tones
void sfx_error(void) {
    printf("SFX: Error\n");
    play_tone(NOTE_E4, 200);
    play_tone(NOTE_C4, 400);
}

// Simple melody: "Twinkle Twinkle Little Star" (first line)
void play_melody(void) {
    printf("Playing melody...\n");
    uint notes[] = {
        NOTE_C4, NOTE_C4, NOTE_G4, NOTE_G4,
        NOTE_A4, NOTE_A4, NOTE_G4, NOTE_REST,
        NOTE_F4, NOTE_F4, NOTE_E4, NOTE_E4,
        NOTE_D4, NOTE_D4, NOTE_C4, NOTE_REST
    };
    uint durations[] = {
        250, 250, 250, 250,
        250, 250, 500, 250,
        250, 250, 250, 250,
        250, 250, 500, 250
    };
    int count = sizeof(notes) / sizeof(notes[0]);

    for (int i = 0; i < count; i++) {
        play_tone(notes[i], durations[i]);
    }
}

// Mode change confirmation beep
void sfx_mode_change(void) {
    play_tone(NOTE_C5, 50);
    play_tone(NOTE_E5, 50);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Set up PWM on buzzer pin
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    buzzer_slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    pwm_set_enabled(buzzer_slice, true);

    printf("Buzzer ready on GP%d\n", BUZZER_PIN);

    // Play startup sound
    sfx_startup();
    sleep_ms(1000);

    // Demo all sound effects
    printf("\nPlaying obstacle warning:\n");
    sfx_obstacle();
    sleep_ms(1000);

    printf("\nPlaying completion fanfare:\n");
    sfx_complete();
    sleep_ms(1000);

    printf("\nPlaying error sound:\n");
    sfx_error();
    sleep_ms(1000);

    printf("\nPlaying mode change beep:\n");
    sfx_mode_change();
    sleep_ms(1000);

    printf("\nPlaying melody:\n");
    play_melody();
    sleep_ms(1000);

    // Loop: repeat startup jingle
    while (true) {
        printf("\nRepeating startup jingle...\n");
        sfx_startup();
        sleep_ms(3000);
    }

    return 0;
}
```

## Try it
- Compose your own startup jingle — pick your favorite 4-6 notes
- Change `sfx_obstacle` to sound more urgent (higher pitch, faster repeats)
- Make a siren effect by sweeping from a low frequency to a high frequency in a loop
- Play "Happy Birthday" or another song you know by looking up the note frequencies

## Challenge

Create a **Morse code** function: `void play_morse(const char *text)` that beeps each letter as dots and dashes. A dot is a short beep (100 ms), a dash is a long beep (300 ms). Put a short pause between symbols and a longer pause between letters. Try it with your name!

## Summary

A passive buzzer with PWM gives our robot a voice. By changing the PWM frequency, we can play any musical note. We created sound effects for different events — startup, obstacles, completion, and errors. Sound is a powerful feedback channel because you can hear it without looking at the robot. Now our robot beeps happily when it starts up and warns us when something's wrong.

## How this fits the robot

Sound effects plug into every part of the robot. The startup jingle plays when the robot powers on. The obstacle warning pairs with the ultrasonic sensor from earlier projects. The completion fanfare celebrates finished missions. When the state machine (Project 16) changes modes, the mode-change beep confirms the switch. It's the easiest way to know what your robot is doing from across the room.
