# PIO — The Pico's Superpower

## What you'll learn
- What PIO (Programmable I/O) state machines are
- Why PIO is the Pico's most unique and powerful feature
- How to write a simple PIO program to drive WS2812 Neopixels
- How PIO programs run independently of the CPU
- The basic PIO instructions: set, out, pull, nop, jmp

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× WS2812B Neopixel LED strip (8 LEDs) (~$4)
- 3× jumper wires (~$0.30)

## Background

Every microcontroller has hardware for common protocols like I2C, SPI, and UART. But what happens when you need a protocol that's not built in? On most chips, you're stuck writing slow "bit-banging" code in software. The Pico 2 has a secret weapon: **PIO** — Programmable I/O state machines.

Think of PIO as tiny helper robots living inside the Pico. You give them a tiny program (up to 32 instructions), and they execute it independently at insane speeds — up to 125 million instructions per second. While your main CPU is busy with calculations, the PIO robots handle the precise timing needed for custom protocols.

The Pico 2 has **two PIO blocks**, each with **four state machines** — that's eight PIO engines total! Each state machine has its own instruction pointer, scratch registers, and shift registers. They can read and write GPIO pins with single-cycle precision (8 nanoseconds at 125 MHz).

**WS2812 Neopixels** are perfect for learning PIO. These smart LEDs require a very specific timing protocol: to send a "1" bit, the signal goes HIGH for 800ns then LOW for 450ns. For a "0" bit: HIGH for 400ns, LOW for 850ns. That's too fast and precise for regular C code, but PIO handles it effortlessly!

## Wiring

| Pico Pin | Neopixel Strip |
|----------|----------------|
| GP22 | DIN (Data In) |
| 3V3  | VCC (for small strips; use external 5V supply for long strips) |
| GND  | GND |

**Important**: For strips with more than ~8 LEDs, use an external 5V power supply. The Pico's 3V3 pin can't supply enough current.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"

#define WS2812_PIN 22
#define NUM_LEDS   8

// WS2812 PIO program - drives Neopixel data signal
// This is the assembled version of the PIO program below:
//
// .program ws2812
// .side_set 1
//     pull block        side 0  ; Pull 24 bits from FIFO
//     set x, 23         side 0  ; Loop counter: 24 bits per LED
// bitloop:
//     out y, 1          side 0  ; Shift out one bit
//     jmp !y, do_zero   side 1  ; Jump based on bit value, set pin HIGH
//     nop               side 1  ; Bit=1: keep HIGH longer
//     jmp bitloop       side 0  ; Return LOW, loop
// do_zero:
//     nop               side 0  ; Bit=0: go LOW sooner
//     jmp bitloop       side 0  ; Loop

static const uint16_t ws2812_program[] = {
    0x80a0, // pull block       side 0
    0xe037, // set x, 23        side 0
    0x6021, // out y, 1         side 0
    0x1025, // jmp !y, 5        side 1
    0xb042, // nop              side 1
    0x0002, // jmp 2            side 0
    0xa042, // nop              side 0
    0x0002, // jmp 2            side 0
};

static PIO pio;
static uint sm;

void ws2812_init(void) {
    pio = pio0;
    sm = pio_claim_unused_sm(pio, true);

    // Load the program into PIO instruction memory
    uint offset = pio_add_program_at_offset(pio,
        &(const pio_program_t){
            .instructions = ws2812_program,
            .length = 8,
            .origin = -1,
        }, 0);

    // Configure the state machine
    pio_sm_config c = pio_get_default_sm_config();
    sm_config_set_out_shift(&c, false, true, 24);  // Shift left, auto-pull at 24 bits
    sm_config_set_sideset(&c, 1, false, false);
    sm_config_set_sideset_pins(&c, WS2812_PIN);

    // Set clock to get correct WS2812 timing (~800kHz)
    float freq = 800000.0f * 10.0f;  // 10 cycles per bit
    float div = clock_get_hz(clk_sys) / freq;
    sm_config_set_clkdiv(&c, div);

    // Initialize the pin
    pio_gpio_init(pio, WS2812_PIN);
    pio_sm_set_consecutive_pindirs(pio, sm, WS2812_PIN, 1, true);

    pio_sm_init(pio, sm, offset, &c);
    pio_sm_set_enabled(pio, sm, true);
}

// Send a GRB colour value to one LED
void ws2812_put_pixel(uint32_t grb) {
    pio_sm_put_blocking(pio, sm, grb << 8);
}

// Convert RGB to GRB format (WS2812 uses GRB order)
uint32_t rgb_to_grb(uint8_t r, uint8_t g, uint8_t b) {
    return ((uint32_t)g << 16) | ((uint32_t)r << 8) | (uint32_t)b;
}

int main() {
    stdio_init_all();
    ws2812_init();

    uint32_t colours[] = {
        rgb_to_grb(255, 0, 0),    // Red
        rgb_to_grb(0, 255, 0),    // Green
        rgb_to_grb(0, 0, 255),    // Blue
        rgb_to_grb(255, 255, 0),  // Yellow
        rgb_to_grb(255, 0, 255),  // Magenta
        rgb_to_grb(0, 255, 255),  // Cyan
        rgb_to_grb(255, 128, 0),  // Orange
        rgb_to_grb(255, 255, 255) // White
    };

    int offset = 0;
    while (true) {
        // Rainbow chase animation
        for (int i = 0; i < NUM_LEDS; i++) {
            int idx = (i + offset) % NUM_LEDS;
            ws2812_put_pixel(colours[idx]);
        }
        sleep_ms(200);
        offset++;
    }

    return 0;
}
```

### How the code works

1. The PIO program is a tiny set of instructions that runs on a dedicated state machine, separate from the CPU.
2. `pio_sm_put_blocking()` pushes colour data into the state machine's FIFO queue. The PIO program shifts it out bit by bit with precise timing.
3. The state machine generates the correct HIGH/LOW timing for each bit automatically — "1" bits stay HIGH longer than "0" bits.
4. WS2812 LEDs use **GRB** colour order (Green, Red, Blue), not the usual RGB — that's why we have the conversion function.

## Try it

1. **Colour wheel** — Create a smooth hue rotation that cycles through all colours over time.
2. **Brightness control** — Scale all colour values by a factor (0.0 to 1.0) to control overall brightness.
3. **Larson scanner** — Create a "Knight Rider" bouncing light effect with fading trails.

## Challenge

Write a PIO program that generates a precise 38 kHz carrier signal for IR remote control. Use a second PIO state machine to modulate it with command data. This is how TV remotes work!

## Summary

PIO is the Pico's most unique feature — tiny programmable state machines that handle precise timing protocols independently of the CPU. You used PIO to drive WS2812 Neopixel LEDs with exact nanosecond timing. Each PIO instruction executes in a single clock cycle. The Pico has 8 state machines total, letting you run multiple custom protocols simultaneously. PIO is what makes the Pico special compared to other microcontrollers!
