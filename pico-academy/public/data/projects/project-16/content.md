# Mode Button & State Machine

## What you'll learn
- What a state machine is and why robots need one
- How to read a button with proper debouncing
- How to cycle through modes with a single button press
- How to connect multiple subsystems (display, LEDs, buzzer) to state changes
- How to structure code so new modes can be added easily

## Parts you'll need
- Tactile push button (~$0.50)

## Background

Think about a traffic light. It has three states: green, yellow, and red. It changes from one state to the next in order, following simple rules. A traffic light is a **state machine** — something that's always in exactly one "state" and changes states based on events (like a timer).

Our robot needs the same thing! Right now it can follow lines, avoid obstacles, and be remote-controlled — but how does it know which one to do? We need a boss that says "right now we're in LINE_FOLLOW mode" or "now switch to OBSTACLE_AVOID mode." That boss is our state machine.

We'll add a simple button that cycles through modes: IDLE → LINE_FOLLOW → OBSTACLE_AVOID → REMOTE_CONTROL → back to IDLE. Each time you press the button, the robot switches to the next mode. The OLED display shows the current mode, the LEDs change color, and the buzzer beeps to confirm. It's like clicking through channels on a TV remote — one button, multiple modes.

**Debouncing** is important: when you press a physical button, the metal contacts inside bounce and make rapid on-off-on-off signals for a few milliseconds. Without debouncing, one press might register as 5 presses and skip past the mode you wanted. We'll handle this in software by ignoring rapid changes.

## Wiring

| Button Pin | Pico 2 Pin | Notes |
|------------|------------|-------|
| One leg    | GP9 (pin 12) | Button input with internal pull-up |
| Other leg  | GND (pin 13)  | Ground |

> **Note:** We use the Pico's internal pull-up resistor, so no external resistor is needed. The pin reads HIGH when not pressed and LOW when pressed.

## The code

```c
#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/i2c.h"

// Pin definitions
#define BUTTON_PIN   9
#define BUZZER_PIN   13
#define SDA_PIN      4
#define SCL_PIN      5

// Robot modes
typedef enum {
    MODE_IDLE,
    MODE_LINE_FOLLOW,
    MODE_OBSTACLE_AVOID,
    MODE_REMOTE_CONTROL,
    MODE_COUNT  // total number of modes
} robot_mode_t;

// Human-readable mode names
static const char *mode_names[] = {
    "IDLE",
    "LINE FOLLOW",
    "OBSTACLE AVOID",
    "REMOTE CTRL"
};

// Current state
static robot_mode_t current_mode = MODE_IDLE;
static uint32_t last_button_time = 0;
#define DEBOUNCE_MS 200

// --- Buzzer (simplified from Project 15) ---
static uint buzzer_slice;

void buzzer_init(void) {
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    buzzer_slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    pwm_set_enabled(buzzer_slice, true);
}

void beep(uint freq, uint ms) {
    if (freq == 0) { sleep_ms(ms); return; }
    uint32_t wrap = clock_get_hz(clk_sys) / freq - 1;
    float div = 1.0f;
    while (wrap > 65535) { div *= 2.0f; wrap = (uint32_t)(clock_get_hz(clk_sys) / (freq * div)) - 1; }
    pwm_set_clkdiv(buzzer_slice, div);
    pwm_set_wrap(buzzer_slice, wrap);
    pwm_set_gpio_level(BUZZER_PIN, wrap / 2);
    sleep_ms(ms);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

void sfx_mode_change(void) {
    beep(523, 50);
    sleep_ms(20);
    beep(659, 50);
}

// --- OLED (simplified from Project 13) ---
#define SSD1306_ADDR  0x3C
#define I2C_PORT      i2c0

static uint8_t oled_fb[1024];

void ssd1306_cmd(uint8_t cmd) {
    uint8_t buf[2] = {0x00, cmd};
    i2c_write_blocking(I2C_PORT, SSD1306_ADDR, buf, 2, false);
}

void ssd1306_init(void) {
    sleep_ms(100);
    uint8_t cmds[] = {0xAE,0xD5,0x80,0xA8,0x3F,0xD3,0x00,0x40,
                      0x8D,0x14,0x20,0x00,0xA1,0xC8,0xDA,0x12,
                      0x81,0xCF,0xD9,0xF1,0xDB,0x40,0xA4,0xA6,0xAF};
    for (size_t i = 0; i < sizeof(cmds); i++) ssd1306_cmd(cmds[i]);
}

void ssd1306_update(void) {
    ssd1306_cmd(0x21); ssd1306_cmd(0); ssd1306_cmd(127);
    ssd1306_cmd(0x22); ssd1306_cmd(0); ssd1306_cmd(7);
    uint8_t buf[1025];
    buf[0] = 0x40;
    memcpy(buf + 1, oled_fb, 1024);
    i2c_write_blocking(I2C_PORT, SSD1306_ADDR, buf, 1025, false);
}

// Minimal 5x7 font (just uppercase + digits for mode display)
static const uint8_t font[][5] = {
    {0x00,0x00,0x00,0x00,0x00}, // space
    {0x7E,0x11,0x11,0x11,0x7E}, // A
    {0x7F,0x49,0x49,0x49,0x36}, // B
    {0x3E,0x41,0x41,0x41,0x22}, // C
    {0x7F,0x41,0x41,0x41,0x3E}, // D
    {0x7F,0x49,0x49,0x49,0x41}, // E
    {0x7F,0x09,0x09,0x09,0x01}, // F
    {0x3E,0x41,0x49,0x49,0x7A}, // G
    {0x7F,0x08,0x08,0x08,0x7F}, // H
    {0x00,0x41,0x7F,0x41,0x00}, // I
    {0x20,0x40,0x40,0x40,0x3F}, // J
    {0x7F,0x08,0x14,0x22,0x41}, // K
    {0x7F,0x40,0x40,0x40,0x40}, // L
    {0x7F,0x02,0x0C,0x02,0x7F}, // M
    {0x7F,0x04,0x08,0x10,0x7F}, // N
    {0x3E,0x41,0x41,0x41,0x3E}, // O
    {0x7F,0x09,0x09,0x09,0x06}, // P
    {0x3E,0x41,0x51,0x21,0x5E}, // Q
    {0x7F,0x09,0x19,0x29,0x46}, // R
    {0x26,0x49,0x49,0x49,0x32}, // S
    {0x01,0x01,0x7F,0x01,0x01}, // T
    {0x3F,0x40,0x40,0x40,0x3F}, // U
    {0x1F,0x20,0x40,0x20,0x1F}, // V
    {0x3F,0x40,0x38,0x40,0x3F}, // W
    {0x63,0x14,0x08,0x14,0x63}, // X
    {0x07,0x08,0x70,0x08,0x07}, // Y
    {0x61,0x51,0x49,0x45,0x43}, // Z
};

void oled_clear(void) { memset(oled_fb, 0, 1024); }

void oled_char(int x, int y, char c) {
    int idx = -1;
    if (c == ' ') idx = 0;
    else if (c >= 'A' && c <= 'Z') idx = c - 'A' + 1;
    if (idx < 0) return;
    for (int col = 0; col < 5; col++) {
        uint8_t line = font[idx][col];
        for (int row = 0; row < 7; row++) {
            if ((line >> row) & 1) {
                int px = x + col, py = y + row;
                if (px >= 0 && px < 128 && py >= 0 && py < 64)
                    oled_fb[px + (py / 8) * 128] |= (1 << (py % 8));
            }
        }
    }
}

void oled_text(int x, int y, const char *s) {
    while (*s) { oled_char(x, y, *s); x += 6; s++; }
}

// --- Display the current mode on OLED ---
void display_mode(void) {
    oled_clear();
    oled_text(20, 0, "PICO ROBOT");

    // Draw a line under the title
    for (int x = 0; x < 128; x++)
        oled_fb[x + (1 * 128)] |= 0x04;  // line at y=10

    // Mode number and name
    oled_text(10, 20, "MODE");
    oled_text(10, 32, mode_names[current_mode]);

    // Mode indicator dots
    for (int i = 0; i < MODE_COUNT; i++) {
        int cx = 30 + i * 18;
        int cy = 50;
        if (i == (int)current_mode) {
            // Filled dot for active mode
            for (int dx = -2; dx <= 2; dx++)
                for (int dy = -2; dy <= 2; dy++)
                    if (dx*dx + dy*dy <= 4) {
                        int px = cx+dx, py = cy+dy;
                        if (px >= 0 && px < 128 && py >= 0 && py < 64)
                            oled_fb[px + (py/8)*128] |= (1 << (py%8));
                    }
        } else {
            // Hollow dot for inactive modes
            oled_fb[cx + (cy/8)*128] |= (1 << (cy%8));
        }
    }

    ssd1306_update();
}

// --- Button handling ---
void button_init(void) {
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);
}

bool button_pressed(void) {
    if (gpio_get(BUTTON_PIN) == 0) {  // active low
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if (now - last_button_time > DEBOUNCE_MS) {
            last_button_time = now;
            return true;
        }
    }
    return false;
}

// --- Mode transition ---
void switch_mode(robot_mode_t new_mode) {
    printf("Mode: %s -> %s\n", mode_names[current_mode], mode_names[new_mode]);
    current_mode = new_mode;
    sfx_mode_change();
    display_mode();
}

void next_mode(void) {
    robot_mode_t next = (robot_mode_t)((current_mode + 1) % MODE_COUNT);
    switch_mode(next);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Initialize I2C
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    // Initialize peripherals
    button_init();
    buzzer_init();
    ssd1306_init();

    printf("State machine ready! Press button to change mode.\n");

    // Startup beep
    beep(523, 100);
    sleep_ms(50);
    beep(659, 100);
    sleep_ms(50);
    beep(784, 200);

    // Show initial mode
    display_mode();

    // Main loop
    while (true) {
        if (button_pressed()) {
            next_mode();
        }

        // In a full robot, each mode would run its behavior here:
        switch (current_mode) {
            case MODE_IDLE:
                // Do nothing, wait for button
                break;
            case MODE_LINE_FOLLOW:
                // Call line_follow_update() from earlier project
                break;
            case MODE_OBSTACLE_AVOID:
                // Call obstacle_avoid_update() from earlier project
                break;
            case MODE_REMOTE_CONTROL:
                // Call remote_control_update() from later project
                break;
            default:
                break;
        }

        sleep_ms(10);
    }

    return 0;
}
```

## Try it
- Add a fifth mode called "DANCE" that makes the robot spin in circles
- Long-press the button (hold for 2 seconds) to jump straight back to IDLE
- Make each mode display a different LED color using the Neopixels from Project 14
- Add a timeout that returns to IDLE after 60 seconds of inactivity

## Challenge

Add a **double-click** detector: if the button is pressed twice within 300 ms, jump directly to REMOTE_CONTROL mode (an emergency stop shortcut). This requires tracking the time between presses and distinguishing single-click from double-click.

## Summary

A state machine is the brain that organizes all the robot's behaviors. Instead of running everything at once, the robot is always in exactly one mode and acts accordingly. The button provides a simple way to switch modes, with debouncing to prevent accidental skips. The OLED, LEDs, and buzzer all react to mode changes, giving clear feedback. This architecture makes it easy to add new modes later.

## How this fits the robot

The state machine is the central controller — the robot's decision-maker. Every subsystem (motors, sensors, display, LEDs, buzzer) now has a boss telling it what to do. In Project 20, the mission system will add mission-specific modes on top of this framework. This is the glue that holds the entire robot together.
