# Lesson 11: IR Remote Control — Talking Without Wires

## 🎯 What you'll learn
- How infrared (IR) light carries invisible messages through the air
- How the NEC IR protocol encodes button presses as patterns of light pulses
- How to use GPIO interrupts and `time_us_64()` timestamps to decode IR signals
- How to trigger buzzer sounds and RGB LED color changes from a TV-style remote

## 🛒 Parts you'll need
- Raspberry Pi Pico 2 W
- IR Receiver Module (from the Elegoo 37 Kit — the small black dome on a PCB)
- IR Remote Control (the small black remote included in the kit)
- Passive Buzzer Module (connected to GP18)
- RGB LED Module (R → GP9, G → GP10, B → GP11)
- Breadboard and jumper wires
- USB cable

## 🌟 Background

Have you ever pointed a TV remote at the TV and wondered how it works? The secret is **infrared light** — a color of light that is way too red for your eyes to see, but totally real! Every time you press a button on a remote, a tiny LED on the front of the remote flashes on and off super quickly in a special pattern. Think of it like Morse code, except instead of dots and dashes it uses short and long flashes of invisible light. The IR receiver module on your Pico's side watches for those flashes and catches the message.

The pattern your kit's remote uses is called the **NEC protocol**. Every button press sends a 32-bit number — that is 32 ones and zeroes, like a secret code with 32 digits. The message always starts with a big "HEY, LISTEN!" announcement: a 9-millisecond LOW pulse followed by a 4.5-millisecond HIGH pulse — like knocking loudly on a door before speaking. After that introduction, 32 data bits follow. A zero bit is a short burst followed by a short gap. A one bit uses the same short burst but then a much longer gap. Your Pico measures how long each gap lasts to decide whether the bit is a zero or a one.

The really cool part is that you do not need any extra library for this — you just time the pulses yourself using the Pico's built-in microsecond timer! You will attach an interrupt to the IR receiver pin so that every time the signal changes, your code wakes up instantly and records the exact time in microseconds. After all 32 bits have arrived, you decode the pattern and find out which button was pressed. Then you can make the buzzer beep faster for VOL+, go quiet for VOL-, and cycle through rainbow colors on the RGB LED with CH+ and CH-. Your Pico becomes a remote-controlled light show!

## 🔌 Wiring

| Pico Pin | Component |
|---|---|
| GP16 | IR Receiver Module — S (signal output) |
| 3V3 (pin 36) | IR Receiver Module — VCC |
| GND | IR Receiver Module — GND |
| GP18 | Passive Buzzer Module — S |
| 3V3 | Passive Buzzer Module — VCC |
| GND | Passive Buzzer Module — GND |
| GP9 | RGB LED Module — R |
| GP10 | RGB LED Module — G |
| GP11 | RGB LED Module — B |
| 3V3 | RGB LED Module — VCC (or +) |
| GND | RGB LED Module — GND |

> **Tip:** The IR receiver module has a dark dome (bubble) on one side — that is the sensor. Make sure the dome faces toward the remote when you press buttons. The signal pin is usually labeled **S** on the Elegoo module.

## 💻 The code

```c
/**
 * Lesson 11: IR Remote Control — Talking Without Wires
 * Hardware: Raspberry Pi Pico 2 W  |  Language: C, Pico SDK
 *
 * Decodes the NEC IR protocol using GPIO interrupts + microsecond timestamps.
 * Maps remote buttons to buzzer tones and RGB LED colors.
 *
 * Wiring:
 *   IR Receiver S  → GP16
 *   Passive Buzzer → GP18
 *   RGB LED R/G/B  → GP9 / GP10 / GP11
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define IR_PIN      16
#define BUZZER_PIN  18
#define LED_R_PIN    9
#define LED_G_PIN   10
#define LED_B_PIN   11

// ── NEC timing thresholds (in microseconds) ──────────────────────────────────
// The leader LOW pulse must be close to 9 ms
#define NEC_LEADER_MIN_US    8000
#define NEC_LEADER_MAX_US   10000
// A "1" bit gap is ~1687 µs; a "0" bit gap is ~562 µs. Use 1100 µs as the boundary.
#define NEC_BIT_ONE_MIN_US   1100

// ── NEC button codes for the Elegoo remote ───────────────────────────────────
// If a button prints "Unknown," check the printed hex code and add it here!
#define BTN_CH_MINUS   0xFFA25D
#define BTN_CH         0xFF629D
#define BTN_CH_PLUS    0xFFE21D
#define BTN_PREV       0xFF22DD
#define BTN_NEXT       0xFF02FD
#define BTN_PLAY       0xFFC23D
#define BTN_VOL_MINUS  0xFFE01F
#define BTN_VOL_PLUS   0xFFA857
#define BTN_EQ         0xFF906F
#define BTN_0          0xFF6897
#define BTN_100        0xFF9867
#define BTN_200        0xFFB04F
#define BTN_1          0xFF30CF
#define BTN_2          0xFF18E7
#define BTN_3          0xFF7A85
#define BTN_4          0xFF10EF
#define BTN_5          0xFF38C7
#define BTN_6          0xFF5AA5
#define BTN_7          0xFF42BD
#define BTN_8          0xFF4AB5
#define BTN_9          0xFF52AD

// ── IR decoder state (shared between ISR and main loop) ──────────────────────
// We need up to 2 (leader) + 64 (32 bits × 2 edges each) + 1 (final mark) = 67 edges
#define MAX_EDGES 70
volatile uint64_t edge_times[MAX_EDGES];
volatile int      edge_count  = 0;
volatile bool     ir_ready    = false;   // true when a full packet is captured

// ── GPIO interrupt service routine — fires on every signal edge ───────────────
void ir_isr(uint gpio, uint32_t events) {
    if (ir_ready) return;   // Still busy decoding last packet — ignore for now

    uint64_t now = time_us_64();

    if (edge_count == 0) {
        // Very first edge — start of a new packet
        edge_times[0] = now;
        edge_count = 1;
    } else if (edge_count < MAX_EDGES) {
        edge_times[edge_count++] = now;

        // 67 edges = leader (2) + 32 bits × 2 edges + 1 stop mark edge
        if (edge_count >= 67) {
            ir_ready = true;   // Signal main loop that data is ready
        }
    }
}

// ── Decode NEC packet from captured edge timestamps ───────────────────────────
// Returns the 32-bit NEC code, or 0 on error.
uint32_t decode_nec(void) {
    // Verify leader LOW pulse (edge 0 → edge 1 should be ~9 ms)
    uint64_t leader_us = edge_times[1] - edge_times[0];
    if (leader_us < NEC_LEADER_MIN_US || leader_us > NEC_LEADER_MAX_US) {
        return 0;   // Not a valid NEC packet
    }

    uint32_t code = 0;

    // Each bit i starts at edge index (2 + i*2).
    // The gap duration = time from rising edge to next falling edge.
    // Rising edge of bit i's burst  = edge index (3 + i*2)
    // Falling edge of bit i+1 burst = edge index (4 + i*2)
    for (int i = 0; i < 32; i++) {
        int rise_idx = 3 + i * 2;   // End of this bit's carrier burst
        int fall_idx = 4 + i * 2;   // End of this bit's gap (start of next burst)

        if (fall_idx >= edge_count) break;

        uint64_t gap_us = edge_times[fall_idx] - edge_times[rise_idx];

        if (gap_us >= NEC_BIT_ONE_MIN_US) {
            code |= (1UL << i);   // Long gap = logic "1"; NEC sends LSB first
        }
        // Short gap = logic "0" — bit stays 0 (initialized to 0 already)
    }

    return code;
}

// ── RGB LED helpers (PWM, 0-255 per channel) ─────────────────────────────────
void rgb_init(void) {
    gpio_set_function(LED_R_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_G_PIN, GPIO_FUNC_PWM);
    gpio_set_function(LED_B_PIN, GPIO_FUNC_PWM);

    // Set wrap to 255 for each slice so duty cycle is 0-255
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_R_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_G_PIN), 255);
    pwm_set_wrap(pwm_gpio_to_slice_num(LED_B_PIN), 255);

    pwm_set_enabled(pwm_gpio_to_slice_num(LED_R_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_G_PIN), true);
    pwm_set_enabled(pwm_gpio_to_slice_num(LED_B_PIN), true);
}

void rgb_set(uint8_t r, uint8_t g, uint8_t b) {
    // Square the value for gamma correction — looks much more natural!
    pwm_set_gpio_level(LED_R_PIN, (r * r) / 255);
    pwm_set_gpio_level(LED_G_PIN, (g * g) / 255);
    pwm_set_gpio_level(LED_B_PIN, (b * b) / 255);
}

// ── Passive buzzer tone helper ────────────────────────────────────────────────
void buzzer_beep(uint freq_hz, uint duration_ms) {
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);

    // Calculate clock divider so PWM toggles at freq_hz with wrap=255
    uint32_t clk = clock_get_hz(clk_sys);
    uint32_t div16 = clk / (freq_hz * 256);
    if (div16 < 16) div16 = 16;
    pwm_set_clkdiv_int_frac(slice, div16 / 16, div16 & 0xF);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(BUZZER_PIN, 128);   // 50% duty = nice clean tone
    pwm_set_enabled(slice, true);

    sleep_ms(duration_ms);

    pwm_set_enabled(slice, false);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

// ── Color table for the 9 number buttons ─────────────────────────────────────
typedef struct { uint8_t r, g, b; const char *name; } RGBColor;

static const RGBColor color_table[9] = {
    {255,   0,   0, "Red"},       // Button 1
    {  0, 255,   0, "Green"},     // Button 2
    {  0,   0, 255, "Blue"},      // Button 3
    {255, 255,   0, "Yellow"},    // Button 4
    {  0, 255, 255, "Cyan"},      // Button 5
    {255,   0, 255, "Magenta"},   // Button 6
    {255, 128,   0, "Orange"},    // Button 7
    {128,   0, 255, "Purple"},    // Button 8
    {255, 255, 255, "White"},     // Button 9
};

int ch_color_index = 0;   // Which color CH+/CH- is currently pointing at

// ── Volume level (1 = quiet, 5 = loud) ───────────────────────────────────────
int vol_level = 3;

// ── Main ──────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);   // Wait for USB serial to open
    printf("=== Lesson 11: IR Remote Control ===\n");
    printf("Point the remote at the black dome and press any button!\n\n");

    // Set up RGB LED PWM
    rgb_init();
    rgb_set(0, 0, 64);   // Dim blue = "waiting for remote"

    // Set up passive buzzer PWM
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);

    // Set up IR receiver pin with interrupt on BOTH edges
    gpio_init(IR_PIN);
    gpio_set_dir(IR_PIN, GPIO_IN);
    gpio_pull_up(IR_PIN);   // Idle state is HIGH; pulses go LOW

    gpio_set_irq_enabled_with_callback(
        IR_PIN,
        GPIO_IRQ_EDGE_FALL | GPIO_IRQ_EDGE_RISE,
        true,
        &ir_isr
    );

    printf("Waiting for remote signal...\n");

    while (true) {

        if (ir_ready) {
            // --- A full NEC packet has been captured! ---
            uint32_t code = decode_nec();

            // Reset decoder state for the next button press
            edge_count = 0;
            ir_ready   = false;

            if (code == 0) {
                printf("Oops — bad signal. Try pointing the remote closer!\n");
                continue;
            }

            printf("Button code: 0x%06X  →  ", code);

            // ── Match the code to an action ──────────────────────────────────
            if (code == BTN_VOL_PLUS) {
                if (vol_level < 5) vol_level++;
                printf("VOL+  (level %d) — BEEP!\n", vol_level);
                buzzer_beep(800 + vol_level * 60, 40 + vol_level * 20);
                rgb_set(255, 128, 0);   // Orange = loud

            } else if (code == BTN_VOL_MINUS) {
                if (vol_level > 1) vol_level--;
                printf("VOL-  (level %d) — beep...\n", vol_level);
                buzzer_beep(300 + vol_level * 30, 20 + vol_level * 10);
                rgb_set(0, 0, 128);    // Blue = quiet

            } else if (code == BTN_CH_PLUS) {
                ch_color_index = (ch_color_index + 1) % 9;
                RGBColor c = color_table[ch_color_index];
                printf("CH+  → %s\n", c.name);
                rgb_set(c.r, c.g, c.b);
                buzzer_beep(660, 40);

            } else if (code == BTN_CH_MINUS) {
                ch_color_index = (ch_color_index + 8) % 9;   // +8 mod 9 = go back 1
                RGBColor c = color_table[ch_color_index];
                printf("CH-  → %s\n", c.name);
                rgb_set(c.r, c.g, c.b);
                buzzer_beep(440, 40);

            } else if (code == BTN_1) {
                printf("1 → Red\n");
                rgb_set(255, 0, 0);   buzzer_beep(523, 50);   // C5

            } else if (code == BTN_2) {
                printf("2 → Green\n");
                rgb_set(0, 255, 0);   buzzer_beep(587, 50);   // D5

            } else if (code == BTN_3) {
                printf("3 → Blue\n");
                rgb_set(0, 0, 255);   buzzer_beep(659, 50);   // E5

            } else if (code == BTN_4) {
                printf("4 → Yellow\n");
                rgb_set(255, 255, 0); buzzer_beep(698, 50);   // F5

            } else if (code == BTN_5) {
                printf("5 → Cyan\n");
                rgb_set(0, 255, 255); buzzer_beep(784, 50);   // G5

            } else if (code == BTN_6) {
                printf("6 → Magenta\n");
                rgb_set(255, 0, 255); buzzer_beep(880, 50);   // A5

            } else if (code == BTN_7) {
                printf("7 → Orange\n");
                rgb_set(255, 128, 0); buzzer_beep(988, 50);   // B5

            } else if (code == BTN_8) {
                printf("8 → Purple\n");
                rgb_set(128, 0, 255); buzzer_beep(1047, 50);  // C6

            } else if (code == BTN_9) {
                printf("9 → White (all on!)\n");
                rgb_set(255, 255, 255); buzzer_beep(1175, 50);

            } else if (code == BTN_0) {
                printf("0 → Lights OFF\n");
                rgb_set(0, 0, 0);   // All dark

            } else if (code == BTN_PLAY) {
                printf("PLAY → Disco time!\n");
                for (int i = 0; i < 9; i++) {
                    RGBColor c = color_table[i];
                    rgb_set(c.r, c.g, c.b);
                    buzzer_beep(400 + i * 80, 70);
                }
                rgb_set(0, 0, 64);   // Back to waiting blue

            } else {
                // Unknown button — print the code so you can add it!
                printf("Unknown! Add this to the #define list: 0x%06X\n", code);
            }
        }

        sleep_ms(5);   // Small rest for the CPU
    }
}
```

## 🔍 How the code works

1. **IR receiver pin and interrupt** — `GP16` is set as a digital input. The IR receiver sits HIGH when quiet and pulses LOW when it sees IR light. We register `ir_isr` to fire on both falling edges (HIGH → LOW) and rising edges (LOW → HIGH).

2. **Interrupt service routine (`ir_isr`)** — Every time the signal flips, the interrupt saves the current time (in microseconds, from `time_us_64()`) into the `edge_times[]` array. After 67 edges — enough to capture a full NEC packet — it sets `ir_ready = true` to wake up the main loop.

3. **NEC decoding (`decode_nec`)** — First the function checks that the gap between edge 0 and edge 1 is close to 9 ms (the "hey listen!" announcement). Then for each of the 32 bits it measures the gap between the rising edge (end of the bit's burst) and the next falling edge (end of the bit's gap). Gaps longer than 1100 µs are "1" bits; shorter are "0" bits.

4. **Button code table** — The 32-bit codes for each Elegoo remote button are listed as `#define` constants at the top of the file. The main loop compares the decoded code against each one. If your remote gives different codes, just look at the serial output and update the defines!

5. **RGB LED with gamma correction** — `rgb_set()` squares each brightness value before writing it to PWM. This is called gamma correction and it makes the LED change look smooth and natural instead of jumping from dark to bright too quickly.

6. **Passive buzzer** — `buzzer_beep()` sets up PWM frequency and duty cycle on `GP18` to produce a real musical tone. VOL+ raises pitch and makes the beep longer; VOL- lowers pitch and shortens it. Each number button plays a different musical note.

7. **Main loop** — The loop simply checks the `ir_ready` flag. When the interrupt sets it, the loop decodes the packet, resets the decoder state, and acts on the button code. The `sleep_ms(5)` call keeps the CPU from running at full blast doing nothing.

## 🚀 Try it

1. **Button discovery** — Open the serial monitor after uploading. Press every single button on the remote. Write down which hex codes appear for each button. If any say "Unknown," add those codes to the `#define` block at the top of the code.

2. **Pitch ladder** — Press VOL+ five times in a row, then VOL- five times. Can you hear the buzzer pitch going up and down? How many different levels can you count by ear?

3. **Color cycling** — Press CH+ over and over to cycle through all 9 colors. Then press CH- to go backwards. Challenge: can you predict what color comes next before it appears?

4. **Disco mode** — Press the PLAY button and watch the light show! Try changing the buzzer frequencies inside the disco loop to make a little melody instead of just ascending tones.

## 🏆 Challenge

Build a **Remote-Controlled Simon Says game!** Use `rand()` to generate a secret color sequence (for example, 4 colors to start). Flash each color on the RGB LED for half a second with a pause in between, then wait for the player to press the matching number buttons (1–9) on the remote in the same order. If they get it right, add one more color to the sequence and repeat. If they get it wrong, flash red three times and play a sad descending tone, then start over. Print the player's score (longest correct sequence) to serial. Good luck beating your own high score!

## ✅ Summary

Infrared remotes work by flashing invisible light in precise timing patterns, and the NEC protocol encodes each button press as a unique 32-bit number made from short and long light pulses. Your Pico catches these patterns using a GPIO interrupt that timestamps every signal edge, then measures the gap widths to decode bits. Now you can control lights, sounds, and eventually anything on your Pico from across the room — just like a real TV remote!
