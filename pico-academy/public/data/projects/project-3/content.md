# Clap-Activated Light — Clap On, Clap Off!

## What you'll learn
- How to use both the analog and digital outputs of the sound sensor
- How to detect quick events (claps) and ignore everything that follows immediately after
- How to build a simple state machine that cycles through multiple modes
- How to detect a double-clap pattern within a time window
- How to read analog voltage levels and display them as a sound meter
- How timing with `get_absolute_time()` works in the Pico SDK

## Parts you'll need
- Raspberry Pi Pico 2 W — the brain of your project (~$6.00)
- Sound Sensor Module (from Elegoo 37 Sensor Kit) — detects sound (~$1.00)
- RGB LED Module (from Elegoo 37 Sensor Kit) — shows the current mode (~$0.50)
- Breadboard — holds everything together (~$2.00)
- Jumper wires — connects the parts (~$1.00)

**Total: ≈ $10.50**

## Background

Back in the 1980s and 1990s, there was a famous TV commercial for a gadget called "The Clapper." The ad showed a grandmother clapping twice to turn her living room light on and off without getting out of her chair. The jingle went: *"Clap on! (clap clap) Clap off! (clap clap) Clap on, clap off — The Clapper!"* It became one of the most memorable commercials ever made. Millions of people bought them. The original Clapper used analog circuits to detect the sharp spike in sound from a clap. Today, your Elegoo sound sensor does the same thing — but now you control the logic in code!

The sound sensor module has two outputs. The **DO (digital output)** pin flips HIGH instantly when the sound level passes a threshold — it's perfect for detecting a sharp clap. The **A0 (analog output)** pin gives you a voltage that varies with the volume of the sound, which you can read with the Pico's ADC. You'll use DO for clap detection (fast and reliable) and A0 as a fun "VU meter" to print a sound level bar in the serial monitor.

Your clap-activated light will cycle through different states each time you clap: OFF → warm white → red → green → blue → OFF → and then back around. That's five states cycling round! As a bonus challenge built right into this project, you'll also detect a **double-clap** (two claps within 800ms) and trigger a special rainbow cycling mode. It's like having a secret code for your bedroom light!

> **Before you start:** The sound sensor has a small potentiometer (a tiny screw) on the back. Use a small screwdriver to adjust it so the DO pin triggers when you clap but not when you just speak normally. Turn it clockwise to make it less sensitive (needs louder sounds), counter-clockwise to make it more sensitive.

## Wiring

| From | To | Notes |
|------|----|-------|
| Sound Sensor Module **A0** | Pico **GP26** | Analog sound level → ADC channel 0 |
| Sound Sensor Module **DO** | Pico **GP15** | Digital clap trigger (HIGH on loud sound) |
| Sound Sensor Module **VCC** | Pico **3V3** | 3.3 V power |
| Sound Sensor Module **GND** | Pico **GND** | Ground |
| RGB LED Module **R** | Pico **GP9** | Red channel — PWM |
| RGB LED Module **G** | Pico **GP10** | Green channel — PWM |
| RGB LED Module **B** | Pico **GP11** | Blue channel — PWM |
| RGB LED Module **GND** | Pico **GND** | Ground (common cathode) |

## The code

```c
/**
 * Project 3: Clap-Activated Light
 * =================================
 * Single clap → cycles RGB LED through modes: OFF → white → red → green → blue → OFF
 * Double clap (two claps within 800ms) → rainbow cycling mode!
 * A0 analog output → printed as a "VU meter" bar in the serial monitor.
 *
 * Hardware:
 *   Sound Sensor: A0 → GP26 (ADC0), DO → GP15 (digital), VCC → 3V3, GND → GND
 *   RGB LED:      R → GP9, G → GP10, B → GP11, GND → GND
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define SOUND_ADC_PIN    26   // Sound sensor A0 → GP26 (ADC channel 0)
#define SOUND_ADC_CH      0   // ADC channel number
#define SOUND_DO_PIN     15   // Sound sensor DO → GP15 (digital threshold output)

#define LED_R_PIN         9   // RGB LED red channel (PWM)
#define LED_G_PIN        10   // RGB LED green channel (PWM)
#define LED_B_PIN        11   // RGB LED blue channel (PWM)

// ── Clap detection settings ───────────────────────────────────────────────────
#define CLAP_LOCKOUT_MS   300  // After a clap, ignore new claps for 300ms
                               // (prevents one loud clap from registering twice)
#define DOUBLE_CLAP_MS    800  // Two claps within this window = double-clap!

// ── LED mode definitions ──────────────────────────────────────────────────────
// The LED cycles through these states on each single clap.
typedef enum {
    MODE_OFF     = 0,
    MODE_WHITE   = 1,
    MODE_RED     = 2,
    MODE_GREEN   = 3,
    MODE_BLUE    = 4,
    MODE_RAINBOW = 5,   // Special: double-clap only
    MODE_COUNT   = 5,   // Number of modes in the normal cycle (not counting rainbow)
} LightMode;

// Current LED mode
static volatile LightMode current_mode = MODE_OFF;

// ── Rainbow state ─────────────────────────────────────────────────────────────
static bool     rainbow_active = false;
static uint16_t rainbow_hue    = 0;    // 0–359 degrees around the color wheel

// ─────────────────────────────────────────────────────────────────────────────
// setup_pwm_pin() — configure a GPIO pin for PWM output
// ─────────────────────────────────────────────────────────────────────────────
void setup_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// set_rgb() — set LED color (r, g, b each 0–255)
// ─────────────────────────────────────────────────────────────────────────────
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, r);
    pwm_set_gpio_level(LED_G_PIN, g);
    pwm_set_gpio_level(LED_B_PIN, b);
}

// ─────────────────────────────────────────────────────────────────────────────
// hue_to_rgb()
// Converts a hue (0–359 degrees on the color wheel) to an RGB color.
// This is how we cycle smoothly through the rainbow — red → yellow → green
// → cyan → blue → magenta → red → ...
// Full brightness (saturation=1, value=1) assumed.
// ─────────────────────────────────────────────────────────────────────────────
void hue_to_rgb(uint16_t hue, uint8_t *r, uint8_t *g, uint8_t *b) {
    // hue 0–359 → one of 6 sectors of the color wheel
    uint16_t sector  = hue / 60;        // 0..5
    uint16_t frac    = hue % 60;        // 0..59 (how far into this sector)
    uint8_t  p       = 0;               // always 0 (minimum is black)
    uint8_t  q       = (uint8_t)(255 - (uint32_t)255 * frac / 60);
    uint8_t  t       = (uint8_t)((uint32_t)255 * frac / 60);

    switch (sector) {
        case 0: *r = 255; *g = t;   *b = p;   break;  // Red → Yellow
        case 1: *r = q;   *g = 255; *b = p;   break;  // Yellow → Green
        case 2: *r = p;   *g = 255; *b = t;   break;  // Green → Cyan
        case 3: *r = p;   *g = q;   *b = 255; break;  // Cyan → Blue
        case 4: *r = t;   *g = p;   *b = 255; break;  // Blue → Magenta
        default:*r = 255; *g = p;   *b = q;   break;  // Magenta → Red
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// apply_mode()
// Sets the LED to whatever color the current_mode says.
// Called whenever the mode changes.
// ─────────────────────────────────────────────────────────────────────────────
void apply_mode(LightMode mode) {
    rainbow_active = false;   // Turn off rainbow unless we explicitly set it
    switch (mode) {
        case MODE_OFF:     set_rgb(0, 0, 0);           break;
        case MODE_WHITE:   set_rgb(200, 180, 120);     break;  // Warm white
        case MODE_RED:     set_rgb(255, 0, 0);         break;
        case MODE_GREEN:   set_rgb(0, 255, 0);         break;
        case MODE_BLUE:    set_rgb(0, 0, 255);         break;
        case MODE_RAINBOW:
            rainbow_active = true;   // Rainbow mode: LED updates in main loop
            break;
        default:           set_rgb(0, 0, 0);           break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// print_sound_bar()
// Prints a visual "VU meter" bar to serial based on the ADC reading.
// Example:  Sound: [########    ] 1842 / 4095
// This is just for fun — it helps you see the noise level around you!
// ─────────────────────────────────────────────────────────────────────────────
void print_sound_bar(uint16_t adc_val) {
    const int BAR_WIDTH = 20;
    int filled = (int)((uint32_t)adc_val * BAR_WIDTH / 4095);
    printf("Sound: [");
    for (int i = 0; i < BAR_WIDTH; i++) {
        printf(i < filled ? "#" : " ");
    }
    printf("] %4u\n", adc_val);
}

// ─────────────────────────────────────────────────────────────────────────────
// mode_name()
// Returns a human-readable name for a mode (for printing to serial).
// ─────────────────────────────────────────────────────────────────────────────
const char *mode_name(LightMode mode) {
    switch (mode) {
        case MODE_OFF:     return "OFF";
        case MODE_WHITE:   return "WARM WHITE";
        case MODE_RED:     return "RED";
        case MODE_GREEN:   return "GREEN";
        case MODE_BLUE:    return "BLUE";
        case MODE_RAINBOW: return "RAINBOW (double-clap special!)";
        default:           return "UNKNOWN";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// ─────────────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    printf("=========================================\n");
    printf("  Clap-Activated Light -- Project 3     \n");
    printf("=========================================\n");
    printf("Clap once to cycle modes.\n");
    printf("Clap TWICE quickly for rainbow mode!\n\n");

    // ── Set up ADC for analog sound reading ───────────────────────────────────
    adc_init();
    adc_gpio_init(SOUND_ADC_PIN);
    adc_select_input(SOUND_ADC_CH);

    // ── Set up DO pin for digital clap detection ──────────────────────────────
    gpio_init(SOUND_DO_PIN);
    gpio_set_dir(SOUND_DO_PIN, GPIO_IN);
    // No pull needed — the sensor module drives this pin

    // ── Set up RGB LED PWM ────────────────────────────────────────────────────
    setup_pwm_pin(LED_R_PIN);
    setup_pwm_pin(LED_G_PIN);
    setup_pwm_pin(LED_B_PIN);
    apply_mode(current_mode);   // Start in OFF mode

    // ── Clap timing variables ─────────────────────────────────────────────────
    // We track:
    //   last_clap_time  → when we last detected a clap (for lockout + double-clap)
    //   clap_count      → how many claps detected since we started counting
    //   counting        → are we currently counting towards a double-clap?
    absolute_time_t last_clap_time   = nil_time;  // Sentinel: no clap yet
    absolute_time_t count_start_time = nil_time;
    uint8_t         clap_count       = 0;
    bool            counting         = false;

    // Analog print throttle (only print sound bar once every 100ms)
    absolute_time_t next_analog_print = get_absolute_time();

    printf("Current mode: %s\n", mode_name(current_mode));

    // ── Main loop ─────────────────────────────────────────────────────────────
    while (true) {

        // ── Step 1: Read the DO pin for a clap ───────────────────────────────
        bool do_high = gpio_get(SOUND_DO_PIN);  // HIGH = loud sound detected

        if (do_high) {
            absolute_time_t now = get_absolute_time();

            // Lockout check: ignore claps within CLAP_LOCKOUT_MS of the last one
            bool in_lockout = (!is_nil_time(last_clap_time) &&
                               absolute_time_diff_us(last_clap_time, now) < (int64_t)CLAP_LOCKOUT_MS * 1000);

            if (!in_lockout) {
                // This is a genuine new clap!
                last_clap_time = now;

                if (!counting) {
                    // First clap in a potential double-clap sequence
                    counting        = true;
                    clap_count      = 1;
                    count_start_time = now;
                    printf("Clap 1 detected! Waiting for second clap...\n");
                } else {
                    // We were already counting — this is the second clap!
                    clap_count = 2;
                }
            }
        }

        // ── Step 2: Check if the double-clap window has expired ───────────────
        if (counting && !is_nil_time(count_start_time)) {
            int64_t elapsed_us = absolute_time_diff_us(count_start_time,
                                                        get_absolute_time());
            bool window_expired = (elapsed_us > (int64_t)DOUBLE_CLAP_MS * 1000);

            if (clap_count == 2) {
                // Two claps within the window — DOUBLE CLAP!
                printf("** DOUBLE CLAP! Activating rainbow mode! **\n");
                current_mode = MODE_RAINBOW;
                apply_mode(current_mode);
                counting   = false;
                clap_count = 0;

            } else if (window_expired && clap_count == 1) {
                // Window expired with only one clap — single clap action
                current_mode = (LightMode)((current_mode + 1) % MODE_COUNT);
                apply_mode(current_mode);
                printf("Clap detected! LED mode: %s\n", mode_name(current_mode));
                counting   = false;
                clap_count = 0;
            }
        }

        // ── Step 3: Update rainbow animation if active ────────────────────────
        if (rainbow_active) {
            uint8_t r, g, b;
            hue_to_rgb(rainbow_hue, &r, &g, &b);
            set_rgb(r, g, b);
            rainbow_hue = (rainbow_hue + 2) % 360;  // Advance color wheel
            sleep_ms(10);                             // Speed of rainbow spin
        }

        // ── Step 4: Read A0 analog and print sound bar ────────────────────────
        absolute_time_t now_t = get_absolute_time();
        if (absolute_time_diff_us(next_analog_print, now_t) >= 0) {
            uint16_t analog_val = adc_read();
            print_sound_bar(analog_val);
            next_analog_print = delayed_by_ms(now_t, 100);
        }

        // Small delay to avoid busy-spinning the CPU at 100%
        if (!rainbow_active) {
            sleep_ms(5);
        }
    }

    return 0;
}
```

## How the code works

1. **Two sensor outputs, two jobs** — The `SOUND_DO_PIN` (digital) fires HIGH whenever the sound is louder than the threshold set by the potentiometer on the sensor board. We use this for fast clap detection. The `SOUND_ADC_PIN` (analog) gives a continuously varying voltage — we read this with the ADC and display it as a sound meter bar, just for fun.

2. **Clap lockout (debounce for sound)** — A single handclap creates a sharp spike of sound, but the sensor might read HIGH for several milliseconds while the sound echoes. The `CLAP_LOCKOUT_MS = 300` lockout ignores any new detections for 300ms after each clap. Without this, one clap could count as three or four!

3. **Double-clap detection with a time window** — When the first clap is detected, `counting` is set to `true` and we record `count_start_time`. If a second clap arrives before 800ms passes, `clap_count` reaches 2 and we trigger rainbow mode. If 800ms passes with only one clap, it's a single-clap and we advance the mode. This is a simple pattern-recognition state machine!

4. **State machine for modes** — `current_mode` is an enum that goes 0 → 1 → 2 → 3 → 4 → 0 → ... on each single clap. The `% MODE_COUNT` wrap makes it cycle. `apply_mode()` reads the current state and sets the LED accordingly — clean and easy to extend with more modes.

5. **Rainbow animation with HSV color** — `hue_to_rgb()` converts a hue angle (0–359°) into RGB values by dividing the color wheel into six sectors. Each pass through the main loop advances `rainbow_hue` by 2°, smoothly cycling through all colors. At 10ms per step with 2° increments, it completes one full rainbow every 1.8 seconds.

6. **Analog VU meter** — `print_sound_bar()` maps the 12-bit ADC value (0–4095) to a bar of `#` characters. It's fun to watch while you make noise — you can literally see your clap in the serial monitor as a big spike!

## Try it

1. **Adjust the sensor sensitivity** — Find the tiny potentiometer on the back of the sound sensor module. Use a small screwdriver to turn it until the DO pin triggers on a clap but not on normal speech. Open the serial monitor and watch the sound bar — clapping should make it spike to maximum, and silence should bring it near zero.

2. **Try the double-clap** — Clap twice quickly (within about half a second) and you should enter rainbow mode. Clap once and it returns to the normal cycle. How fast can you clap?

3. **Change the lockout time** — Change `#define CLAP_LOCKOUT_MS 300` to `150` and see if clap detection feels more responsive. Too low and you might get double-counts from a single clap. Find the sweet spot!

4. **Watch the VU meter** — Open your serial monitor and try different sounds: whisper, talk, clap, snap your fingers, knock on your desk. Which sounds make the biggest spike? Which are barely visible?

## Challenge

Add a third clap pattern — a **triple clap** (three claps within 1.2 seconds) — that triggers a special "strobe mode" where the LED rapidly flashes between white and off 10 times per second. You'll need to extend the clap-counting logic to track three claps, add a new `MODE_STROBE` to the enum, and update `apply_mode()` to handle it. Hint: set a flag in `apply_mode()` and handle the strobe timing (similar to the rainbow update) in the main loop!

## Summary

You built a clap-activated light that detects sound events with the digital output of a sound sensor, debounces them properly to avoid false triggers, and cycles through LED color modes on each single clap. A double-clap within 800ms triggers a special smooth rainbow animation. You also learned how to build a simple state machine and how to detect timed patterns in sensor input.

## How this fits the Smart Home

Voice and sound control are everywhere in modern smart homes — think Alexa, Google Home, or Siri. Your clap light is a simple version of the same idea: using sound as a control signal. Later in this series, you'll combine sound detection with other sensors to create context-aware lighting — lights that know not just that a sound happened, but what kind of sound and in what conditions. This project gives you the foundation for all of that!
