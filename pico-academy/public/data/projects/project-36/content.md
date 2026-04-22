# Project 36: Laser Light Show — Beams of Light Everywhere!

## 🎯 What You'll Learn
- How laser modules work and produce focused beams
- How to blink a laser in musical patterns using PWM timing
- How to create visual patterns synced to music
- Laser safety rules — really important!

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Laser Module (red, low power — 5mW) | $2.00 |
| Passive Buzzer Module | $1.50 |
| Push Button x2 | $1.00 |
| 10kΩ Resistors x2 | $0.20 |
| Small mirror (or shiny spoon!) | $0.50 |
| Dark cardboard for target | $0.50 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$15.70** |

## ⚠️ LASER SAFETY — READ THIS FIRST!

**NEVER point the laser at anyone's eyes — not even for a second!**
**NEVER look directly into the laser beam!**
**Always point the laser at a wall or flat surface.**
**Ask a grown-up to help you set this up safely.**

Laser light is very focused and can hurt your eyes instantly. Keep the beam pointed at a dark piece of cardboard on a wall. Stay safe — then have fun!

## 🌟 The Story

Have you ever seen a laser light show at a concert? Bright beams slice through the smoky air, dancing to the music. Professional laser shows use computer-controlled mirrors to bounce beams in all directions. The effect is absolutely breathtaking!

Your version is a mini laser show! The Pico blinks the laser in rhythmic patterns while the passive buzzer plays a tune. Each musical note gets a different blink pattern. Bounce the beam off a small mirror onto a wall and move the mirror by hand to create sweeping patterns. It is like being the world's coolest DJ and lighting engineer at the same time!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Laser Module S (signal) pin | Pico GP16 | Laser control |
| Laser Module + pin | Pico 3.3V | Power |
| Laser Module - pin | Pico GND | Ground |
| Passive Buzzer S pin | Pico GP17 | Music buzzer (PWM) |
| Passive Buzzer + | Pico 3.3V | Power |
| Passive Buzzer - | Pico GND | Ground |
| Mode Button leg 1 | Pico GP10 | Change light pattern |
| Mode Button leg 2 | Pico GND | Ground |
| Play Button leg 1 | Pico GP11 | Start/stop show |
| Play Button leg 2 | Pico GND | Ground |
| 10kΩ resistors | GP10 to 3.3V, GP11 to 3.3V | Pull-ups |

## 💻 The Code

```c
#include "pico/stdlib.h"        // Always include this first!
#include "hardware/pwm.h"       // For buzzer music
#include "hardware/clocks.h"    // For clock frequency
#include <stdio.h>              // For printf

// Pin definitions
#define LASER_PIN   16          // Laser module control
#define BUZZER_PIN  17          // Passive buzzer (PWM)
#define MODE_BTN    10          // Change pattern mode
#define PLAY_BTN    11          // Start/stop show

// Musical note frequencies (Hz)
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523
#define REST       0

// Show state
bool show_playing = false;      // Is the show active?
int current_mode = 0;           // Which blink pattern (0-3)
int num_modes = 4;              // Number of available modes

// -- LASER CONTROL --
// Turn laser on
void laser_on() {
    gpio_put(LASER_PIN, 1);     // HIGH = laser fires!
}

// Turn laser off
void laser_off() {
    gpio_put(LASER_PIN, 0);     // LOW = laser off
}

// Blink laser in a pattern for a given duration
// pattern: 0=solid on, 1=rapid blink, 2=slow blink, 3=pulse burst
void laser_pattern(int mode, int duration_ms) {
    int elapsed = 0;            // Track time used
    while (elapsed < duration_ms) {          // Run until time is up
        switch (mode) {
            case 0:                          // SOLID ON
                laser_on();
                sleep_ms(10);
                elapsed += 10;
                break;

            case 1:                          // RAPID BLINK (disco!)
                laser_on();
                sleep_ms(30);
                laser_off();
                sleep_ms(30);
                elapsed += 60;
                break;

            case 2:                          // SLOW PULSE
                laser_on();
                sleep_ms(100);
                laser_off();
                sleep_ms(100);
                elapsed += 200;
                break;

            case 3:                          // BURST (3 quick + pause)
                for (int i = 0; i < 3; i++) {
                    laser_on();
                    sleep_ms(40);
                    laser_off();
                    sleep_ms(40);
                }
                sleep_ms(120);               // Pause between bursts
                elapsed += 360;
                break;

            default:
                laser_off();
                sleep_ms(10);
                elapsed += 10;
        }
    }
    laser_off();                             // Always end with laser off
}

// -- BUZZER MUSIC (PWM) --
void play_note_with_laser(int freq, int duration_ms, int laser_mode) {
    if (freq == REST) {                      // Silence
        laser_off();                         // Laser off during silence
        gpio_init(BUZZER_PIN);
        gpio_set_dir(BUZZER_PIN, GPIO_OUT);
        gpio_put(BUZZER_PIN, 0);
        sleep_ms(duration_ms);
        return;
    }

    // Set up PWM for the note
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint channel = pwm_gpio_to_channel(BUZZER_PIN);
    uint32_t clock = clock_get_hz(clk_sys);
    uint32_t wrap = clock / freq;
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, channel, wrap / 3);   // 33% duty
    pwm_set_enabled(slice, true);

    // Run laser pattern while note plays
    laser_pattern(laser_mode, duration_ms);

    pwm_set_enabled(slice, false);           // Stop note
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);
}

// Play the full light show!
void play_laser_show(int mode) {
    printf("Starting laser show (mode %d)!\n", mode);

    // Song: "Twinkle Twinkle" with laser patterns
    int notes[] =     {NOTE_C4, NOTE_C4, NOTE_G4, NOTE_G4,
                       NOTE_A4, NOTE_A4, NOTE_G4, REST,
                       NOTE_F4, NOTE_F4, NOTE_E4, NOTE_E4,
                       NOTE_D4, NOTE_D4, NOTE_C4, REST};
    int durations[] = {300, 300, 300, 300,
                       300, 300, 500, 150,
                       300, 300, 300, 300,
                       300, 300, 500, 200};
    int num_notes = 16;

    for (int i = 0; i < num_notes; i++) {
        if (!show_playing) break;            // Stop if show cancelled
        play_note_with_laser(notes[i], durations[i], mode);
    }

    laser_off();                             // Safety: laser off at end
    printf("Show finished!\n");
}

// Check a button (debounced)
bool check_button(uint pin) {
    if (gpio_get(pin) == 0) {
        sleep_ms(40);
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

    // Set up laser pin
    gpio_init(LASER_PIN);
    gpio_set_dir(LASER_PIN, GPIO_OUT);
    gpio_put(LASER_PIN, 0);         // Laser OFF by default — SAFETY!

    // Set up buzzer
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // Set up buttons
    gpio_init(MODE_BTN); gpio_set_dir(MODE_BTN, GPIO_IN); gpio_pull_up(MODE_BTN);
    gpio_init(PLAY_BTN); gpio_set_dir(PLAY_BTN, GPIO_IN); gpio_pull_up(PLAY_BTN);

    printf("=== LASER LIGHT SHOW ===\n");
    printf("SAFETY: Never point laser at eyes!\n");
    printf("Point at a dark wall or cardboard target.\n\n");
    printf("PLAY button: Start/stop show\n");
    printf("MODE button: Change laser pattern (0-%d)\n\n", num_modes - 1);

    while (true) {                  // Main loop

        // Check MODE button
        if (check_button(MODE_BTN)) {
            current_mode = (current_mode + 1) % num_modes;   // Cycle modes
            printf("Mode changed to: %d\n", current_mode);
            // Flash laser briefly to preview mode
            laser_pattern(current_mode, 400);
        }

        // Check PLAY button
        if (check_button(PLAY_BTN)) {
            show_playing = !show_playing;     // Toggle show
            if (show_playing) {
                printf("Show starting in mode %d!\n", current_mode);
                play_laser_show(current_mode);
                show_playing = false;          // Reset after show ends
            } else {
                printf("Show stopped.\n");
                laser_off();                   // Safety: off immediately
            }
        }

        // Idle: gentle slow blink so you can see the laser is aimed correctly
        laser_on();
        sleep_ms(200);
        laser_off();
        sleep_ms(800);
    }

    return 0;
}
```

## 🔍 How It Works

1. The laser module contains a focused laser diode that produces a bright red beam
2. The Pico turns the laser on and off rapidly to create visual blink patterns
3. Different patterns (solid, rapid, slow, burst) create different visual effects on the wall
4. The passive buzzer plays music using PWM at the same time
5. The laser patterns are synced to notes — each note gets a specific blink style!

## 🎮 Try It!

- Aim the laser at a wall and press Play — watch the patterns!
- Try all 4 modes with the mode button and find your favourite
- Hold a small mirror at an angle to bounce the beam in a new direction
- Hang the beam through a glass of water to see it scatter!

## 🏆 Challenge

Add a potentiometer (or use a rotary encoder from Project 33) to control the laser blink speed in real time. Turn it one way for faster blinking, the other way for slower. Now you can be a live laser show DJ, adjusting the effects as the music plays!

## 📝 What You Built

You built a laser light show with music — syncing a laser module to musical notes from a passive buzzer! You learned about laser safety, pattern programming, PWM music, and how professional light shows synchronise visual effects to audio. Remember: keep those beams away from eyes!
