# Project 11: Touch-Activated Mood Lamp — Tap to Change the Vibe

## What you'll learn
- How capacitive touch sensors detect your finger (and why it works!)
- How to cycle through "moods" using an enum in C
- How to control LED colour and brightness with PWM
- How to use a rotary encoder as a real hardware knob
- How to write interrupt handlers so the Pico never misses a tap

## Parts you'll need (with costs + total)

| Part | Where it comes from | Approximate cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Your kit / bought separately | $7.00 |
| Touch Sensor Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Rotary Encoder Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |

**Estimated total (if buying everything new):** ~$15–$20

## Background

Have you ever tapped the base of a bedside lamp and watched it change brightness without pressing any button? That is a **capacitive touch sensor** doing its job. Your finger carries a tiny electrical charge — the same charge that lets you swipe a smartphone screen. When your finger gets close to the sensor's metal pad, the electronics inside notice that charge arriving and send a signal to the Pico. No moving parts, no wear, no clicking — just a gentle tap!

Modern smart lamps from companies like IKEA (the "TRÅDFRI" range) and Philips Hue come with colour presets called "moods." A warm orange glow for movie night, a cool white for doing homework, a soft blue for winding down before bed. Those lamps cost $30–$100 each. Yours costs almost nothing extra, and you built the whole thing yourself!

The rotary encoder is your brightness dial — like the volume knob on a speaker, except it controls light instead of sound. Turn it clockwise to brighten the room, anticlockwise to dim it. You can also push the encoder knob like a button to toggle the lamp on and off entirely. When you switch it back on, it remembers exactly which mood and brightness you had before. Smart!

## Wiring

| From | To | Notes |
|---|---|---|
| Touch Sensor **S** | GP14 | Signal — triggers interrupt on rising edge |
| Touch Sensor **VCC** | 3V3 | 3.3 V power |
| Touch Sensor **GND** | GND | Ground |
| RGB LED **R** | GP9 | PWM — red channel |
| RGB LED **G** | GP10 | PWM — green channel |
| RGB LED **B** | GP11 | PWM — blue channel |
| RGB LED **GND** | GND | Common cathode ground |
| Rotary Encoder **CLK** | GP2 | Clock pulse (interrupt on falling edge) |
| Rotary Encoder **DT** | GP3 | Direction data |
| Rotary Encoder **SW** | GP4 | Push-button (active LOW, interrupt) |
| Rotary Encoder **VCC** | 3V3 | 3.3 V power |
| Rotary Encoder **GND** | GND | Ground |

> **Tip:** The RGB LED module already has resistors built in, so you can plug it straight into GPIO pins — no extra resistors needed on the breadboard!

## The code

```c
/**
 * Project 11: Touch-Activated Mood Lamp
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Tap the touch sensor to cycle through colour moods.
 * Turn the rotary encoder to adjust brightness (10-100%).
 * Push the encoder knob to toggle the lamp on/off.
 *
 * Moods: OFF -> Cozy (amber) -> Calm (blue) -> Focus (white)
 *        -> Chill (green) -> Party (rainbow) -> OFF ...
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define PIN_TOUCH     14   // Touch sensor signal
#define PIN_RED        9   // RGB LED red channel   (PWM)
#define PIN_GREEN     10   // RGB LED green channel (PWM)
#define PIN_BLUE      11   // RGB LED blue channel  (PWM)
#define PIN_ENC_CLK    2   // Rotary encoder clock
#define PIN_ENC_DT     3   // Rotary encoder data (direction)
#define PIN_ENC_SW     4   // Rotary encoder push-button

// ── Timing constants ─────────────────────────────────────────────────────────
#define TOUCH_DEBOUNCE_US  200000ULL   // 200 ms in microseconds
#define ENC_DEBOUNCE_US     10000ULL   //  10 ms in microseconds
#define RAINBOW_STEP_US     15000ULL   // ~67 colour steps per second

// ── Brightness limits ────────────────────────────────────────────────────────
#define BRIGHTNESS_MIN   10   // 10%  — always a little visible
#define BRIGHTNESS_MAX  100   // 100% — full power
#define BRIGHTNESS_STEP   5   // each encoder click = 5%

// ── Mood enum ────────────────────────────────────────────────────────────────
typedef enum {
    MOOD_OFF = 0,
    MOOD_COZY,     // warm amber
    MOOD_CALM,     // cool blue
    MOOD_FOCUS,    // bright white
    MOOD_CHILL,    // soft green
    MOOD_PARTY,    // animated rainbow
    MOOD_COUNT     // total number of moods — used for cycling
} Mood;

// ── Colour presets: {R, G, B} in 0-255 ───────────────────────────────────────
static const uint8_t MOOD_COLOURS[MOOD_COUNT][3] = {
    {  0,   0,   0},   // MOOD_OFF
    {255,  80,  20},   // MOOD_COZY  — warm amber, like candlelight
    { 20,  80, 255},   // MOOD_CALM  — cool blue, like a clear sky
    {255, 255, 255},   // MOOD_FOCUS — pure white, great for reading
    {100, 255, 100},   // MOOD_CHILL — soft green, like a forest
    {  0,   0,   0},   // MOOD_PARTY — animated; handled separately
};

static const char *MOOD_NAMES[MOOD_COUNT] = {
    "OFF", "Cozy", "Calm", "Focus", "Chill", "Party"
};

// ── Global state (shared between ISR and main loop) ──────────────────────────
volatile Mood     g_mood            = MOOD_OFF;
volatile int      g_brightness      = 70;      // percent (10-100)
volatile bool     g_lamp_on         = false;
volatile bool     g_mood_changed    = false;   // set by ISR, read in main
volatile bool     g_toggle_changed  = false;   // encoder button flag

volatile uint64_t g_last_touch_us   = 0;
volatile uint64_t g_last_enc_us     = 0;
volatile uint64_t g_last_enc_sw_us  = 0;

// ── PWM helpers ──────────────────────────────────────────────────────────────

// Configure one GPIO pin as a PWM output with 8-bit resolution (0-255)
void pwm_setup_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);      // 256 levels: 0 (off) to 255 (full on)
    pwm_set_enabled(slice, true);
}

// Write a colour value scaled by the current brightness percentage
void pwm_write_scaled(uint pin, uint8_t value, int brightness_pct) {
    uint slice   = pwm_gpio_to_slice_num(pin);
    uint channel = pwm_gpio_to_channel(pin);
    // Scale: e.g. value=255, brightness=50% -> level=127
    uint level   = (uint)value * (uint)brightness_pct / 100u;
    pwm_set_chan_level(slice, channel, level);
}

// Apply a mood's colour to the RGB LED right now
void apply_mood(Mood mood, int brightness_pct) {
    if (!g_lamp_on || mood == MOOD_OFF) {
        // Turn everything off
        pwm_write_scaled(PIN_RED,   0, 100);
        pwm_write_scaled(PIN_GREEN, 0, 100);
        pwm_write_scaled(PIN_BLUE,  0, 100);
        return;
    }
    if (mood != MOOD_PARTY) {
        // Fixed colour from lookup table
        pwm_write_scaled(PIN_RED,   MOOD_COLOURS[mood][0], brightness_pct);
        pwm_write_scaled(PIN_GREEN, MOOD_COLOURS[mood][1], brightness_pct);
        pwm_write_scaled(PIN_BLUE,  MOOD_COLOURS[mood][2], brightness_pct);
    }
    // MOOD_PARTY is animated in the main loop — nothing to do here
}

// ── Colour wheel for Party mode ───────────────────────────────────────────────
// Maps a 0-255 position to a smooth rainbow colour (R, G, B output).
// As position increases, the colour travels: red->yellow->green->cyan->blue->magenta->red
void colour_wheel(uint8_t pos, uint8_t *r, uint8_t *g, uint8_t *b) {
    pos = 255 - pos;   // reverse so it goes in the "natural" colour order
    if (pos < 85) {
        *r = 255 - pos * 3;
        *g = 0;
        *b = pos * 3;
    } else if (pos < 170) {
        pos -= 85;
        *r = 0;
        *g = pos * 3;
        *b = 255 - pos * 3;
    } else {
        pos -= 170;
        *r = pos * 3;
        *g = 255 - pos * 3;
        *b = 0;
    }
}

// ── Interrupt service routine — touch sensor ──────────────────────────────────
// Fires on the rising edge when you tap the sensor.
// Keeps it SHORT: just updates state and sets a flag.
void gpio_callback(uint gpio, uint32_t events) {
    uint64_t now = time_us_64();

    // ── Touch sensor tap ─────────────────────────────────────────────────────
    if (gpio == PIN_TOUCH && (events & GPIO_IRQ_EDGE_RISE)) {
        if ((now - g_last_touch_us) < TOUCH_DEBOUNCE_US) return;
        g_last_touch_us = now;

        // Advance to the next mood, wrapping after MOOD_PARTY back to MOOD_OFF
        g_mood = (Mood)((g_mood + 1) % MOOD_COUNT);
        g_lamp_on = (g_mood != MOOD_OFF);
        g_mood_changed = true;
    }

    // ── Encoder rotation — CLK falling edge ──────────────────────────────────
    if (gpio == PIN_ENC_CLK && (events & GPIO_IRQ_EDGE_FALL)) {
        if ((now - g_last_enc_us) < ENC_DEBOUNCE_US) return;
        g_last_enc_us = now;

        // DT pin state at the moment CLK fell tells us the direction
        if (gpio_get(PIN_ENC_DT)) {
            // DT is HIGH when CLK falls → clockwise → brighter
            g_brightness += BRIGHTNESS_STEP;
            if (g_brightness > BRIGHTNESS_MAX) g_brightness = BRIGHTNESS_MAX;
        } else {
            // DT is LOW when CLK falls → counter-clockwise → dimmer
            g_brightness -= BRIGHTNESS_STEP;
            if (g_brightness < BRIGHTNESS_MIN) g_brightness = BRIGHTNESS_MIN;
        }
        g_mood_changed = true;   // Trigger a display update in main loop
    }

    // ── Encoder push-button — SW falling edge ─────────────────────────────────
    if (gpio == PIN_ENC_SW && (events & GPIO_IRQ_EDGE_FALL)) {
        if ((now - g_last_enc_sw_us) < TOUCH_DEBOUNCE_US) return;
        g_last_enc_sw_us = now;
        g_lamp_on = !g_lamp_on;
        g_toggle_changed = true;
    }
}

// ── main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(1500);   // Give the serial monitor time to connect

    printf("\n=========================================\n");
    printf(" Project 11: Touch-Activated Mood Lamp\n");
    printf("=========================================\n");
    printf("Tap the touch sensor to cycle moods.\n");
    printf("Turn the encoder knob to adjust brightness.\n");
    printf("Push the encoder knob to toggle on/off.\n\n");

    // ── PWM for RGB LED ───────────────────────────────────────────────────────
    pwm_setup_pin(PIN_RED);
    pwm_setup_pin(PIN_GREEN);
    pwm_setup_pin(PIN_BLUE);
    apply_mood(MOOD_OFF, g_brightness);   // Start with lamp off

    // ── Touch sensor ──────────────────────────────────────────────────────────
    gpio_init(PIN_TOUCH);
    gpio_set_dir(PIN_TOUCH, GPIO_IN);
    gpio_pull_down(PIN_TOUCH);   // Sensor output is LOW at rest
    gpio_set_irq_enabled_with_callback(PIN_TOUCH,
        GPIO_IRQ_EDGE_RISE, true, &gpio_callback);

    // ── Rotary encoder pins ───────────────────────────────────────────────────
    gpio_init(PIN_ENC_CLK);
    gpio_set_dir(PIN_ENC_CLK, GPIO_IN);
    gpio_pull_up(PIN_ENC_CLK);

    gpio_init(PIN_ENC_DT);
    gpio_set_dir(PIN_ENC_DT, GPIO_IN);
    gpio_pull_up(PIN_ENC_DT);

    gpio_init(PIN_ENC_SW);
    gpio_set_dir(PIN_ENC_SW, GPIO_IN);
    gpio_pull_up(PIN_ENC_SW);   // Button pulls to GND when pressed

    // Add interrupts for CLK and SW — they share the same callback function
    gpio_set_irq_enabled(PIN_ENC_CLK, GPIO_IRQ_EDGE_FALL, true);
    gpio_set_irq_enabled(PIN_ENC_SW,  GPIO_IRQ_EDGE_FALL, true);

    // ── Party mode animation state ────────────────────────────────────────────
    uint8_t  rainbow_pos     = 0;
    uint64_t last_rainbow_us = 0;

    printf("Lamp is OFF. Tap the sensor to begin!\n\n");

    // ── Main loop ─────────────────────────────────────────────────────────────
    while (true) {

        // Process mood change (touch tap or encoder turn)
        if (g_mood_changed) {
            g_mood_changed = false;

            if (g_mood != MOOD_PARTY) {
                apply_mood(g_mood, g_brightness);
            }
            printf("Mood: %-6s | Brightness: %3d%%\n",
                   MOOD_NAMES[g_mood], g_brightness);
        }

        // Process encoder button toggle
        if (g_toggle_changed) {
            g_toggle_changed = false;
            if (g_lamp_on) {
                apply_mood(g_mood, g_brightness);
                printf("Lamp ON  — mood: %s at %d%%\n",
                       MOOD_NAMES[g_mood], g_brightness);
            } else {
                apply_mood(MOOD_OFF, g_brightness);
                printf("Lamp OFF — mood saved: %s\n", MOOD_NAMES[g_mood]);
            }
        }

        // Animate Party rainbow
        if (g_mood == MOOD_PARTY && g_lamp_on) {
            uint64_t now = time_us_64();
            if ((now - last_rainbow_us) >= RAINBOW_STEP_US) {
                last_rainbow_us = now;
                rainbow_pos++;   // uint8_t wraps 255 -> 0 automatically

                uint8_t r, g_val, b;
                colour_wheel(rainbow_pos, &r, &g_val, &b);
                pwm_write_scaled(PIN_RED,   r,     g_brightness);
                pwm_write_scaled(PIN_GREEN, g_val, g_brightness);
                pwm_write_scaled(PIN_BLUE,  b,     g_brightness);
            }
        }

        sleep_ms(5);   // Small rest — keeps the loop snappy without burning CPU
    }

    return 0;
}
```

## How the code works

1. **PWM setup** — `pwm_setup_pin()` configures each RGB LED pin with a wrap value of 255, giving 256 brightness levels per colour channel. Mixing different levels of red, green, and blue together creates any colour — just like mixing paint, but with light.

2. **The mood enum** — Instead of plain numbers like `0`, `1`, `2`, we use named constants: `MOOD_OFF`, `MOOD_COZY`, etc. This makes the code read almost like English. The special `MOOD_COUNT` entry tells us how many moods exist, so the cycling formula `(g_mood + 1) % MOOD_COUNT` always wraps back to zero automatically — no matter how many moods you add later.

3. **Touch interrupt** — The `gpio_callback` function fires the instant GP14 goes HIGH. It checks that at least 200 ms have passed since the last tap (that is the debounce), then advances the mood and sets the `g_mood_changed` flag. The actual LED update happens in the main loop — keeping the interrupt function very short and fast is good practice.

4. **Encoder rotation** — When the CLK pin falls, the DT pin is sampled immediately. If DT is HIGH, the knob turned clockwise (brightness goes up). If DT is LOW, it turned anticlockwise (brightness goes down). The value is clamped between 10% and 100%.

5. **Encoder button** — A separate falling-edge interrupt on SW flips `g_lamp_on`. The mood and brightness are remembered in variables, so toggling back on restores exactly what you had before.

6. **Colour wheel (Party mode)** — The `colour_wheel()` function maps a single 0–255 number to a smoothly changing RGB colour. The main loop increments `rainbow_pos` every 15 ms, producing a gentle colour rotation. `uint8_t` wraps from 255 back to 0 automatically, so the loop is endless.

7. **Flag pattern** — The interrupts only flip boolean flags (`g_mood_changed`, `g_toggle_changed`). The main loop checks those flags and does the real work. This is a classic embedded programming pattern: interrupts are messengers, the main loop is the worker.

## Try it

1. **Tap through all six moods.** Count the taps to get back to OFF — it should take exactly six. Notice how the serial monitor prints each mood name and the current brightness.

2. **Set the mood to Cozy, then turn the encoder all the way down to 10%.** Now tap to Party mode. The rainbow still cycles, just very dimly! Turn the brightness back up to 100% and enjoy the show.

3. **Set Focus mode (bright white), then push the encoder knob to toggle the lamp off.** Wait five seconds, then push again. Does it come back on in Focus mode? It should — the `g_lamp_on` variable is separate from `g_mood`.

4. **Open the serial monitor.** Change mood and brightness several times. Can you read the log and reconstruct exactly what you did, just from the printout? This kind of logging is how real engineers debug hardware.

## Challenge

Add a **"Sunset" mood** that slowly fades from bright white (noon) through warm orange (sunset) to deep red (dusk) over 30 seconds, then stays at a dim red glow. You will need to: add `MOOD_SUNSET` to the enum, handle it in the main loop (similar to `MOOD_PARTY`), and use `time_us_64()` to pace the colour changes through a series of waypoints.

## Summary

You built a touch-activated mood lamp that cycles through six colour presets and lets you dial brightness with a real physical knob — all without a single switch or slider. You used hardware interrupts to make the Pico respond instantly to taps, PWM to mix millions of possible colours from just three LED channels, and a rotary encoder as a proper hardware dial. Real commercial smart lamps use every single one of these techniques.

## How this fits the Smart Home

Your Smart Home now has intelligent ambient lighting that responds to touch — no fumbling for a switch in the dark! In a real smart home, mood lamps are often linked to the time of day (warm light in the evening for relaxation, cool white in the morning to wake you up) or even synced to music. You have built the foundation: mood presets, PWM colour mixing, and brightness control are the exact core features of every smart lighting system on the market today.
