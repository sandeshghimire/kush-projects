# Lesson 18: Touch Sensor & Laser Module — Magic Touch and Laser Tag

## What you'll learn
- How capacitive touch sensors detect your finger without you even pressing anything
- How to control a laser module with the Pico 2 W
- How to detect short vs long touches using timing
- How to build a secret code system with touch inputs
- Important laser safety rules

---

## Parts you'll need
- Raspberry Pi Pico 2 W
- Touch Sensor Module (capacitive — the flat one with a metal or shiny pad)
- Laser Module (the one with the small red diode)
- Passive Buzzer Module
- RGB LED Module
- Breadboard and jumper wires
- USB cable for power and serial output
- A dark room (optional — makes the laser look way cooler!)

---

## Background: The Touch Sensor

Have you ever wondered how your phone screen knows exactly where your finger is, even though you never actually press a button? The secret is **capacitance**! Your body can hold a tiny electrical charge — not enough to shock anything, just enough for a circuit to notice. A capacitive touch sensor has a metal plate connected to a circuit that measures how much charge can be stored near it. When your finger gets close, it adds extra capacitance and the circuit detects the change — even through a thin layer of plastic! It is like the sensor can feel you approaching before you even make contact.

The touch sensor module in your Elegoo kit makes this simple: it does all the complex measuring inside the chip and just gives you a HIGH or LOW signal on its output pin. HIGH means "a finger is touching me!" and LOW means "nobody there." This is exactly the same technology that is inside every smartphone, tablet, laptop trackpad, and even modern elevator buttons. Pretty incredible that it fits in a module the size of a postage stamp!

## Background: The Laser Module

The laser module has a tiny red **laser diode** inside — a special type of LED that produces a very tight, focused beam of red light instead of spreading light in all directions. You control it exactly like an LED: send HIGH to the signal pin and the laser turns on; send LOW and it turns off. The beam is so focused it can travel several metres and still look like a sharp dot on the wall.

**Safety first!** The laser in this kit is a Class 2 laser, which is generally safe because your blink reflex will protect you from brief accidental exposure. However, **never point the laser directly at anyone's eyes, and never stare into the beam intentionally** — even a few seconds of direct exposure is not safe. Always point it at a wall or the floor. With that rule in mind, lasers are fantastic fun and incredibly useful in electronics!

---

## Wiring

### Touch Sensor Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP14 | S (signal output) | HIGH when touched |
| 3V3 | VCC | 3.3 V power |
| GND | GND | Ground |

### Laser Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal) | HIGH = laser on |
| 3V3 | VCC | 3.3 V (use VBUS/5 V for brighter beam if module supports it) |
| GND | GND | Ground |

### Passive Buzzer Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP18 | S (signal) | PWM tone |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### RGB LED Module (R / G / B / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Ground (common cathode) |

> **Safety reminder:** Before connecting the laser module, decide where it will point and make sure no one can accidentally look into the beam. Tape it down so it points at the floor or a wall!

---

## The code

```c
/**
 * Lesson 18: Touch Sensor & Laser Module — Magic Touch and Laser Tag
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Touch Sensor  -> GP14 (HIGH when touched)
 * Laser Module  -> GP15 (HIGH = laser on)
 * Passive Buzzer-> GP18 (PWM tones)
 * RGB LED       -> GP9 (R), GP10 (G), GP11 (B)
 *
 * Features:
 *   - Quick touch  = laser pulses 3 times
 *   - Long touch (1s+) = laser stays on until released
 *   - Touch counter printed to serial
 *   - Secret code: 3 quick touches in a row = PARTY MODE!
 *       (RGB cycles through colours + buzzer plays a tune)
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────
#define TOUCH_PIN    14   // Capacitive touch sensor output
#define LASER_PIN    15   // Laser module signal
#define BUZZER_PIN   18   // Passive buzzer
#define LED_R_PIN     9   // RGB LED red
#define LED_G_PIN    10   // RGB LED green
#define LED_B_PIN    11   // RGB LED blue

// ── Timing constants ─────────────────────────────────────────────
#define LONG_PRESS_MS       1000   // 1 second = "long touch"
#define SECRET_WINDOW_MS    2000   // 3 touches must happen within 2 seconds
#define DEBOUNCE_MS           30   // Ignore bounces shorter than 30 ms

// ── Buzzer helper ────────────────────────────────────────────────
void play_tone(uint freq_hz, uint duration_ms) {
    if (freq_hz == 0) {
        sleep_ms(duration_ms);  // Rest (silence)
        return;
    }
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint chan  = pwm_gpio_to_channel(BUZZER_PIN);

    uint32_t wrap = 125000000 / (64 * freq_hz) - 1;
    pwm_set_clkdiv(slice, 64.0f);
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, chan, wrap / 2);
    pwm_set_enabled(slice, true);
    sleep_ms(duration_ms);
    pwm_set_enabled(slice, false);
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_SIO);
    gpio_put(BUZZER_PIN, 0);
}

// ── RGB LED helpers ──────────────────────────────────────────────
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

void all_off(void) {
    set_rgb(false, false, false);
    gpio_put(LASER_PIN, 0);
}

// ── Laser pulse helper ───────────────────────────────────────────
// Flash the laser on and off N times quickly
void laser_pulse(int times) {
    for (int i = 0; i < times; i++) {
        gpio_put(LASER_PIN, 1);
        set_rgb(true, false, false);   // Red LED while laser fires
        sleep_ms(150);
        gpio_put(LASER_PIN, 0);
        set_rgb(false, false, false);
        sleep_ms(150);
    }
}

// ── Party mode! ──────────────────────────────────────────────────
// Called when the secret 3-touch code is entered
void party_mode(void) {
    printf("*** PARTY MODE ACTIVATED! ***\n");

    // Cycle through colours while playing a cheerful tune
    // Notes: C5=523, E5=659, G5=784, C6=1047
    uint notes[]    = {523, 659, 784, 1047, 784, 659, 523, 0};
    bool colours[8][3] = {
        {1,0,0}, {0,1,0}, {0,0,1}, {1,1,0},
        {0,1,1}, {1,0,1}, {1,1,1}, {0,0,0}
    };

    for (int i = 0; i < 8; i++) {
        set_rgb(colours[i][0], colours[i][1], colours[i][2]);
        gpio_put(LASER_PIN, i % 2);  // Laser flickers in time with music
        play_tone(notes[i], 200);
    }

    // Finale: rapid rainbow flash
    for (int rep = 0; rep < 6; rep++) {
        set_rgb(1,0,0); sleep_ms(80);
        set_rgb(0,1,0); sleep_ms(80);
        set_rgb(0,0,1); sleep_ms(80);
    }

    gpio_put(LASER_PIN, 0);
    set_rgb(false, true, false);  // Back to calm green
    printf("Party over — ready for more touches!\n\n");
}

// ── Main ─────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 18: Touch Sensor & Laser Module ===\n");
    printf("Quick touch = laser pulses | Long touch = laser on\n");
    printf("Secret: touch 3 times quickly for party mode!\n\n");

    // Set up all output pins
    gpio_init(LASER_PIN);  gpio_set_dir(LASER_PIN,  GPIO_OUT); gpio_put(LASER_PIN, 0);
    gpio_init(LED_R_PIN);  gpio_set_dir(LED_R_PIN,  GPIO_OUT);
    gpio_init(LED_G_PIN);  gpio_set_dir(LED_G_PIN,  GPIO_OUT);
    gpio_init(LED_B_PIN);  gpio_set_dir(LED_B_PIN,  GPIO_OUT);
    set_rgb(false, true, false);  // Start green — standby

    // Set up touch sensor as input (no pull-up needed — module handles it)
    gpio_init(TOUCH_PIN);
    gpio_set_dir(TOUCH_PIN, GPIO_IN);

    // ── State tracking variables ─────────────────────────────────
    bool     prev_touch          = false;   // Was sensor touched last loop?
    uint64_t touch_start_us      = 0;       // When did current touch begin?
    int      touch_count         = 0;       // Total touches so far
    int      quick_touch_streak  = 0;       // Consecutive quick touches for secret code
    uint64_t last_quick_touch_us = 0;       // Time of last quick touch (for window check)

    // ── Main loop ────────────────────────────────────────────────
    while (true) {
        bool touching = gpio_get(TOUCH_PIN);  // HIGH = finger on sensor

        // ── Debounce: only act after DEBOUNCE_MS of stable signal ─
        // (Touch sensors are pretty clean, but good habit!)

        // ── Finger just made contact ──────────────────────────────
        if (touching && !prev_touch) {
            touch_start_us = time_us_64();  // Record when touch started
            set_rgb(true, true, false);     // Yellow — finger detected!
            printf("Touch started...\n");
        }

        // ── Finger still touching — check for long press ──────────
        if (touching && prev_touch) {
            uint64_t held_us = time_us_64() - touch_start_us;
            if (held_us >= (uint64_t)LONG_PRESS_MS * 1000) {
                // Long touch! Keep laser on continuously
                gpio_put(LASER_PIN, 1);
                set_rgb(true, false, false);  // Red — laser is ON
            }
        }

        // ── Finger just lifted ────────────────────────────────────
        if (!touching && prev_touch) {
            uint64_t held_us  = time_us_64() - touch_start_us;
            uint32_t held_ms  = (uint32_t)(held_us / 1000);
            bool     was_long = (held_ms >= LONG_PRESS_MS);

            touch_count++;
            printf("Touch #%d released | Held for %u ms | Type: %s\n",
                   touch_count, held_ms, was_long ? "LONG" : "quick");

            gpio_put(LASER_PIN, 0);  // Make sure laser is off first

            if (was_long) {
                // Long touch: laser was on, now it turns off — done!
                set_rgb(false, false, true);  // Brief blue flash for feedback
                sleep_ms(200);
                set_rgb(false, true, false);  // Back to green
                quick_touch_streak = 0;       // Reset secret code streak
            } else {
                // Quick touch: pulse the laser 3 times
                laser_pulse(3);

                // Check for secret code (3 quick touches within 2 seconds)
                uint64_t now_us = time_us_64();
                bool in_window  = (last_quick_touch_us > 0) &&
                                  ((now_us - last_quick_touch_us) < (uint64_t)SECRET_WINDOW_MS * 1000);

                if (in_window) {
                    quick_touch_streak++;
                } else {
                    quick_touch_streak = 1;  // Reset streak, count this one
                }
                last_quick_touch_us = now_us;

                printf("Quick touch streak: %d / 3\n", quick_touch_streak);

                if (quick_touch_streak >= 3) {
                    // SECRET CODE UNLOCKED!
                    party_mode();
                    quick_touch_streak  = 0;
                    last_quick_touch_us = 0;
                }

                set_rgb(false, true, false);  // Back to green
            }
        }

        // ── Status LED when idle ──────────────────────────────────
        if (!touching && !prev_touch) {
            // Gentle green glow — waiting for a touch
            set_rgb(false, true, false);
        }

        prev_touch = touching;
        sleep_ms(20);  // 50 checks per second — responsive enough
    }

    return 0;
}
```

---

### How the code works

1. **`gpio_get(TOUCH_PIN)`** reads the touch sensor output. The capacitive chip inside the module does all the hard measurement work and just gives our Pico a clean HIGH or LOW. HIGH means a finger is detected!

2. **Rising edge detection** (`touching && !prev_touch`) tells us the exact moment a new touch begins. We record `touch_start_us = time_us_64()` to start a timer. This is like starting a stopwatch the instant you press a button.

3. **Long vs short touch** is determined when the finger lifts (`!touching && prev_touch`). We calculate how many milliseconds the touch lasted: `held_ms = (time_us_64() - touch_start_us) / 1000`. If that is 1000 ms or more, it was a long press!

4. **`laser_pulse()`** toggles `gpio_put(LASER_PIN, 1)` and `gpio_put(LASER_PIN, 0)` with `sleep_ms()` calls in between to create a flashing effect. The laser is just an LED from the Pico's perspective — digital HIGH = on, LOW = off.

5. **Secret code detection** tracks `quick_touch_streak` — a counter that goes up each time a quick touch lands within 2 seconds of the previous one. If it hits 3, `party_mode()` fires! If you take too long between touches, the streak resets. It is like trying to knock on a door fast enough.

6. **`party_mode()`** cycles through musical notes with `play_tone()` while changing the RGB LED colour each note. The notes array contains frequencies in Hertz (Hz) that the buzzer plays as recognisable musical pitches.

---

## Try it

1. **Quick vs long touch:** Touch the sensor very briefly, then hold your finger for 2 full seconds. Watch the laser behave differently each time! Can you feel where the 1-second boundary is?

2. **Party mode practice:** Try entering the secret code — 3 quick touches within 2 seconds. Watch the serial monitor show your streak count. How fast do you need to go?

3. **Adjust the long press time:** Change `#define LONG_PRESS_MS 1000` to `500`. Now a half-second hold triggers a long press! Try `2000` for a 2-second hold. Which feels best?

4. **Laser pointer fun:** In a dark room, use the long-touch mode to turn the laser on and point it at the wall. Notice how the beam stays tight and focused even from across the room. An LED would spread out — the laser does not!

---

## Challenge

**Build a Laser Alarm System!**

Combine the photo-interrupter module from Lesson 17 with your laser module. Point the laser at the photo-interrupter sensor from across a small gap — the laser beam acts as the tripwire and the photo-interrupter detects it.

Steps to build it:
1. Mount the laser on one side of a doorway (or a cardboard box opening), pointing at the photo-interrupter on the other side
2. When someone walks through and breaks the laser beam, the photo-interrupter triggers
3. Sound the buzzer alarm and flash the RGB LED red
4. Use the touch sensor as an "arm/disarm" button — quick touch to arm, long touch to disarm

This is almost exactly how real burglar alarms and shop door sensors work — except they use invisible IR beams. You are using visible red light, which makes it even cooler to see in action!

---

## Summary

The capacitive touch sensor detects your finger by sensing tiny changes in electrical charge — no actual pressing required — making it the same technology behind every touchscreen on the planet. The laser module is controlled exactly like an LED but produces a bright, focused beam useful for pointing and detection systems. By combining timing logic with these two modules you built a touch interface that distinguishes quick taps from long holds and even recognises a secret knock sequence — skills used in everything from smart home switches to security keypads!
