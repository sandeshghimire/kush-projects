# RGB Status Bar (Neopixels + PIO)

## What you'll learn
- What addressable RGB LEDs (WS2812 / Neopixels) are and how they work
- How the Pico 2's PIO (Programmable I/O) state machines generate precise signals
- How to write a PIO program that speaks the WS2812 protocol
- How to display status colors and animated patterns
- How PIO frees the CPU to do other work while handling timing-critical signals

## Parts you'll need
- WS2812 (Neopixel) LED strip, 8 LEDs (~$4)

## Background

Regular LEDs are either on or off. But **Neopixels** (also called WS2812 LEDs) are magical — each LED has a tiny computer chip built right into it! You send it a color (as red, green, and blue values), and it lights up in exactly that color. Even better, you can chain them together on a single wire, and each LED grabs its own color from the data stream then passes the rest along to the next LED. It's like a bucket brigade where each person takes one bucket and passes the rest down the line.

The tricky part is timing. The WS2812 protocol requires extremely precise pulses — we're talking about signals that change every few hundred **nanoseconds** (billionths of a second). That's way too fast for normal code because any interruption (like handling a timer) would mess up the signal.

This is where the Pico 2's secret weapon comes in: **PIO** (Programmable I/O). The Pico has special mini-processors that do nothing but wiggle pins with perfect timing. We write a tiny program (just a few instructions!) that tells the PIO exactly how to create the WS2812 signal. Then the PIO handles all the timing while our main code is free to read sensors and drive motors. It's like having a helper who does one specific job perfectly so you can focus on everything else.

We'll use 8 LEDs as a status bar: blue when idle, green when driving, red when an obstacle is detected, and a rainbow celebration pattern when a mission is complete!

## Wiring

| WS2812 Wire | Pico 2 Pin | Notes |
|-------------|------------|-------|
| DIN (Data)  | GP28 (pin 34) | Data input |
| VCC (5V)    | VBUS (pin 40) | 5V from USB |
| GND         | GND (pin 38)  | Ground |

> **Note:** WS2812 LEDs are 5V but accept 3.3V logic from the Pico. If colors are unreliable, add a level shifter, but most strips work fine at 3.3V.

## The code

```c
#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"

#define WS2812_PIN   28
#define NUM_LEDS     8

// --- PIO program for WS2812 ---
// This tiny program generates the precise timing the LEDs need.
// A '1' bit = long high pulse then short low
// A '0' bit = short high pulse then long low

// PIO assembly (we encode it manually as uint16_t instructions)
// .wrap_target
//   out x, 1       side 0 [2]   ; shift 1 bit into x, hold low for 3 cycles
//   jmp !x, do_zero side 1 [1]  ; if bit is 0, jump; hold high for 2 cycles
//   jmp wrap_target side 1 [4]  ; bit is 1: hold high for 5 more cycles
// do_zero:
//   nop            side 0 [4]   ; bit is 0: hold low for 5 cycles
// .wrap

static const uint16_t ws2812_program[] = {
    0x6121, // out x, 1       side 0 [2]
    0x1523, // jmp !x, 3      side 1 [1]
    0x1400, // jmp 0          side 1 [4]
    0xa442, // nop            side 0 [4]
};

static PIO pio = pio0;
static uint sm = 0;
static uint32_t led_buffer[NUM_LEDS];

// Load and configure the PIO program
void ws2812_init(void) {
    // Load program into PIO memory
    uint offset = pio_add_program(pio, &(pio_program_t){
        .instructions = ws2812_program,
        .length = 4,
        .origin = -1
    });

    // Configure the state machine
    pio_sm_config c = pio_get_default_sm_config();
    sm_config_set_sideset(&c, 1, false, false);
    sm_config_set_out_shift(&c, false, true, 24); // shift left, autopull at 24 bits
    sm_config_set_fifo_join(&c, PIO_FIFO_JOIN_TX);
    sm_config_set_wrap(&c, offset, offset + 3);

    // Set pin as output for PIO
    pio_gpio_init(pio, WS2812_PIN);
    pio_sm_set_consecutive_pindirs(pio, sm, WS2812_PIN, 1, true);
    sm_config_set_sideset_pins(&c, WS2812_PIN);

    // Clock divider for 800kHz WS2812 timing
    // Each PIO cycle = 1 bit period / ~10 instructions
    float freq = 800000.0f * 10.0f;  // 8 MHz
    float div = clock_get_hz(clk_sys) / freq;
    sm_config_set_clkdiv(&c, div);

    pio_sm_init(pio, sm, offset, &c);
    pio_sm_set_enabled(pio, sm, true);
}

// Send the LED buffer to the strip
void ws2812_show(void) {
    for (int i = 0; i < NUM_LEDS; i++) {
        // WS2812 expects GRB order, shifted into top 24 bits
        pio_sm_put_blocking(pio, sm, led_buffer[i] << 8);
    }
    sleep_us(300);  // reset pulse (>280µs of low)
}

// Pack RGB into GRB format for WS2812
uint32_t rgb(uint8_t r, uint8_t g, uint8_t b) {
    return ((uint32_t)g << 16) | ((uint32_t)r << 8) | (uint32_t)b;
}

// Set all LEDs to one color
void set_all(uint8_t r, uint8_t g, uint8_t b) {
    uint32_t color = rgb(r, g, b);
    for (int i = 0; i < NUM_LEDS; i++) {
        led_buffer[i] = color;
    }
}

// --- Status patterns ---
void status_idle(void) {
    set_all(0, 0, 40);  // dim blue
    ws2812_show();
}

void status_driving(void) {
    set_all(0, 40, 0);  // green
    ws2812_show();
}

void status_obstacle(void) {
    set_all(60, 0, 0);  // red
    ws2812_show();
}

// Rainbow cycle animation
static uint8_t wheel_r(uint8_t pos) {
    if (pos < 85) return pos * 3;
    if (pos < 170) return 255 - (pos - 85) * 3;
    return 0;
}
static uint8_t wheel_g(uint8_t pos) {
    if (pos < 85) return 255 - pos * 3;
    if (pos < 170) return 0;
    return (pos - 170) * 3;
}
static uint8_t wheel_b(uint8_t pos) {
    if (pos < 85) return 0;
    if (pos < 170) return (pos - 85) * 3;
    return 255 - (pos - 170) * 3;
}

void status_celebration(int frame) {
    for (int i = 0; i < NUM_LEDS; i++) {
        uint8_t pos = (i * 256 / NUM_LEDS + frame) & 0xFF;
        // Dim the colors to save power
        led_buffer[i] = rgb(wheel_r(pos) / 4, wheel_g(pos) / 4, wheel_b(pos) / 4);
    }
    ws2812_show();
}

// Knight Rider / scanning pattern
void status_scanning(int frame) {
    memset(led_buffer, 0, sizeof(led_buffer));
    int pos = frame % (NUM_LEDS * 2 - 2);
    if (pos >= NUM_LEDS) pos = (NUM_LEDS * 2 - 2) - pos;
    led_buffer[pos] = rgb(60, 20, 0);  // orange
    if (pos > 0) led_buffer[pos - 1] = rgb(15, 5, 0);
    if (pos < NUM_LEDS - 1) led_buffer[pos + 1] = rgb(15, 5, 0);
    ws2812_show();
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    ws2812_init();
    printf("WS2812 LED strip initialized!\n");

    int frame = 0;
    while (true) {
        // Cycle through all status patterns
        printf("Status: IDLE (blue)\n");
        for (int i = 0; i < 20; i++) { status_idle(); sleep_ms(100); }

        printf("Status: DRIVING (green)\n");
        for (int i = 0; i < 20; i++) { status_driving(); sleep_ms(100); }

        printf("Status: OBSTACLE (red)\n");
        for (int i = 0; i < 20; i++) { status_obstacle(); sleep_ms(100); }

        printf("Status: SCANNING (orange sweep)\n");
        for (int i = 0; i < 40; i++) { status_scanning(i); sleep_ms(80); }

        printf("Status: CELEBRATION (rainbow!)\n");
        for (int i = 0; i < 60; i++) { status_celebration(i * 4); sleep_ms(50); }
    }

    return 0;
}
```

## Try it
- Change the colors for each status to your favorites
- Adjust the brightness by dividing the RGB values (lower = dimmer, saves power)
- Make a "breathing" effect where LEDs slowly pulse brighter and dimmer
- Create a "loading bar" pattern where LEDs light up one by one from left to right

## Challenge

Implement a **battery level indicator**: read the battery voltage (via ADC on GP26) and display the charge level on the LED strip. 8 green LEDs = full, 4 yellow = half, 2 red = low, 1 flashing red = critical. This gives you an at-a-glance battery meter.

## Summary

PIO is one of the Pico 2's superpowers — it lets us generate timing-critical signals without tying up the CPU. We used a tiny 4-instruction PIO program to speak the WS2812 protocol at 800 kHz, and now our robot has a colorful LED status bar. Each pattern conveys information at a glance: blue for idle, green for go, red for stop, and rainbow for victory!

## How this fits the robot

The LED strip is the robot's mood ring — visible from across the room. When the state machine (Project 16) changes modes, it calls the appropriate LED pattern. During missions (Project 20), the rainbow celebration plays when a mission is completed successfully. It makes the robot expressive and fun to watch.
