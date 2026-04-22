# Passive Buzzer Module — Playing Melodies with PWM

## 🎯 What you'll learn
- The difference between the active buzzer (Lesson 4) and the passive buzzer
- How PWM frequency controls musical pitch
- How to write a `play_tone()` helper function
- How to play "Twinkle Twinkle Little Star" on the Pico
- How to trigger a melody with the button from Lesson 3

## 🛒 Parts you'll need
- Raspberry Pi Pico 2 W (~$6)
- Elegoo 37 Sensor Kit — **Passive Buzzer Module** (~$1, included in kit)
- Elegoo 37 Sensor Kit — **Button Switch Module** (from Lesson 3, included in kit)
- 6× jumper wires (~$0.60)

## 🌟 Background

In Lesson 4 you used the **Active Buzzer**. It was easy — just turn it on and it buzzes. But it only plays one fixed note. What if you want to play a melody? What if you want MUSIC? That is where the **Passive Buzzer Module** comes in!

A passive buzzer is basically a tiny speaker that moves back and forth when electricity pulses through it. To make it move, YOU have to send it a rapidly flickering signal — on, off, on, off — over and over. The faster the flickering, the higher the pitch. Slow flickering makes low notes. Fast flickering makes high notes. The number of on-off cycles per second is called the **frequency**, measured in Hertz (Hz). The musical note A4 (the A above middle C on a piano) vibrates at exactly 440 Hz — 440 times per second!

Think of it this way: the **active buzzer** is like a toy that plays one note when you squeeze it. The **passive buzzer** is like a real musical instrument — you have to control it properly to make music, but you can play *any* note you want! We control the passive buzzer using **PWM** — the same trick from Lesson 2. We set the PWM speed to match a musical note's frequency, set it to 50% on/off time, and the buzzer vibrates at exactly that pitch.

Here is a quick reference table of musical notes and their frequencies:

| Note | Frequency |
|------|-----------|
| C4 (Middle C) | 262 Hz |
| D4 | 294 Hz |
| E4 | 330 Hz |
| F4 | 349 Hz |
| G4 | 392 Hz |
| A4 | 440 Hz |
| B4 | 494 Hz |
| C5 | 523 Hz |
| D5 | 587 Hz |
| E5 | 659 Hz |

## 🔌 Wiring

| Pico Pin | Passive Buzzer Module Pin |
|----------|---------------------------|
| GP18 | S (Signal) |
| 3V3 | VCC |
| GND | GND |

**Also connect the Button Switch Module:**

| Pico Pin | Button Switch Module Pin |
|----------|--------------------------|
| GP14 | S (Signal) |
| 3V3 | VCC |
| GND | GND |

GP18 is PWM-capable, which is essential for controlling pitch. Connect both modules to the same 3V3 and GND rails on your breadboard to keep wiring neat.

## 💻 The code

```c
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include <stdbool.h>

// -----------------------------------------------
// Lesson 5: Passive Buzzer Module — Play Melodies!
// "Twinkle Twinkle Little Star" with a button trigger
// -----------------------------------------------

#define BUZZER_PIN  18    // S pin of Passive Buzzer Module (must be PWM-capable)
#define BUTTON_PIN  14    // S pin of Button Switch Module

// System clock speed (125 MHz on Pico 2 W)
#define SYS_CLOCK_HZ  125000000UL

// =============================================
// Note frequency table (in Hz)
// =============================================
#define NOTE_C4   262
#define NOTE_D4   294
#define NOTE_E4   330
#define NOTE_F4   349
#define NOTE_G4   392
#define NOTE_A4   440
#define NOTE_B4   494
#define NOTE_C5   523
#define NOTE_D5   587
#define NOTE_E5   659
#define NOTE_REST   0    // Silence — take a breath!

// =============================================
// play_tone: Make the passive buzzer sing a note!
// pin        = which GPIO pin the buzzer is on
// freq_hz    = the frequency of the note (0 = rest/silence)
// duration_ms = how long to hold the note
// =============================================
void play_tone(uint pin, uint freq_hz, uint duration_ms) {

    if (freq_hz == 0) {
        // A REST — just stay quiet for the right amount of time
        sleep_ms(duration_ms);
        return;
    }

    // Switch the pin to PWM mode so hardware drives the buzzer
    gpio_set_function(pin, GPIO_FUNC_PWM);

    uint slice   = pwm_gpio_to_slice_num(pin);   // Find our PWM slice
    uint channel = pwm_gpio_to_channel(pin);      // And our channel within that slice

    // The clock divider slows down the 125MHz system clock
    // We use 8.0 here to get a manageable counting range for low frequencies
    float clk_div = 8.0f;

    // wrap = how high to count before resetting
    // Formula: wrap = (clock_speed / divider / frequency) - 1
    uint32_t wrap = (uint32_t)((float)SYS_CLOCK_HZ / clk_div / (float)freq_hz) - 1;

    pwm_set_clkdiv(slice, clk_div);            // Set clock divider
    pwm_set_wrap(slice, wrap);                 // Set counter top (sets the frequency)
    pwm_set_chan_level(slice, channel, wrap / 2);  // 50% duty cycle = nice clean square wave
    pwm_set_enabled(slice, true);              // GO! Make that buzzer sing!

    sleep_ms(duration_ms);                     // Hold the note for the right length

    // Stop the buzzer cleanly between notes
    pwm_set_enabled(slice, false);
    gpio_set_function(pin, GPIO_FUNC_SIO);     // Switch back to plain GPIO
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0);                          // Make sure it's low (silent)
}

// =============================================
// Twinkle Twinkle Little Star
// Each note has a frequency and a duration in ms.
// 300ms = a short note, 600ms = a long note.
// 50ms gap between notes keeps them from blurring together.
// =============================================
void play_twinkle(void) {
    // "Twin-kle  twin-kle  lit-tle  star"
    play_tone(BUZZER_PIN, NOTE_C4, 300);  // Twin-
    play_tone(BUZZER_PIN, NOTE_C4, 300);  // -kle
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // twin-
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // -kle
    play_tone(BUZZER_PIN, NOTE_A4, 300);  // lit-
    play_tone(BUZZER_PIN, NOTE_A4, 300);  // -tle
    play_tone(BUZZER_PIN, NOTE_G4, 600);  // star!
    sleep_ms(100);

    // "How I  won-der  what you  are"
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // How
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // I
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // won-
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // -der
    play_tone(BUZZER_PIN, NOTE_D4, 300);  // what
    play_tone(BUZZER_PIN, NOTE_D4, 300);  // you
    play_tone(BUZZER_PIN, NOTE_C4, 600);  // are!
    sleep_ms(100);

    // "Up a-bove the  world so  high"
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // Up
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // a-
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // -bove
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // the
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // world
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // so
    play_tone(BUZZER_PIN, NOTE_D4, 600);  // high!
    sleep_ms(100);

    // "Like a  dia-mond  in the  sky"
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // Like
    play_tone(BUZZER_PIN, NOTE_G4, 300);  // a
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // dia-
    play_tone(BUZZER_PIN, NOTE_F4, 300);  // -mond
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // in
    play_tone(BUZZER_PIN, NOTE_E4, 300);  // the
    play_tone(BUZZER_PIN, NOTE_D4, 600);  // sky!
    sleep_ms(100);

    // "Twin-kle  twin-kle  lit-tle  star" (repeat of line 1)
    play_tone(BUZZER_PIN, NOTE_C4, 300);
    play_tone(BUZZER_PIN, NOTE_C4, 300);
    play_tone(BUZZER_PIN, NOTE_G4, 300);
    play_tone(BUZZER_PIN, NOTE_G4, 300);
    play_tone(BUZZER_PIN, NOTE_A4, 300);
    play_tone(BUZZER_PIN, NOTE_A4, 300);
    play_tone(BUZZER_PIN, NOTE_G4, 600);
    sleep_ms(100);

    // "How I  won-der  what you  are!"
    play_tone(BUZZER_PIN, NOTE_F4, 300);
    play_tone(BUZZER_PIN, NOTE_F4, 300);
    play_tone(BUZZER_PIN, NOTE_E4, 300);
    play_tone(BUZZER_PIN, NOTE_E4, 300);
    play_tone(BUZZER_PIN, NOTE_D4, 300);
    play_tone(BUZZER_PIN, NOTE_D4, 300);
    play_tone(BUZZER_PIN, NOTE_C4, 900);  // Big long finish!
    sleep_ms(500);
}

// =============================================
// A quick rising scale to say "I'm ready!"
// =============================================
void startup_chime(void) {
    play_tone(BUZZER_PIN, NOTE_C4, 120);
    play_tone(BUZZER_PIN, NOTE_E4, 120);
    play_tone(BUZZER_PIN, NOTE_G4, 120);
    play_tone(BUZZER_PIN, NOTE_C5, 250);
    sleep_ms(300);
}

int main() {
    // Set up the button as input (module has built-in pull-down)
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    // The buzzer pin starts as a normal GPIO output (play_tone will change it to PWM)
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);    // Start silent

    // Play a happy little startup chime so you know it's working
    startup_chime();

    bool last_button = false;

    while (true) {
        bool current_button = gpio_get(BUTTON_PIN);

        // Rising edge: button just got pressed — play the song!
        if (!last_button && current_button) {
            sleep_ms(20);                          // Debounce
            current_button = gpio_get(BUTTON_PIN);

            if (current_button) {
                play_twinkle();    // Let's make some music!
            }
        }

        last_button = current_button;
        sleep_ms(1);
    }

    return 0;
}
```

## 🔍 How the code works

1. **`gpio_set_function(pin, GPIO_FUNC_PWM)`** — Switches the pin into PWM mode so the hardware can flicker it at exactly the right speed for our note. This is the key difference from Lesson 4 — we need PWM to control pitch!
2. **`pwm_set_clkdiv(slice, 8.0f)`** — The Pico's clock runs at 125,000,000 Hz, which is too fast to count directly for musical notes. Dividing by 8 slows the internal counter down to a manageable speed.
3. **`wrap = (SYS_CLOCK_HZ / clk_div / freq_hz) - 1`** — This formula calculates how high the counter should count before resetting. A smaller wrap = the counter resets more often = higher note. It is like figuring out how fast to spin a wheel to make a certain sound!
4. **`pwm_set_chan_level(slice, channel, wrap / 2)`** — Sets the on/off time to 50% (half of wrap). This makes a square wave, which is the cleanest-sounding wave for a buzzer.
5. **`pwm_set_enabled(slice, false)` at the end of `play_tone()`** — Always stop the PWM between notes, then set the pin LOW. If you skip this, the buzzer keeps buzzing while you are waiting for the next note — no silence between notes means mushy-sounding music!
6. **`play_twinkle()`** — Calls `play_tone()` once for each note of the song, with the correct frequency and duration. The comments next to each call show which syllable of the lyrics that note carries — a great way to keep your place in the music!

## 🚀 Try it

1. **Change the tempo** — Change all the `300` duration values to `200` for a faster, upbeat version, or `400` for a slow, dramatic one. Does it still sound like the same song?
2. **Play a scale** — Write a function `play_scale()` that plays C4, D4, E4, F4, G4, A4, B4, C5 in order, holding each for 300ms. Then play it forwards and backwards in a loop.
3. **Volume trick** — Try changing `wrap / 2` (50% duty) to `wrap / 4` (25% duty) in `play_tone()`. The buzzer will sound quieter! Experiment with different values and hear the difference.
4. **Happy Birthday** — Look up the notes for "Happy Birthday to You" and add a `play_happy_birthday()` function. Here is a hint to get you started: it begins C4, C4, D4, C4, F4, E4...

## 🏆 Challenge

Build a **mini piano** using the **Joystick Module** from your Elegoo kit! The joystick has two analog axes (X and Y) and a button. Connect the joystick's VRX pin to GP26 (ADC channel 0) and VRY to GP27 (ADC channel 1). Add `#include "hardware/adc.h"` to your code. Read the X-axis value (0–4095) and map it to one of eight notes: 0–511 plays C4, 512–1023 plays D4, 1024–1535 plays E4, and so on up to C5. Hold that note for as long as the joystick is pushed in that direction. Release the joystick to center (around 2048) and the music stops. Push the joystick button to play the whole Twinkle Twinkle tune as a reward! It will not be a perfect piano, but it will be YOUR piano — and that is way cooler.

## ✅ Summary

The Passive Buzzer Module needs YOU to generate the sound signal using PWM — which means you control the pitch by setting the PWM frequency to match the musical note you want. Using `pwm_set_clkdiv()`, `pwm_set_wrap()`, and `pwm_set_chan_level()` together lets you calculate the exact settings for any musical note. With a `play_tone()` helper function and a table of note frequencies, playing melodies becomes as simple as listing notes one after another — and you have just programmed your Pico to play "Twinkle Twinkle Little Star"!
