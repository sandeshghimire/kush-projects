# Lesson 13: Rotary Encoder Module — The Infinite Knob

## What you'll learn
- How a rotary encoder differs from a potentiometer (it spins forever!)
- How quadrature signals tell you which direction you turned
- How to use GPIO interrupts to count encoder clicks reliably
- How to map the click count to buzzer pitch and LED brightness

## Parts you'll need
- Raspberry Pi Pico 2 W
- Rotary Encoder Module (from the Elegoo 37 Kit — has a knob you can spin and press)
- Passive Buzzer Module (GP18)
- RGB LED Module (R → GP9, G → GP10, B → GP11)
- Breadboard and jumper wires
- USB cable

## Background

You have probably seen a volume knob on a stereo or radio — you can spin it left to turn the volume down and right to turn it up. A regular potentiometer has a hard stop at each end (you can feel it click when you hit the limit). A **rotary encoder** is different: it spins forever in either direction, and instead of measuring a voltage it just counts clicks. Every time you turn it one click clockwise, it adds 1. Every click counterclockwise subtracts 1. You can also push it down like a button!

How does it know which direction you turned it? This is the clever bit. Inside the encoder there are two switches, called CLK and DT, arranged 90 degrees apart around the spinning shaft. When you turn clockwise, CLK clicks first and DT clicks a tiny moment later. When you turn counterclockwise, DT clicks first. This is called a **quadrature** signal — "quadrature" is just a fancy word for "90 degrees apart." By watching which pin changes first, your Pico can tell the direction. It is a bit like two people walking in step but one is always a half-step ahead of the other — the one who is ahead tells you which way you are going.

The coolest thing about rotary encoders is that they feel incredibly satisfying to use — each click is a physical detent you can feel in your fingers, with a reassuring little click sound. DJs use them to scratch records, engineers use them to fine-tune instruments, and game designers use them as scroll wheels. In this lesson you will use your encoder as a combined pitch control (for the buzzer) and brightness control (for the RGB LED), with the push button resetting everything to zero. Every turn of the knob makes something change — immediately!

## Wiring

| Pico Pin | Component |
|---|---|
| GP2 | Rotary Encoder Module — CLK |
| GP3 | Rotary Encoder Module — DT |
| GP4 | Rotary Encoder Module — SW (push button) |
| 3V3 (pin 36) | Rotary Encoder Module — VCC (or +) |
| GND | Rotary Encoder Module — GND (or –) |
| GP18 | Passive Buzzer Module — S |
| 3V3 | Passive Buzzer Module — VCC |
| GND | Passive Buzzer Module — GND |
| GP9 | RGB LED Module — R |
| GP10 | RGB LED Module — G |
| GP11 | RGB LED Module — B |
| 3V3 | RGB LED Module — VCC (or +) |
| GND | RGB LED Module — GND |

> **Tip:** The encoder module from the Elegoo kit usually has the pins labeled **CLK, DT, SW, +, –** from left to right. Double-check before wiring! The + is VCC and – is GND.

## The code

```c
/**
 * Lesson 13: Rotary Encoder Module — The Infinite Knob
 * Hardware: Raspberry Pi Pico 2 W  |  Language: C, Pico SDK
 *
 * Uses GPIO interrupts on CLK to detect encoder turns (quadrature decoding).
 * Clockwise = count++, counterclockwise = count--.
 * Count maps to buzzer pitch and RGB LED brightness.
 * Push button (SW) resets count to 0 with a click sound.
 *
 * Wiring:
 *   Encoder CLK/DT/SW → GP2 / GP3 / GP4
 *   Passive Buzzer     → GP18
 *   RGB LED R/G/B      → GP9 / GP10 / GP11
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define ENC_CLK     2    // Clock pin — interrupt fires on falling edge
#define ENC_DT      3    // Data pin — read to determine direction
#define ENC_SW      4    // Push button (active LOW)
#define BUZZER_PIN  18
#define LED_R_PIN    9
#define LED_G_PIN   10
#define LED_B_PIN   11

// ── Encoder state ─────────────────────────────────────────────────────────────
volatile int  enc_count       = 50;    // Start in the middle (range 0-100)
volatile bool count_changed   = false; // ISR signals main loop to update outputs

// ── Debounce ──────────────────────────────────────────────────────────────────
#define DEBOUNCE_US 5000   // 5 ms debounce for CLK
volatile uint64_t last_clk_time = 0;

// ── GPIO interrupt handler ────────────────────────────────────────────────────
// Fires when CLK falls (HIGH → LOW). Read DT at that instant:
//   DT == HIGH → CLK changed before DT → CLOCKWISE → count++
//   DT == LOW  → DT changed first (or simultaneously) → COUNTERCLOCKWISE → count--
void encoder_isr(uint gpio, uint32_t events) {
    uint64_t now = time_us_64();

    // Simple debounce: ignore edges that arrive too soon after the last one
    if ((now - last_clk_time) < DEBOUNCE_US) return;
    last_clk_time = now;

    // Read DT pin NOW (it is already settled before CLK finishes its edge)
    bool dt_state = gpio_get(ENC_DT);

    if (dt_state) {
        // DT is HIGH when CLK falls → CLOCKWISE
        if (enc_count < 100) enc_count++;
    } else {
        // DT is LOW when CLK falls → COUNTERCLOCKWISE
        if (enc_count > 0) enc_count--;
    }

    count_changed = true;
}

// ── Map a value from one range to another ─────────────────────────────────────
// (Like Arduino's map() function)
int32_t map_range(int32_t value, int32_t in_min, int32_t in_max,
                  int32_t out_min, int32_t out_max) {
    return out_min + (value - in_min) * (out_max - out_min) / (in_max - in_min);
}

// ── RGB LED helpers ───────────────────────────────────────────────────────────
void rgb_init(void) {
    gpio_set_function(LED_R_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_G_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_B_PIN, GPIO_FUNC_PWM);

    pwm_set_wrap(pwm_gpio_to_slice_num(LED_R_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_G_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_B_PIN), 255);

    pwm_set_enabled(pwm_gpio_to_slice_num(LED_R_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_G_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_B_PIN), true);
}

// Set RGB to a single white brightness level (0-255)
void rgb_brightness(uint8_t brightness) {
    uint8_t gam = (brightness * brightness) / 255;   // Gamma correction
    pwm_set_gpio_level(LED_R_PIN, gam);
    pwm_set_gpio_level(LED_G_PIN, gam);
    pwm_set_gpio_level(LED_B_PIN, gam);
}

// Set a rainbow color by hue (0-100)
void rgb_hue(int hue) {
    // Divide the hue wheel into 6 color bands (0-16, 17-33, ... 84-100)
    uint8_t r, g, b;
    int h = hue * 6 / 100;        // Which of 6 bands are we in? (0-5)
    int f = (hue * 6 % 100) * 255 / 100;   // Fractional position within band

    switch (h) {
        case 0: r=255;    g=f;      b=0;       break;   // Red → Yellow
        case 1: r=255-f;  g=255;    b=0;       break;   // Yellow → Green
        case 2: r=0;      g=255;    b=f;       break;   // Green → Cyan
        case 3: r=0;      g=255-f;  b=255;     break;   // Cyan → Blue
        case 4: r=f;      g=0;      b=255;     break;   // Blue → Magenta
        default:r=255;    g=0;      b=255-f;   break;   // Magenta → Red
    }
    // Apply gamma correction to each channel
    pwm_set_gpio_level(LED_R_PIN, (r * r) / 255);
    pwm_set_gpio_level(LED_G_PIN, (g * g) / 255);
    pwm_set_gpio_level(LED_B_PIN, (b * b) / 255);
}

// ── Passive buzzer tone ───────────────────────────────────────────────────────
void buzzer_tone(uint freq_hz, uint duration_ms) {
    if (freq_hz == 0) {
        // Silence
        pwm_set_enabled(pwm_gpio_to_slice_num(BUZZER_PIN), false);
        sleep_ms(duration_ms);
        return;
    }
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint32_t clk = clock_get_hz(clk_sys);
    uint32_t div16 = clk / (freq_hz * 256);
    if (div16 < 16) div16 = 16;
    pwm_set_clkdiv_int_frac(slice, div16 / 16, div16 & 0xF);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(BUZZER_PIN, 128);
    pwm_set_enabled(slice, true);
    sleep_ms(duration_ms);
    pwm_set_enabled(slice, false);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

// ── Play a reset "click" on the buzzer ───────────────────────────────────────
void play_reset_sound(void) {
    buzzer_tone(1000, 40);
    buzzer_tone(   0, 20);
    buzzer_tone( 500, 40);
}

// ── Continuous buzzer tone using current count ────────────────────────────────
// This sets up PWM but does NOT block — the tone keeps playing until changed.
void update_buzzer_continuous(int count) {
    // Map count 0-100 → frequency 200-2000 Hz
    uint freq = (uint)map_range(count, 0, 100, 200, 2000);

    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint32_t clk = clock_get_hz(clk_sys);
    uint32_t div16 = clk / (freq * 256);
    if (div16 < 16) div16 = 16;
    pwm_set_clkdiv_int_frac(slice, div16 / 16, div16 & 0xF);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(BUZZER_PIN, 128);
    pwm_set_enabled(slice, true);
}

void stop_buzzer(void) {
    pwm_set_enabled(pwm_gpio_to_slice_num(BUZZER_PIN), false);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 13: Rotary Encoder ===\n");
    printf("Turn the knob to change pitch and color!\n");
    printf("Push the knob to reset to center.\n\n");

    // ── Encoder pin setup ─────────────────────────────────────────────────────
    gpio_init(ENC_CLK);
    gpio_set_dir(ENC_CLK, GPIO_IN);
    gpio_pull_up(ENC_CLK);

    gpio_init(ENC_DT);
    gpio_set_dir(ENC_DT, GPIO_IN);
    gpio_pull_up(ENC_DT);

    gpio_init(ENC_SW);
    gpio_set_dir(ENC_SW, GPIO_IN);
    gpio_pull_up(ENC_SW);   // Active LOW push button

    // Attach interrupt to CLK — fire on FALLING edge only
    gpio_set_irq_enabled_with_callback(
        ENC_CLK,
        GPIO_IRQ_EDGE_FALL,
        true,
        &encoder_isr
    );

    // ── RGB LED and buzzer setup ──────────────────────────────────────────────
    rgb_init();
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);

    // ── Button debounce state ─────────────────────────────────────────────────
    bool last_sw = true;                  // true = released (pull-up HIGH)
    uint64_t last_sw_time = 0;
    const uint64_t SW_DEBOUNCE_US = 20000;   // 20 ms button debounce

    // Show initial state
    int displayed_count = -1;   // Force a first update

    while (true) {
        // ── Check push button with debounce ───────────────────────────────────
        bool sw_now = gpio_get(ENC_SW);
        uint64_t now = time_us_64();

        if (last_sw == true && sw_now == false &&
            (now - last_sw_time) > SW_DEBOUNCE_US) {
            // Button just pressed!
            last_sw_time = now;
            enc_count    = 50;   // Reset to center
            count_changed = true;
            printf("RESET! Count → 50\n");
            stop_buzzer();
            play_reset_sound();
        }
        last_sw = sw_now;

        // ── Update outputs when count changes ─────────────────────────────────
        if (count_changed || enc_count != displayed_count) {
            count_changed   = false;
            displayed_count = enc_count;

            int c = enc_count;   // Local snapshot (ISR might change enc_count)

            // Map count 0-100 → buzzer frequency 200-2000 Hz
            uint freq = (uint)map_range(c, 0, 100, 200, 2000);

            // Map count 0-100 → LED brightness 0-255
            uint8_t bright = (uint8_t)map_range(c, 0, 100, 0, 255);

            // Show rainbow color (hue cycles with count)
            rgb_hue(c);

            // Update continuous buzzer tone
            update_buzzer_continuous(c);

            printf("Count: %3d  |  Freq: %4d Hz  |  Brightness: %3d\n",
                   c, freq, bright);
        }

        sleep_ms(20);   // ~50 Hz update rate
    }
}
```

### How the code works

1. **Interrupt on CLK falling edge** — `encoder_isr` is registered to fire every time the CLK pin goes from HIGH to LOW. At that exact moment, the DT pin will either be HIGH (if you turned clockwise — CLK changed first) or LOW (if you turned counterclockwise — DT changed first). The ISR reads DT immediately and increments or decrements `enc_count`.

2. **Debouncing the CLK signal** — Mechanical switches bounce (make and break contact many times in microseconds before settling). Without debouncing, one click might register as 3–5 counts. The ISR checks how long it has been since the last edge using `time_us_64()`. If less than 5 ms has passed, it ignores the edge completely.

3. **`volatile` variables** — Both `enc_count` and `count_changed` are declared `volatile`. This tells the compiler "this variable might change at any moment from an interrupt — never cache it, always read from memory." Without `volatile`, the compiler might optimize away the check and miss updates from the ISR.

4. **Mapping count to pitch** — The `map_range()` function scales a value from one range to another using proportional math. Count 0 maps to 200 Hz (a low rumble), count 50 maps to 1100 Hz (a medium tone), and count 100 maps to 2000 Hz (a high whistle). The buzzer PWM is updated continuously so the pitch changes while the buzzer is on.

5. **Rainbow color by hue** — `rgb_hue()` divides the count 0–100 into 6 color bands and smoothly blends between them. Hue 0 = red, 17 = yellow, 33 = green, 50 = cyan, 67 = blue, 83 = magenta, 100 = red again. It is the same math used in design programs when you pick a color from a rainbow slider.

6. **Button debounce with timestamp** — The SW button is debounced in the main loop (not in an ISR) by recording the last press time and ignoring new presses that arrive within 20 ms of the last one.

## Try it

1. **Slow turn** — Turn the knob very slowly, one click at a time. Listen to the buzzer pitch change with each click and watch the LED color shift. How many clicks does it take to go from the lowest pitch to the highest?

2. **Fast spin** — Spin the knob quickly in one direction. Does the count keep up with your speed, or do some clicks get missed? Try adjusting `DEBOUNCE_US` — if clicks are missed, lower it; if extra counts appear, raise it.

3. **Reset test** — Spin to a high count (bright, high-pitched), then push the knob button. Does it snap back to the middle instantly? Notice the two-tone reset sound (high then low).

4. **Direction comparison** — Turn the knob clockwise ten clicks. Then turn it counterclockwise ten clicks. Do you end up back where you started? The serial monitor count should return to the same number.

## Challenge

Build a **Theremin simulator!** A theremin is a spooky electronic instrument that musicians play without touching — they just wave their hands near it. Add a Photoresistor Module (GP26/ADC0) alongside the rotary encoder. Use the encoder count to set the base pitch (200–2000 Hz) and use the photoresistor reading (light level) to add a vibrato effect: rapidly oscillate the pitch ±50 Hz at a rate of about 6 times per second when the light level is low (your hand is close). Use `time_us_64()` to time the vibrato oscillation without using `sleep_ms()`. Print the current pitch and vibrato depth to serial. You will have made a real electronic musical instrument!

## Summary

A rotary encoder is a direction-aware click counter that spins forever, unlike a potentiometer that has fixed end-stops. Quadrature decoding — checking which pin changes first — tells the Pico which way you turned the knob, and GPIO interrupts make the response instant so no click is missed. With a count that maps to pitch, brightness, or any other value, an encoder becomes a precise and satisfying control for any project!
