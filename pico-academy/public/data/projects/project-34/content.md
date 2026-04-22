# Project 34: TV Remote Clone — Be the Remote Control!

## 🎯 What You'll Learn
- How infrared (IR) light carries remote control signals
- How the NEC IR protocol encodes button presses
- How to transmit IR signals using a PWM carrier wave
- How every TV remote in your house actually works!

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| IR Transmitter Module | $1.50 |
| Push Buttons x3 | $1.50 |
| 10kΩ Resistors x3 | $0.30 |
| LED (any colour) | $0.10 |
| 220Ω Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.50** |

## 🌟 The Story

Ever wonder how a TV remote works from across the room without any wires? It is not magic — it is invisible light! Your TV remote flashes an infrared LED hundreds of times per second in a special pattern. The TV's sensor reads that pattern and knows which button you pressed. It is like a secret blink code!

The most common code is called the NEC protocol. Each button sends a 32-bit number using long and short bursts of infrared blinking. Today you will build a TV remote transmitter! Press your buttons to send Volume Up, Volume Down, and Channel Change commands. Point your Pico at a TV and see if it responds (you may need to find your TV's specific codes first!)

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| IR Transmitter Module S pin | Pico GP16 | Signal — use PWM pin! |
| IR Transmitter Module + | Pico 3.3V | Power |
| IR Transmitter Module - | Pico GND | Ground |
| Button 1 one leg | Pico GP10 | Volume Up |
| Button 2 one leg | Pico GP11 | Volume Down |
| Button 3 one leg | Pico GP12 | Channel Up |
| All button other legs | Pico GND | Ground |
| 10kΩ resistors | GP10, GP11, GP12 to 3.3V | Pull-ups |
| LED long leg | Pico GP13 via 220Ω | Transmitting indicator |
| LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"        // Always include this first!
#include "hardware/pwm.h"       // Need PWM for 38kHz IR carrier
#include "hardware/clocks.h"    // For clock frequency
#include <stdio.h>              // For printf

// Pin definitions
#define IR_PIN      16          // IR transmitter signal pin
#define BTN_VOL_UP  10          // Volume Up button
#define BTN_VOL_DN  11          // Volume Down button
#define BTN_CH_UP   12          // Channel Up button
#define STATUS_LED  13          // Transmitting LED

// NEC Protocol IR codes — these are EXAMPLE codes
// You may need to find the actual codes for YOUR TV brand!
// Try these Samsung codes first:
#define ADDR_SAMSUNG    0x0707  // Samsung TV address
#define CMD_VOL_UP      0x07    // Volume up command
#define CMD_VOL_DOWN    0x0B    // Volume down command  
#define CMD_CH_UP       0x12    // Channel up command
#define CMD_POWER       0x02    // Power toggle command

// NEC timing (in microseconds)
#define NEC_LEADER_MARK   9000   // 9ms leader burst
#define NEC_LEADER_SPACE  4500   // 4.5ms silence
#define NEC_BIT_MARK       560   // Short burst for every bit
#define NEC_ONE_SPACE     1690   // Long space = bit 1
#define NEC_ZERO_SPACE     560   // Short space = bit 0
#define NEC_REPEAT_SPACE  2250   // Repeat space

// IR carrier frequency (38kHz is standard for most TVs)
#define IR_FREQ_HZ  38000

// PWM slice and channel for IR pin
uint ir_slice;
uint ir_channel;

// Set up IR transmitter PWM (38kHz carrier wave)
void ir_setup() {
    gpio_set_function(IR_PIN, GPIO_FUNC_PWM);       // Set to PWM
    ir_slice = pwm_gpio_to_slice_num(IR_PIN);        // Get slice
    ir_channel = pwm_gpio_to_channel(IR_PIN);        // Get channel

    // Calculate PWM settings for 38kHz
    uint32_t clock = clock_get_hz(clk_sys);          // Get system clock
    uint32_t wrap = clock / IR_FREQ_HZ;              // Calculate wrap value
    pwm_set_wrap(ir_slice, wrap);                     // Set wrap
    pwm_set_chan_level(ir_slice, ir_channel, wrap / 3); // ~33% duty cycle
    pwm_set_enabled(ir_slice, false);                 // Start disabled
}

// Turn IR carrier ON (modulated 38kHz burst)
void ir_mark(uint32_t duration_us) {
    pwm_set_enabled(ir_slice, true);                  // Enable PWM = IR on
    sleep_us(duration_us);                            // Stay on for duration
    pwm_set_enabled(ir_slice, false);                 // Disable = IR off
}

// Turn IR off (silence/space)
void ir_space(uint32_t duration_us) {
    pwm_set_enabled(ir_slice, false);                 // Make sure IR is off
    sleep_us(duration_us);                            // Silent pause
}

// Send one NEC bit (0 or 1)
void nec_send_bit(bool bit) {
    ir_mark(NEC_BIT_MARK);                            // Mark (burst) for all bits
    if (bit) {
        ir_space(NEC_ONE_SPACE);                      // Long space = 1
    } else {
        ir_space(NEC_ZERO_SPACE);                     // Short space = 0
    }
}

// Send a full byte (8 bits, LSB first)
void nec_send_byte(uint8_t byte) {
    for (int i = 0; i < 8; i++) {                    // Send all 8 bits
        nec_send_bit(byte & 1);                       // Send LSB first
        byte >>= 1;                                   // Shift to next bit
    }
}

// Send a complete NEC message
// address = 16-bit device address, command = 8-bit command
void nec_send(uint16_t address, uint8_t command) {
    uint8_t addr_lo = address & 0xFF;                 // Low byte of address
    uint8_t addr_hi = (address >> 8) & 0xFF;         // High byte of address
    uint8_t cmd_inv = ~command;                       // Inverted command (error check)

    // NEC message: leader + address lo + address hi + command + ~command
    ir_mark(NEC_LEADER_MARK);                         // 9ms leader burst
    ir_space(NEC_LEADER_SPACE);                       // 4.5ms silence

    nec_send_byte(addr_lo);                           // Address low byte
    nec_send_byte(addr_hi);                           // Address high byte
    nec_send_byte(command);                           // Command
    nec_send_byte(cmd_inv);                           // Inverted command

    ir_mark(NEC_BIT_MARK);                            // Final mark
    ir_space(40000);                                  // 40ms gap after message
}

// Check if a button is pressed (with debounce)
bool is_pressed(uint pin) {
    if (gpio_get(pin) == 0) {                        // LOW = pressed (pull-up)
        sleep_ms(30);                                // Debounce
        return gpio_get(pin) == 0;                  // Still pressed?
    }
    return false;
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up IR transmitter
    ir_setup();

    // Set up button pins
    gpio_init(BTN_VOL_UP); gpio_set_dir(BTN_VOL_UP, GPIO_IN); gpio_pull_up(BTN_VOL_UP);
    gpio_init(BTN_VOL_DN); gpio_set_dir(BTN_VOL_DN, GPIO_IN); gpio_pull_up(BTN_VOL_DN);
    gpio_init(BTN_CH_UP);  gpio_set_dir(BTN_CH_UP,  GPIO_IN); gpio_pull_up(BTN_CH_UP);

    // Set up status LED
    gpio_init(STATUS_LED);
    gpio_set_dir(STATUS_LED, GPIO_OUT);
    gpio_put(STATUS_LED, 0);

    printf("=== TV REMOTE CLONE ===\n");
    printf("Button 1 (GP10): Volume Up\n");
    printf("Button 2 (GP11): Volume Down\n");
    printf("Button 3 (GP12): Channel Up\n");
    printf("Point at your TV and press!\n");
    printf("(Samsung codes by default)\n\n");

    while (true) {                  // Loop forever

        if (is_pressed(BTN_VOL_UP)) {           // Volume Up pressed?
            printf("Sending: VOLUME UP\n");
            gpio_put(STATUS_LED, 1);             // LED on during send
            nec_send(ADDR_SAMSUNG, CMD_VOL_UP); // Send IR command
            gpio_put(STATUS_LED, 0);             // LED off
            while (is_pressed(BTN_VOL_UP)) sleep_ms(50);  // Wait for release

        } else if (is_pressed(BTN_VOL_DN)) {    // Volume Down pressed?
            printf("Sending: VOLUME DOWN\n");
            gpio_put(STATUS_LED, 1);
            nec_send(ADDR_SAMSUNG, CMD_VOL_DOWN);
            gpio_put(STATUS_LED, 0);
            while (is_pressed(BTN_VOL_DN)) sleep_ms(50);

        } else if (is_pressed(BTN_CH_UP)) {     // Channel Up pressed?
            printf("Sending: CHANNEL UP\n");
            gpio_put(STATUS_LED, 1);
            nec_send(ADDR_SAMSUNG, CMD_CH_UP);
            gpio_put(STATUS_LED, 0);
            while (is_pressed(BTN_CH_UP)) sleep_ms(50);
        }

        sleep_ms(20);               // Small delay in main loop
    }

    return 0;
}
```

## 🔍 How It Works

1. IR remotes blink at 38kHz (38,000 times per second) — too fast to see, but TVs can detect it
2. The NEC protocol encodes commands as patterns of long and short bursts
3. Each button press sends a 32-bit number: address (which device) + command + error check
4. PWM generates the 38kHz carrier wave; we turn it on/off to make the patterns
5. The TV decodes the pattern and performs the command!

## 🎮 Try It!

- Point at a Samsung TV (if you have one) and press the buttons
- Open a phone camera and look at the IR LED while pressing — you can see the flashes!
- Try adding a power button using `CMD_POWER`
- Look up your own TV brand's IR codes online to make it work with your TV

## 🏆 Challenge

Add an IR receiver module (VS1838B) and write a receiver too. Press buttons on your real TV remote, capture the codes with your receiver, then replay them with your transmitter. Now your Pico has "learned" all your remote's buttons — a universal remote!

## 📝 What You Built

You built an IR remote control transmitter using the NEC protocol — the same standard used by thousands of consumer electronics devices! You learned how infrared light carries encoded commands, how PWM generates the 38kHz carrier wave, and how TV remotes have worked since the 1980s.
