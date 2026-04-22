# Musical Doorbell — Press for a Tune!

## 🎯 What You'll Learn
- How to read a digital push button with debouncing
- How to make musical tones with PWM on the passive buzzer
- How to store and play a melody using arrays of notes and durations
- How to sync LED color changes to music beats
- How musical notes are just specific frequencies in hertz

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W — the brain of your doorbell (~$6.00)
- Button Switch Module (from Elegoo 37 Sensor Kit) — the doorbell button (~$0.50)
- Passive Buzzer Module (from Elegoo 37 Sensor Kit) — plays real melodies (~$0.50)
- RGB LED Module (from Elegoo 37 Sensor Kit) — flashes with the music (~$0.50)
- Breadboard — holds everything together (~$2.00)
- Jumper wires — connects the parts (~$1.00)

**Total: ≈ $10.50**

## 🌟 Background / The Story

Most doorbells just go "ding-dong." Boring! But what if YOUR doorbell played an actual song with real notes and rhythms? That's what you're building today!

The secret is frequency. Every musical note vibrates at a specific speed measured in hertz (Hz). Middle C vibrates 262 times per second. The note A vibrates 440 times per second — so fast your ear hears it as a smooth pitch! By setting your PWM signal to different frequencies, you tell the tiny buzzer how fast to vibrate. Put the right notes in the right order and you have a melody!

Your doorbell plays "We Wish You a Merry Christmas" (doorbells can be festive any time of year!). While it plays, the RGB LED flashes different colors in sync with every note — it's a mini light show! Press the button again while it's playing and the song restarts from the beginning. So cool!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Button Switch Module **S** | Pico **GP14** | Signal pin — HIGH when pressed |
| Button Switch Module **VCC** | Pico **3V3** | 3.3 V power |
| Button Switch Module **GND** | Pico **GND** | Ground |
| Passive Buzzer Module **S** | Pico **GP18** | PWM signal — controls pitch |
| Passive Buzzer Module **VCC** | Pico **3V3** | 3.3 V power |
| Passive Buzzer Module **GND** | Pico **GND** | Ground |
| RGB LED Module **R** | Pico **GP9** | Red channel — PWM |
| RGB LED Module **G** | Pico **GP10** | Green channel — PWM |
| RGB LED Module **B** | Pico **GP11** | Blue channel — PWM |
| RGB LED Module **GND** | Pico **GND** | Ground (common cathode) |

> **Note:** The passive buzzer needs a PWM signal with a changing frequency to make sound — unlike the active buzzer which just buzzes at one fixed pitch when you apply power. This is what lets us play real melodies!

## 💻 The Code

```c
/**
 * Project 2: Musical Doorbell
 * ============================
 * Press the button → plays "We Wish You a Merry Christmas" with
 * colour-synced LED light show. Press again to restart.
 * Idle state: LED glows soft white.
 *
 * Hardware:
 *   Button:       S → GP14, VCC → 3V3, GND → GND
 *   Passive Buzzer: S → GP18, VCC → 3V3, GND → GND
 *   RGB LED:      R → GP9, G → GP10, B → GP11, GND → GND
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define BUTTON_PIN   14    // Button signal — HIGH when pressed
#define BUZZER_PIN   18    // Passive buzzer PWM signal
#define LED_R_PIN     9    // RGB LED red channel
#define LED_G_PIN    10    // RGB LED green channel
#define LED_B_PIN    11    // RGB LED blue channel

// ── PWM wrap for LED brightness (0–255) ──────────────────────────────────────
#define LED_PWM_WRAP  255

// ── Button debounce time (ms) ─────────────────────────────────────────────────
#define DEBOUNCE_MS    20

// ── Note frequency table (Hz) ────────────────────────────────────────────────
// These are the standard frequencies for musical notes.
// Your ear hears these as distinct pitches on a piano keyboard!
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
#define NOTE_F5   698
#define NOTE_G5   784
#define NOTE_A5   880
#define NOTE_REST   0     // REST = silence (no buzzer)

// ── Note durations (ms) ──────────────────────────────────────────────────────
// Think of these like note lengths on a musical score.
#define WHOLE       800   // Whole note (4 beats)
#define HALF        400   // Half note  (2 beats)
#define QUARTER     200   // Quarter note (1 beat)  ← most common
#define EIGHTH      100   // Eighth note (half beat)
#define DOT_QUARTER 300   // Dotted quarter (1.5 beats)
#define DOT_HALF    600   // Dotted half (3 beats)

// ─────────────────────────────────────────────────────────────────────────────
// "We Wish You a Merry Christmas" melody
// Each pair of entries: { frequency_Hz, duration_ms }
// A REST (frequency=0) means silence for that duration.
// ─────────────────────────────────────────────────────────────────────────────
typedef struct {
    uint16_t freq;
    uint16_t duration;
} Note;

static const Note melody[] = {
    // "We wish you a merry Christmas"
    {NOTE_C4, QUARTER},
    {NOTE_F4, QUARTER},  {NOTE_F4, EIGHTH},  {NOTE_G4, EIGHTH},
    {NOTE_F4, EIGHTH},   {NOTE_E4, EIGHTH},
    {NOTE_D4, QUARTER},  {NOTE_D4, QUARTER},  {NOTE_D4, QUARTER},
    // "We wish you a merry Christmas"
    {NOTE_G4, QUARTER},
    {NOTE_C5, QUARTER},  {NOTE_C5, EIGHTH},  {NOTE_D5, EIGHTH},
    {NOTE_C5, EIGHTH},   {NOTE_B4, EIGHTH},
    {NOTE_A4, DOT_HALF},
    // "We wish you a merry Christmas"
    {NOTE_A4, QUARTER},
    {NOTE_D5, QUARTER},  {NOTE_D5, EIGHTH},  {NOTE_E5, EIGHTH},
    {NOTE_D5, EIGHTH},   {NOTE_C5, EIGHTH},
    {NOTE_B4, QUARTER},  {NOTE_G4, QUARTER},  {NOTE_G4, QUARTER},
    // "And a happy New Year!"
    {NOTE_E5, EIGHTH},   {NOTE_E5, EIGHTH},
    {NOTE_C5, QUARTER},  {NOTE_A4, QUARTER},  {NOTE_D4, QUARTER},
    {NOTE_F4, DOT_QUARTER}, {NOTE_E4, EIGHTH},
    {NOTE_C5, QUARTER},  {NOTE_B4, QUARTER},  {NOTE_A4, HALF},
    {NOTE_REST, QUARTER},
};

// Number of notes in the melody array
#define MELODY_LENGTH  (sizeof(melody) / sizeof(melody[0]))

// ── LED colors for the light show (one per beat group, cycles round) ──────────
// These are {R, G, B} colors to flash in sequence as the doorbell plays
typedef struct { uint8_t r, g, b; } Color;

static const Color beat_colors[] = {
    {255,   0,   0},   // Red
    {255, 100,   0},   // Orange
    {255, 255,   0},   // Yellow
    {  0, 255,   0},   // Green
    {  0, 200, 255},   // Cyan
    {  0,   0, 255},   // Blue
    {150,   0, 255},   // Purple
    {255,   0, 150},   // Pink
};
#define COLOR_COUNT  (sizeof(beat_colors) / sizeof(beat_colors[0]))

// ─────────────────────────────────────────────────────────────────────────────
// setup_led_pwm()
// Initialise all three RGB LED pins for PWM output.
// ─────────────────────────────────────────────────────────────────────────────
void setup_led_pwm(void) {
    uint pins[] = {LED_R_PIN, LED_G_PIN, LED_B_PIN};
    for (int i = 0; i < 3; i++) {
        gpio_set_function(pins[i], GPIO_FUNC_PWM);
        uint slice = pwm_gpio_to_slice_num(pins[i]);
        pwm_set_wrap(slice, LED_PWM_WRAP);
        pwm_set_enabled(slice, true);
    }
    // Start off: soft white idle glow
    pwm_set_gpio_level(LED_R_PIN, 40);
    pwm_set_gpio_level(LED_G_PIN, 35);
    pwm_set_gpio_level(LED_B_PIN, 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// set_rgb()
// Sets the LED color. r/g/b are 0 (off) to 255 (full brightness).
// ─────────────────────────────────────────────────────────────────────────────
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, r);
    pwm_set_gpio_level(LED_G_PIN, g);
    pwm_set_gpio_level(LED_B_PIN, b);
}

// ─────────────────────────────────────────────────────────────────────────────
// set_idle_led()
// Soft warm white glow for when we're waiting for someone to press the button.
// ─────────────────────────────────────────────────────────────────────────────
void set_idle_led(void) {
    set_rgb(40, 35, 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// buzzer_off()
// Silences the buzzer by disabling PWM on its pin.
// ─────────────────────────────────────────────────────────────────────────────
void buzzer_off(void) {
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    pwm_set_enabled(slice, false);
    // Set pin LOW to make sure it's fully silent
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_SIO);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// play_tone()
// Plays a single tone at freq_hz for duration_ms milliseconds.
// Uses hardware PWM at 50% duty cycle (equal on/off time = loudest buzz).
//
// PWM frequency formula:
//   freq = sys_clock / (clkdiv * (wrap + 1))
//   → clkdiv = sys_clock / (freq * (wrap + 1))
//
// We fix wrap=999 and calculate the right clock divider for each note.
// Returns true if a button press was detected mid-note (so we can stop early).
// ─────────────────────────────────────────────────────────────────────────────
bool play_tone(uint16_t freq_hz, uint16_t duration_ms) {
    if (freq_hz == NOTE_REST || freq_hz == 0) {
        // REST: just silence for the duration, but still check the button
        buzzer_off();
        uint32_t start = to_ms_since_boot(get_absolute_time());
        while (to_ms_since_boot(get_absolute_time()) - start < duration_ms) {
            if (gpio_get(BUTTON_PIN)) return true;  // Button pressed! Stop.
            sleep_ms(5);
        }
        return false;
    }

    // Set up PWM for the buzzer pin
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    uint slice   = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint channel = pwm_gpio_to_channel(BUZZER_PIN);

    // Calculate divider: we want freq_hz with wrap=999 (1000 steps per cycle)
    uint32_t sys_hz  = clock_get_hz(clk_sys);
    uint32_t wrap    = 999;
    // clkdiv is a 8.4 fixed-point value in the hardware
    // For simplicity, use integer division and find a wrap that fits
    // clkdiv_int = sys_hz / (freq_hz * (wrap+1))
    uint32_t clkdiv_int = sys_hz / ((uint32_t)freq_hz * (wrap + 1));
    if (clkdiv_int < 1)  clkdiv_int = 1;
    if (clkdiv_int > 255) clkdiv_int = 255;  // Hardware limit

    pwm_set_clkdiv_int_frac(slice, (uint8_t)clkdiv_int, 0);
    pwm_set_wrap(slice, (uint16_t)wrap);
    pwm_set_chan_level(slice, channel, (uint16_t)(wrap / 2)); // 50% duty
    pwm_set_enabled(slice, true);

    // Wait for duration_ms, checking button every 5ms
    uint32_t start = to_ms_since_boot(get_absolute_time());
    while (to_ms_since_boot(get_absolute_time()) - start < duration_ms) {
        if (gpio_get(BUTTON_PIN)) {
            buzzer_off();
            return true;   // Button pressed mid-note — caller will restart
        }
        sleep_ms(5);
    }

    buzzer_off();
    return false;  // Finished cleanly
}

// ─────────────────────────────────────────────────────────────────────────────
// button_pressed()
// Returns true if the button is pressed, with a 20ms debounce.
// Debounce = wait a tiny bit and check again to rule out noise.
// (Buttons are mechanical — they "bounce" for a few milliseconds when pressed!)
// ─────────────────────────────────────────────────────────────────────────────
bool button_pressed(void) {
    if (gpio_get(BUTTON_PIN)) {
        sleep_ms(DEBOUNCE_MS);
        return gpio_get(BUTTON_PIN);  // Still pressed after debounce = real press
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// play_melody()
// Plays the full doorbell melody with LED light show.
// Returns early if the button is pressed (to allow restart).
// ─────────────────────────────────────────────────────────────────────────────
void play_melody(void) {
    printf("** Doorbell playing! **\n");
    uint8_t color_index = 0;

    for (uint32_t i = 0; i < MELODY_LENGTH; i++) {
        // Change LED color for each note in the sequence
        Color c = beat_colors[color_index % COLOR_COUNT];
        set_rgb(c.r, c.g, c.b);
        color_index++;

        printf("  Note %2lu: %4u Hz, %3u ms\n",
               (unsigned long)i, melody[i].freq, melody[i].duration);

        // Play the note. If button is pressed mid-note, stop.
        bool interrupted = play_tone(melody[i].freq, melody[i].duration);
        if (interrupted) {
            printf("Interrupted! Restarting...\n");
            sleep_ms(100);  // Brief pause before restart
            return;         // Exit — caller's loop will call us again
        }

        // Brief gap between notes so they sound separate (like lifting a piano key)
        sleep_ms(30);
    }

    printf("Melody finished!\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// ─────────────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    printf("=================================\n");
    printf("  Musical Doorbell -- Project 2  \n");
    printf("=================================\n");
    printf("Press the button to ring the doorbell!\n\n");

    // Set up button pin as input (the module has a built-in pull-down)
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    // Set up LED and buzzer
    setup_led_pwm();
    buzzer_off();

    printf("Waiting for someone at the door...\n");

    // ── Main loop ─────────────────────────────────────────────────────────────
    while (true) {
        // Show idle glow while waiting
        set_idle_led();

        // Poll the button
        if (button_pressed()) {
            // Button pressed! Play the melody (may be interrupted and return early)
            play_melody();

            // After melody ends (or was interrupted), wait for button to be released
            while (gpio_get(BUTTON_PIN)) {
                sleep_ms(10);
            }
            sleep_ms(50);  // Short quiet moment before going back to idle

            printf("Back to idle. Waiting for next press...\n");
        }

        sleep_ms(10);  // Check button 100 times per second
    }

    return 0;
}
```

## 🔍 How the Code Works

1. **Note frequency table** — Lines like `#define NOTE_C4 262` store the speed of each musical note in Hz. Middle C vibrates 262 times per second. Every octave up doubles the frequency — C5 is 523 Hz, exactly twice C4!

2. **Melody array** — The `melody[]` array stores the song as pairs of `{frequency, duration}`. It's sheet music translated into numbers! `NOTE_REST` means silence — important for separating notes so they don't blur together.

3. **`play_tone()` with PWM math** — To make the buzzer play a specific note, the code calculates a special number called a clock divider. It makes the PWM cycle repeat exactly the right number of times per second. We use 50% duty cycle (half on, half off) which sounds loudest.

4. **Button check inside `play_tone()`** — Instead of waiting for the whole note, the code checks the button every 5ms. That means pressing the button can interrupt the song instantly!

5. **LED light show** — Each note gets a different color from `beat_colors[]`. The colors cycle: red → orange → yellow → green → cyan → blue → purple → pink → red... It's a real rainbow show!

6. **Debounce** — Buttons "bounce" when pressed — they make a few rapid on/off signals. The code waits 20ms and checks again. If it's still pressed, it's a real press, not noise!

## 🎮 Try It!

1. **Change the melody** — Swap the `melody[]` array for a different song! Try "Happy Birthday": C4-C4-D4-C4-F4-E4. Look up note frequencies online and add them to the frequency table at the top.

2. **Adjust the tempo** — Change `#define QUARTER 200` to `150` to make the song faster, or `300` to slow it down. All the note lengths change together!

3. **Change the idle color** — Find `set_idle_led()` and change `set_rgb(40, 35, 20)`. Try `set_rgb(0, 0, 40)` for blue or `set_rgb(40, 0, 40)` for purple.

4. **Add a second melody** — Create a `melody2[]` array with a different tune. Alternate which one plays on each button press!

## 🏆 Challenge

Make the LED brightness match the note — lower notes (lower frequencies) glow brighter, higher notes glow dimmer. You'll need to map frequency (262–880 Hz) to brightness (150–255). Use the same math trick as Project 1! You could also make the color depend on the octave: low notes glow warm red/orange, high notes glow cool blue/purple.

## 📝 Summary

You built a musical doorbell that plays a real song using PWM frequencies on a passive buzzer, with a rainbow LED light show synced to every note. You learned how musical notes are just specific vibration speeds, how to debounce a button, and how to stop a song cleanly when the button is pressed again. You're basically a music programmer now!
