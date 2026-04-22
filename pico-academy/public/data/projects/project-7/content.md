# Project 7: TV Remote Light Controller — Change Colors with Your Remote

## 🎯 What You'll Learn
- How TV remotes send signals using invisible infrared light pulses
- How the NEC IR protocol encodes 32-bit button codes with timing
- How to decode IR signals using GPIO interrupts and microsecond timestamps
- How to map remote button codes to LED colors and effects

---

## 🛒 Parts You Need

| Part | Source | Approx. cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Store / kit | ~$7.00 |
| IR Receiver Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Passive Buzzer Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |
| Any TV / DVD remote control | Around the house | free! |

**Total extra cost beyond the kit: ~$7 for the Pico if you don't already have one.**

---

## 🌟 Background / The Story

Every TV remote in your house is secretly a tiny light transmitter! It uses infrared light — light your eyes can't see. When you press a button, the remote fires a fast pattern of light pulses from the little clear bump at the front. Your IR receiver module catches those pulses and turns them into a signal your Pico can read!

The signal uses a format called the **NEC protocol** — think of it like Morse code for remotes. Every button press sends 32 ones and zeros. Short pause = zero bit, long pause = one bit. At the start there's a big "wake up" burst — 9ms of flashing — so the receiver knows something is coming. Your Pico measures each pause with a timer that counts in millionths of a second, then figures out each bit. At the end you get a unique 32-bit number for every button!

Here's the really cool part: smart bulbs like Philips Hue are controlled the exact same way your RGB LED is — by mixing red, green, and blue light. Press 1 for red, 2 for green, 3 for blue, hit Play for a rainbow! The code starts in "learning mode" that prints each button's hex code so you can set up YOUR specific remote.

---

## Wiring

| From | To | Notes |
|---|---|---|
| IR Receiver Module S | GP16 | Signal output from receiver (active-low pulses) |
| IR Receiver Module VCC | 3V3 | 3.3 V power |
| IR Receiver Module GND | GND | Ground |
| RGB LED R | GP9 | PWM red channel |
| RGB LED G | GP10 | PWM green channel |
| RGB LED B | GP11 | PWM blue channel |
| RGB LED GND | GND | Ground |
| Passive Buzzer S | GP18 | PWM for confirmation beep tone |
| Passive Buzzer VCC | 3V3 | 3.3 V power |
| Passive Buzzer GND | GND | Ground |

**IR receiver orientation tip:** The Elegoo IR receiver module has a small dome-shaped sensor. Point it toward your remote. Keep it away from bright sunlight or fluorescent lights — they produce IR noise that can confuse the decoder. Indoors under a lamp is fine.

---

## The code

```c
/**
 * Project 7: TV Remote Light Controller
 * Build a Smart Home series — Raspberry Pi Pico 2 W, Pico SDK
 *
 * IR Receiver  -> GP16 (interrupt input)
 * RGB LED: R=GP9, G=GP10, B=GP11 (PWM)
 * Passive Buzzer -> GP18 (PWM)
 *
 * Uses NEC IR protocol: 9ms burst + 4.5ms gap + 32 data bits.
 * Run in LEARNING MODE first to discover your remote's button codes,
 * then update the button map below with your own codes.
 */

#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"
#include <stdio.h>
#include <string.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_IR         16
#define PIN_LED_R       9
#define PIN_LED_G      10
#define PIN_LED_B      11
#define PIN_BUZZER     18

// ── NEC timing thresholds (microseconds) ─────────────────────────────────────
#define NEC_START_BURST_MIN   8000    // Start burst: ~9 ms
#define NEC_START_BURST_MAX  10000
#define NEC_START_GAP_MIN     4000    // Start gap: ~4.5 ms
#define NEC_START_GAP_MAX     5000
#define NEC_BIT_BURST_MIN      400    // Data bit burst: ~562 µs
#define NEC_BIT_BURST_MAX      750
#define NEC_ONE_GAP_MIN       1400    // Bit-1 gap: ~1687 µs
#define NEC_ONE_GAP_MAX       1900
#define NEC_ZERO_GAP_MIN       400    // Bit-0 gap: ~562 µs
#define NEC_ZERO_GAP_MAX       750

// ── IR decoder state machine ──────────────────────────────────────────────────
typedef enum {
    IR_IDLE,
    IR_START_BURST,
    IR_START_GAP,
    IR_DATA_BURST,
    IR_DATA_GAP
} IrState;

// Edge buffer — stores timestamps of up to 70 edges from the ISR
#define MAX_EDGES 70
volatile uint64_t edge_times[MAX_EDGES];
volatile int      edge_count    = 0;
volatile bool     frame_ready   = false;
volatile uint64_t last_edge_us  = 0;

// ── Decoded IR result (set by decoder, read by main loop) ─────────────────────
volatile uint32_t ir_code       = 0;
volatile bool     ir_code_ready = false;

// ── GPIO interrupt: record timestamp of every falling edge on IR pin ──────────
// The IR receiver outputs LOW during a burst, HIGH during a gap.
// We capture every edge to measure burst and gap lengths.
void ir_isr(uint gpio, uint32_t events) {
    uint64_t now = time_us_64();

    if (edge_count < MAX_EDGES) {
        edge_times[edge_count++] = now;
    }

    last_edge_us = now;
}

// ── Decode NEC frame from the captured edge timestamps ────────────────────────
// Returns true and sets *code if a valid 32-bit NEC frame is found.
bool decode_nec(uint32_t *code) {
    if (edge_count < 34) return false;  // Need at least start + 32 bits

    // Work on a local copy to avoid ISR interference
    int    count = edge_count;
    uint64_t t[MAX_EDGES];
    for (int i = 0; i < count && i < MAX_EDGES; i++) t[i] = edge_times[i];

    // Edge 0: falling edge (start of 9ms burst)
    // Edge 1: rising edge  (end of 9ms burst, start of 4.5ms gap)
    // Edge 2: falling edge (start of first data bit burst)
    // Then alternating burst/gap for 32 bits...

    // Check start burst length
    if (count < 2) return false;
    uint64_t start_burst = t[1] - t[0];
    if (start_burst < NEC_START_BURST_MIN || start_burst > NEC_START_BURST_MAX) {
        return false;
    }

    // Check start gap length
    if (count < 3) return false;
    uint64_t start_gap = t[2] - t[1];
    if (start_gap < NEC_START_GAP_MIN || start_gap > NEC_START_GAP_MAX) {
        return false;
    }

    // Decode 32 data bits
    // Each bit uses two edges: a burst then a gap.
    // We look at gap length: short = 0, long = 1.
    uint32_t result = 0;
    int edge_idx = 2;   // Points to falling edge of first data bit

    for (int bit = 0; bit < 32; bit++) {
        int fall_idx = edge_idx;       // Falling edge (start of burst)
        int rise_idx = edge_idx + 1;   // Rising edge  (end of burst)
        int next_fall = edge_idx + 2;  // Falling edge (start of next burst or stop)

        if (rise_idx >= count) return false;

        // Verify burst length
        uint64_t burst = t[rise_idx] - t[fall_idx];
        if (burst < NEC_BIT_BURST_MIN || burst > NEC_BIT_BURST_MAX) return false;

        if (bit < 31) {
            // Gap to next bit
            if (next_fall >= count) return false;
            uint64_t gap = t[next_fall] - t[rise_idx];

            if (gap >= NEC_ONE_GAP_MIN && gap <= NEC_ONE_GAP_MAX) {
                result |= (1u << bit);   // Bit is 1 (LSB first in NEC)
            } else if (gap >= NEC_ZERO_GAP_MIN && gap <= NEC_ZERO_GAP_MAX) {
                // Bit is 0, nothing to set
            } else {
                return false;   // Timing doesn't match either value
            }
        }

        edge_idx += 2;
    }

    *code = result;
    return true;
}

// ── PWM helpers ───────────────────────────────────────────────────────────────
void pwm_init_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(pin), 0);
}

void set_brightness(uint pin, uint8_t v) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(pin), pwm_gpio_to_channel(pin), v);
}

void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    set_brightness(PIN_LED_R, r);
    set_brightness(PIN_LED_G, g);
    set_brightness(PIN_LED_B, b);
}

// ── Short confirmation beep using PWM buzzer ──────────────────────────────────
void beep(int freq_hz, int duration_ms) {
    uint slice = pwm_gpio_to_slice_num(PIN_BUZZER);
    uint chan  = pwm_gpio_to_channel(PIN_BUZZER);

    // Set PWM frequency: wrap = sys_clock / freq (approx, using clock divider 1)
    // Pico runs at 125 MHz by default
    uint32_t wrap = 125000000 / freq_hz;
    if (wrap > 65535) wrap = 65535;   // Clamp to 16-bit
    pwm_set_clkdiv(slice, 4.0f);      // Divide clock to get audible range
    pwm_set_wrap(slice, wrap / 4);
    pwm_set_chan_level(slice, chan, (wrap / 4) / 2);  // 50% duty
    pwm_set_enabled(slice, true);
    sleep_ms(duration_ms);
    pwm_set_chan_level(slice, chan, 0);   // Silence
    sleep_ms(20);
}

// ── Smooth rainbow cycle ──────────────────────────────────────────────────────
void rainbow_step(int *hue) {
    // Convert hue (0-360) to RGB
    int h = *hue % 360;
    int r = 0, g = 0, b = 0;
    int sector = h / 60;
    int frac   = h % 60;  // 0-59, scaled later

    switch (sector) {
        case 0: r = 255;          g = frac * 255 / 59; b = 0;   break;
        case 1: r = (59-frac)*255/59; g = 255;         b = 0;   break;
        case 2: r = 0;            g = 255;         b = frac*255/59; break;
        case 3: r = 0;            g = (59-frac)*255/59; b = 255; break;
        case 4: r = frac*255/59;  g = 0;           b = 255;     break;
        case 5: r = 255;          g = 0;           b = (59-frac)*255/59; break;
    }
    set_rgb((uint8_t)r, (uint8_t)g, (uint8_t)b);
    *hue = (*hue + 2) % 360;   // Advance hue
}

// ── Button code map ───────────────────────────────────────────────────────────
// These are EXAMPLE codes from a common generic remote.
// Run the program, press each button, and read the printed hex code.
// Then replace the values below with YOUR remote's codes!
#define BTN_1       0x00FF6897   // Example: key "1"
#define BTN_2       0x00FF9867
#define BTN_3       0x00FFB04F
#define BTN_4       0x00FF30CF
#define BTN_5       0x00FF18E7
#define BTN_6       0x00FF7A85
#define BTN_7       0x00FF10EF
#define BTN_8       0x00FF38C7
#define BTN_VOL_UP  0x00FF629D
#define BTN_VOL_DN  0x00FFA857
#define BTN_CH_UP   0x00FFE21D
#define BTN_CH_DN   0x00FF22DD
#define BTN_PLAY    0x00FF02FD   // Play / OK button

// Current brightness level (0-255), global so vol buttons can adjust it
int g_brightness = 200;

// Apply a colour with the current brightness
void set_colour_bright(uint8_t r, uint8_t g, uint8_t b) {
    set_rgb(
        (uint8_t)((int)r * g_brightness / 255),
        (uint8_t)((int)g * g_brightness / 255),
        (uint8_t)((int)b * g_brightness / 255)
    );
}

// Colour presets for CH+/CH- cycling
typedef struct { uint8_t r, g, b; const char *name; } Colour;
static const Colour presets[] = {
    {255,   0,   0, "Red"},
    {255, 165,   0, "Orange"},
    {255, 255,   0, "Yellow"},
    {  0, 255,   0, "Green"},
    {  0, 255, 255, "Cyan"},
    {  0,   0, 255, "Blue"},
    {148,   0, 211, "Purple"},
    {255, 255, 255, "White"},
};
#define NUM_PRESETS (int)(sizeof(presets) / sizeof(presets[0]))
int g_preset_idx = 0;

// ── Handle a decoded button code ──────────────────────────────────────────────
bool g_rainbow_mode = false;

void handle_button(uint32_t code) {
    printf("Button code: 0x%08X\n", code);
    beep(1047, 40);   // Short C-note confirmation beep

    g_rainbow_mode = false;   // Most buttons cancel rainbow mode

    if (code == BTN_1) {
        set_colour_bright(255, 0, 0);
        printf("  -> Red\n");
    } else if (code == BTN_2) {
        set_colour_bright(0, 255, 0);
        printf("  -> Green\n");
    } else if (code == BTN_3) {
        set_colour_bright(0, 0, 255);
        printf("  -> Blue\n");
    } else if (code == BTN_4) {
        set_colour_bright(255, 255, 0);
        printf("  -> Yellow\n");
    } else if (code == BTN_5) {
        set_colour_bright(0, 255, 255);
        printf("  -> Cyan\n");
    } else if (code == BTN_6) {
        set_colour_bright(148, 0, 211);
        printf("  -> Purple\n");
    } else if (code == BTN_7) {
        set_colour_bright(255, 255, 255);
        printf("  -> White\n");
    } else if (code == BTN_8) {
        set_rgb(0, 0, 0);
        printf("  -> Off\n");
    } else if (code == BTN_VOL_UP) {
        g_brightness = (g_brightness + 30 > 255) ? 255 : g_brightness + 30;
        printf("  -> Brighter (%d/255)\n", g_brightness);
        // Re-apply current preset at new brightness
        set_colour_bright(presets[g_preset_idx].r,
                          presets[g_preset_idx].g,
                          presets[g_preset_idx].b);
    } else if (code == BTN_VOL_DN) {
        g_brightness = (g_brightness - 30 < 0) ? 0 : g_brightness - 30;
        printf("  -> Dimmer (%d/255)\n", g_brightness);
        set_colour_bright(presets[g_preset_idx].r,
                          presets[g_preset_idx].g,
                          presets[g_preset_idx].b);
    } else if (code == BTN_CH_UP) {
        g_preset_idx = (g_preset_idx + 1) % NUM_PRESETS;
        const Colour *c = &presets[g_preset_idx];
        set_colour_bright(c->r, c->g, c->b);
        printf("  -> Colour preset: %s\n", c->name);
    } else if (code == BTN_CH_DN) {
        g_preset_idx = (g_preset_idx - 1 + NUM_PRESETS) % NUM_PRESETS;
        const Colour *c = &presets[g_preset_idx];
        set_colour_bright(c->r, c->g, c->b);
        printf("  -> Colour preset: %s\n", c->name);
    } else if (code == BTN_PLAY) {
        g_rainbow_mode = true;
        printf("  -> Rainbow mode!\n");
        beep(880, 60);
        beep(1047, 60);
        beep(1319, 100);
    } else {
        printf("  -> Unknown button — add it to the map!\n");
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);

    printf("================================================\n");
    printf("  Project 7: TV Remote Light Controller\n");
    printf("  Smart Home Series — Pico 2 W\n");
    printf("================================================\n");
    printf("LEARNING MODE: Press buttons on your remote.\n");
    printf("The hex code for each button will print here.\n");
    printf("Update the #define BTN_x values in the code\n");
    printf("with the codes you see for YOUR remote!\n\n");

    // IR receiver input — interrupt on both edges to capture all transitions
    gpio_init(PIN_IR);
    gpio_set_dir(PIN_IR, GPIO_IN);
    gpio_pull_up(PIN_IR);   // IR receiver output is idle-HIGH
    gpio_set_irq_enabled_with_callback(
        PIN_IR,
        GPIO_IRQ_EDGE_RISE | GPIO_IRQ_EDGE_FALL,
        true,
        &ir_isr
    );

    // RGB LED PWM
    pwm_init_pin(PIN_LED_R);
    pwm_init_pin(PIN_LED_G);
    pwm_init_pin(PIN_LED_B);

    // Passive buzzer PWM
    gpio_set_function(PIN_BUZZER, GPIO_FUNC_PWM);
    pwm_set_enabled(pwm_gpio_to_slice_num(PIN_BUZZER), true);

    // Startup: blue sweep
    for (int i = 0; i <= 255; i += 5) {
        set_rgb(0, 0, (uint8_t)i);
        sleep_ms(8);
    }
    set_rgb(0, 0, 255);
    beep(523, 80);
    beep(659, 80);
    beep(784, 120);
    set_rgb(0, 0, 0);

    int rainbow_hue = 0;

    while (true) {
        // ── Check if enough time has passed since last IR edge ────────────────
        // If > 5 ms have passed since the last edge, the frame is probably complete.
        bool try_decode = false;
        if (edge_count > 10) {
            uint64_t now = time_us_64();
            if (now - last_edge_us > 5000) {
                try_decode = true;
            }
        }

        if (try_decode) {
            uint32_t code = 0;
            bool ok = decode_nec(&code);

            // Reset the edge buffer regardless (ready for next frame)
            edge_count = 0;

            if (ok) {
                handle_button(code);
            }
        }

        // ── Rainbow mode runs continuously ────────────────────────────────────
        if (g_rainbow_mode) {
            rainbow_step(&rainbow_hue);
            sleep_ms(15);
        } else {
            sleep_ms(5);
        }
    }

    return 0;
}
```

---

## How the code works

1. **IR receiver and the ISR:** The IR receiver module outputs a clean digital signal — LOW during a light burst, HIGH during a gap. The GPIO interrupt fires on every edge (rising and falling), and the ISR records a precise microsecond timestamp for each one into the `edge_times[]` array. It does nothing else — keeping ISRs short is very important so the Pico does not miss other things.

2. **Frame detection in the main loop:** After collecting edges, the main loop checks `time_us_64()` to see if more than 5 ms has passed since the last edge. If so, the remote has stopped transmitting and the frame is complete — time to decode.

3. **`decode_nec()` function:** This function inspects pairs of timestamps. First it checks that the opening burst lasts about 9 ms and the gap lasts about 4.5 ms — the NEC "handshake." Then for each of the 32 data bits it measures the gap after each burst: short gap (~562 µs) = zero, long gap (~1687 µs) = one. If every measurement falls within the expected ranges, it returns the 32-bit code.

4. **Button map with `#define`:** Each `BTN_x` constant is a hex number. When `handle_button()` sees that code, it sets the matching RGB colour. Because these are `#define` constants at the top of the file, you only need to change one line per button to remap your whole remote.

5. **Brightness and presets:** `g_brightness` is a global that scales all colour values proportionally, so VOL+ and VOL- work for any colour. The CH+/CH- buttons step through an array of eight `Colour` structs.

6. **Rainbow mode:** When `g_rainbow_mode` is `true`, the main loop calls `rainbow_step()` every 15 ms, which converts a hue angle (0–360°) into RGB values using the classic HSV-to-RGB formula and advances the hue by 2° each time.

---

## Try it

1. **Learning mode first:** Open the serial monitor, point your remote at the receiver, and press every button. Write down the hex code that appears for each button you want to use. Then update the `#define BTN_x` lines at the top of the code and re-flash.

2. **Create your own colour:** Add a new `#define BTN_MUTE` with the hex code for your remote's mute button, then add an `else if` block that sets a custom colour like warm white (`set_colour_bright(255, 200, 100)`).

3. **Brightness test:** Set the LED to white and use VOL+ / VOL- repeatedly. Watch how the colour looks the same (white) but gets brighter and dimmer. This is how real smart bulbs work — they change intensity without changing the colour balance.

4. **Reaction time game:** Point the remote behind your back at the ceiling (IR bounces off walls!). Can you still change the colour? What is the maximum angle you can use and still have it work?

---

## Challenge

**Scene presets:** Add four "scene" buttons (like 0, BACK, MENU, and INFO on your remote) that each set a specific mood:
- "Movie night" — very dim red (20, 0, 0)
- "Homework" — bright white (255, 255, 220)
- "Party" — starts rainbow mode automatically
- "Bedtime" — slow pulse from dim orange to off and back

For the pulse effect, use a loop inside the scene with `sin()` or just increment/decrement a brightness variable slowly with `sleep_ms(20)` between each step.

---

## Summary

You decoded a real industry-standard IR protocol (NEC) by measuring nanosecond-scale pulse widths, built a button-code learning system, and used those codes to drive a full-featured RGB smart light controller with brightness, colour presets, and rainbow mode. You learned how GPIO interrupts capture timing data, why ISRs must be short, and how to use a `struct` array as a lookup table for colour presets — all skills that professional firmware engineers use every single day.

---

## How this fits the Smart Home

Smart lighting is one of the most popular smart-home upgrades — products like Philips Hue, LIFX, and Govee strips all work on the same idea: software control of red, green, and blue LEDs. Your project 7 adds remote-controlled smart lighting to your home, so you can change the mood of your room without getting up from the sofa. That is project 7 done: the house now has automatic lights, a doorbell, clap control, window alarms, fire detection, a perimeter laser, and now a remote-controlled colour light. You are basically living in the future!
