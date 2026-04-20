# Lesson 12: Joystick Module — Build a Mini Game Controller

## What you'll learn
- How a joystick works as two potentiometers glued together at right angles
- How to read two ADC channels on the Pico by switching between them
- What a "deadzone" is and why every good game controller uses one
- How to map joystick position to RGB LED colors and buzzer sounds

## Parts you'll need
- Raspberry Pi Pico 2 W
- Joystick Module (from the Elegoo 37 Kit — has a small joystick thumb-cap)
- RGB LED Module (R → GP9, G → GP10, B → GP11)
- Passive Buzzer Module (GP18)
- Breadboard and jumper wires
- USB cable

## Background

Here is a fun secret: the joystick inside every video game controller — PlayStation, Xbox, Switch — is just two potentiometers stuck together at 90 degrees, plus a push button hidden underneath the stick! You have already used a potentiometer concept in earlier lessons (it is just a variable resistor that gives you an analog voltage). Moving the joystick left or right changes one potentiometer and gives you a voltage on the VRx pin. Moving it up or down changes the other potentiometer and gives you a voltage on the VRy pin. The Pico reads both voltages with its ADC (Analog-to-Digital Converter) and turns them into numbers from 0 to 4095.

When the joystick is sitting perfectly in the center, both readings should be around 2048 — right in the middle of the 0–4095 range. But in real life, the center is never perfect. The stick might read 2030 or 2060 even when you are not touching it, just because of tiny manufacturing differences. That is why game controllers use a **deadzone**: a small region around the center where we just ignore small movements and say "close enough, this is center." In your code you will treat any reading within 200 of center (between 1848 and 2248) as "center position." This stops your LED from flickering around when the joystick is resting still.

The Pico only has one ADC multiplexer, so to read two analog pins you have to tell the hardware which one you want first, take the reading, then switch to the other pin and take that reading. The function `adc_select_input(0)` picks ADC channel 0 (GP26), and `adc_select_input(1)` picks ADC channel 1 (GP27). You will do this switching in a tight little loop so both readings happen almost at the same time. When you push the joystick straight down like a button, the SW pin goes LOW (it has an internal pull-up) — your code watches for that too and triggers a fun buzzer-and-flash reaction!

## Wiring

| Pico Pin | Component |
|---|---|
| 3V3 (pin 36) | Joystick Module — VCC |
| GND | Joystick Module — GND |
| GP26 (ADC0) | Joystick Module — VRx |
| GP27 (ADC1) | Joystick Module — VRy |
| GP14 | Joystick Module — SW (push button) |
| GP9 | RGB LED Module — R |
| GP10 | RGB LED Module — G |
| GP11 | RGB LED Module — B |
| 3V3 | RGB LED Module — VCC (or +) |
| GND | RGB LED Module — GND |
| GP18 | Passive Buzzer Module — S |
| 3V3 | Passive Buzzer Module — VCC |
| GND | Passive Buzzer Module — GND |

> **Tip:** The SW pin is the joystick push button. It reads LOW when pressed and HIGH when released. The Pico's internal pull-up resistor takes care of that for you — just enable it in code.

## The code

```c
/**
 * Lesson 12: Joystick Module — Build a Mini Game Controller
 * Hardware: Raspberry Pi Pico 2 W  |  Language: C, Pico SDK
 *
 * Reads the Joystick Module (VRx on GP26/ADC0, VRy on GP27/ADC1, SW on GP14).
 * Maps joystick direction to RGB LED colors and buzzer sounds.
 * Implements a simple text-grid game on the serial monitor.
 *
 * Wiring:
 *   Joystick VRx → GP26  |  VRy → GP27  |  SW → GP14
 *   RGB LED R/G/B → GP9 / GP10 / GP11
 *   Passive Buzzer → GP18
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define VRX_PIN     26   // ADC channel 0
#define VRY_PIN     27   // ADC channel 1
#define SW_PIN      14   // Push button (active LOW)
#define BUZZER_PIN  18
#define LED_R_PIN    9
#define LED_G_PIN   10
#define LED_B_PIN   11

// ── Joystick center and deadzone ─────────────────────────────────────────────
#define JOY_CENTER  2048
#define JOY_DEAD     200   // ±200 around center = treat as CENTER

// ── Direction enum ────────────────────────────────────────────────────────────
typedef enum {
    DIR_CENTER,
    DIR_UP,
    DIR_DOWN,
    DIR_LEFT,
    DIR_RIGHT
} Direction;

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

void rgb_set(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, (r * r) / 255);   // Gamma correction
    pwm_set_gpio_level(LED_G_PIN, (g * g) / 255);
    pwm_set_gpio_level(LED_B_PIN, (b * b) / 255);
}

// ── Passive buzzer tone helper ────────────────────────────────────────────────
void buzzer_beep(uint freq_hz, uint duration_ms) {
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

// ── Figure out which direction the joystick is pointing ──────────────────────
Direction get_direction(uint16_t x, uint16_t y) {
    int dx = (int)x - JOY_CENTER;
    int dy = (int)y - JOY_CENTER;

    // If both axes are within deadzone — report center
    if (dx > -JOY_DEAD && dx < JOY_DEAD &&
        dy > -JOY_DEAD && dy < JOY_DEAD) {
        return DIR_CENTER;
    }

    // Whichever axis is tilted more wins
    if (abs(dx) >= abs(dy)) {
        return (dx > 0) ? DIR_RIGHT : DIR_LEFT;
    } else {
        // Note: VRy usually reads HIGH when pushed UP on the Elegoo joystick
        return (dy > 0) ? DIR_UP : DIR_DOWN;
    }
}

// ── Apply color for each direction ───────────────────────────────────────────
void apply_direction_color(Direction d) {
    switch (d) {
        case DIR_UP:     rgb_set(255,   0,   0); break;   // Red    = Up
        case DIR_DOWN:   rgb_set(  0,   0, 255); break;   // Blue   = Down
        case DIR_LEFT:   rgb_set(  0, 255,   0); break;   // Green  = Left
        case DIR_RIGHT:  rgb_set(255, 255,   0); break;   // Yellow = Right
        case DIR_CENTER: rgb_set(255, 255, 255); break;   // White  = Center
    }
}

// ── Text maze game (5x5 grid) ─────────────────────────────────────────────────
#define GRID_W 5
#define GRID_H 5

// Layout: 0=open path, 1=wall, 2=goal
static const int maze[GRID_H][GRID_W] = {
    {0, 1, 0, 0, 0},
    {0, 1, 0, 1, 0},
    {0, 0, 0, 1, 0},
    {1, 1, 0, 0, 0},
    {0, 0, 0, 1, 2},
};

int player_x = 0;
int player_y = 0;

void print_maze(void) {
    printf("\n\033[2J\033[H");   // Clear terminal (works in most serial monitors)
    printf("=== Text Maze! Find the exit (E) ===\n");
    printf("Tilt joystick to move (P = you, # = wall, E = exit)\n\n");

    for (int row = 0; row < GRID_H; row++) {
        printf("  ");
        for (int col = 0; col < GRID_W; col++) {
            if (col == player_x && row == player_y) {
                printf("P ");   // Player
            } else if (maze[row][col] == 1) {
                printf("# ");   // Wall
            } else if (maze[row][col] == 2) {
                printf("E ");   // Exit
            } else {
                printf(". ");   // Open path
            }
        }
        printf("\n");
    }
    printf("\n");
}

void try_move(Direction d) {
    int nx = player_x;
    int ny = player_y;

    switch (d) {
        case DIR_UP:    ny--; break;
        case DIR_DOWN:  ny++; break;
        case DIR_LEFT:  nx--; break;
        case DIR_RIGHT: nx++; break;
        default: return;   // Center — do nothing
    }

    // Bounds check
    if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
        buzzer_beep(200, 80);   // Bonk — hit boundary
        return;
    }

    // Wall check
    if (maze[ny][nx] == 1) {
        buzzer_beep(200, 80);   // Bonk — hit a wall
        return;
    }

    // Valid move!
    player_x = nx;
    player_y = ny;
    buzzer_beep(600, 30);   // Click — successful step

    // Check for goal
    if (maze[ny][nx] == 2) {
        printf("\n*** YOU FOUND THE EXIT! Amazing! ***\n");
        rgb_set(0, 255, 0);
        for (int i = 0; i < 5; i++) {
            buzzer_beep(800, 80);
            buzzer_beep(1000, 80);
        }
        // Reset player to start
        player_x = 0;
        player_y = 0;
        printf("Restarting from the beginning...\n");
        sleep_ms(1500);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 12: Joystick Module ===\n");
    printf("Move the joystick! Watch the LED change color.\n\n");

    // ADC setup
    adc_init();
    adc_gpio_init(VRX_PIN);   // GP26 = ADC0
    adc_gpio_init(VRY_PIN);   // GP27 = ADC1

    // Push button setup
    gpio_init(SW_PIN);
    gpio_set_dir(SW_PIN, GPIO_IN);
    gpio_pull_up(SW_PIN);   // Active LOW — reads HIGH normally

    // RGB LED and buzzer setup
    rgb_init();
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);

    rgb_set(255, 255, 255);   // Start white

    Direction last_dir = DIR_CENTER;
    bool maze_mode = false;
    bool last_sw = true;   // Track previous button state (HIGH = released)

    uint32_t last_move_time = 0;   // Throttle maze moves to one per 300 ms

    print_maze();

    while (true) {
        // ── Read X and Y axes ─────────────────────────────────────────────────
        adc_select_input(0);           // Switch to ADC channel 0 (VRx = GP26)
        uint16_t raw_x = adc_read();   // 12-bit value: 0 – 4095

        adc_select_input(1);           // Switch to ADC channel 1 (VRy = GP27)
        uint16_t raw_y = adc_read();

        // ── Read push button ──────────────────────────────────────────────────
        bool sw_now = gpio_get(SW_PIN);   // true = released, false = pressed

        // Detect button press (HIGH → LOW transition)
        if (last_sw == true && sw_now == false) {
            // Button was just pressed!
            maze_mode = !maze_mode;
            if (maze_mode) {
                printf("\nMAZE MODE ON — tilt to navigate!\n");
                buzzer_beep(700, 60);
                buzzer_beep(900, 60);
                player_x = 0;
                player_y = 0;
                print_maze();
            } else {
                printf("\nMAZE MODE OFF — back to color mode!\n");
                buzzer_beep(900, 60);
                buzzer_beep(700, 60);
            }
        }
        last_sw = sw_now;

        // ── Calculate direction ───────────────────────────────────────────────
        Direction dir = get_direction(raw_x, raw_y);

        if (maze_mode) {
            // ── Maze navigation mode ──────────────────────────────────────────
            uint32_t now = to_ms_since_boot(get_absolute_time());
            if (dir != DIR_CENTER && (now - last_move_time) > 300) {
                try_move(dir);
                print_maze();
                last_move_time = now;
            }
            apply_direction_color(dir);

        } else {
            // ── Color + serial mode ───────────────────────────────────────────
            apply_direction_color(dir);

            // Only print when direction changes (avoid flooding the terminal)
            if (dir != last_dir) {
                const char *dir_name;
                switch (dir) {
                    case DIR_UP:     dir_name = "UP    (Red)";    break;
                    case DIR_DOWN:   dir_name = "DOWN  (Blue)";   break;
                    case DIR_LEFT:   dir_name = "LEFT  (Green)";  break;
                    case DIR_RIGHT:  dir_name = "RIGHT (Yellow)"; break;
                    default:         dir_name = "CENTER (White)"; break;
                }
                printf("X=%-4d  Y=%-4d  →  %s\n", raw_x, raw_y, dir_name);
                last_dir = dir;
            }
        }

        sleep_ms(50);   // Check joystick about 20 times per second
    }
}
```

### How the code works

1. **ADC channel switching** — The Pico has one ADC multiplexer connected to pins GP26 (channel 0) and GP27 (channel 1). You call `adc_select_input(0)` to point the ADC at VRx, then `adc_read()` to get a 12-bit result (0–4095). Then switch to channel 1 for VRy and read again. Both reads happen within microseconds so they feel simultaneous.

2. **Deadzone logic** — `get_direction()` calculates how far each axis is from center (2048). If both axes are within 200 counts of center, the function returns `DIR_CENTER`. This prevents random drift when the stick is at rest. If one axis is tilted more than the other, the bigger tilt wins.

3. **Direction-to-color mapping** — `apply_direction_color()` uses a `switch` statement to set a specific color for each direction: Up = Red, Down = Blue, Left = Green, Right = Yellow, Center = White. These are easy to remember because they form a pattern.

4. **Push button edge detection** — The code saves the previous button state in `last_sw`. Each loop it compares the new reading to the old one. A transition from `true` (released) to `false` (pressed) is a "just pressed" event. This fires exactly once per press instead of over and over while the button is held down.

5. **Maze mode** — Pressing the joystick button toggles maze mode. In maze mode, the joystick direction is translated into player movement on a 5×5 text grid. The `try_move()` function checks boundary and wall collisions before moving. A move throttle (300 ms minimum between moves) prevents zipping through walls at high speed.

6. **Serial output** — The maze is drawn using `printf` with ANSI escape codes (`\033[2J\033[H`) to clear the terminal between redraws. In color mode, direction changes are printed only when the direction actually changes, so the terminal does not scroll too fast.

## Try it

1. **Find center** — Let the joystick sit completely still. Read the X and Y values in the serial monitor. Are they exactly 2048, or slightly off? This is the natural drift that makes a deadzone necessary.

2. **Deadzone experiment** — Change `JOY_DEAD` from 200 to 500. Does the joystick feel less responsive? Change it to 50. Does it feel too jittery? Put it back to 200 when you are done.

3. **Color compass** — Tilt the joystick in each direction and watch the LED. Can you make the LED show each of the five colors without looking at the code? Try to memorize: Up = Red, Down = Blue, Left = Green, Right = Yellow, Center = White.

4. **Play the maze** — Press the joystick button to enter maze mode. Navigate from the top-left corner to the E (exit) at the bottom-right. How many moves does it take? Try to find the shortest path!

## Challenge

Add an **analog brightness feature** to the color mode: instead of just showing a flat color for each direction, use how far the stick is from center to control the LED brightness. For example, if the stick is tilted only halfway to the right (raw_x ≈ 3072), the yellow LED should be at half brightness. If it is tilted all the way (raw_x ≈ 4095), full brightness. Use the `map()` idea: `brightness = (raw_x - JOY_CENTER - JOY_DEAD) * 255 / (2047 - JOY_DEAD)`. Clamp the result to 0–255. This makes the LED respond like a dimmer switch that the joystick controls!

## Summary

A joystick is nothing more than two potentiometers and a button — one for left/right, one for up/down — which is exactly the same technology inside every game controller on the planet. The Pico reads both analog voltages by switching between ADC channels, and a deadzone around the center prevents jittery readings when the stick is at rest. With just these skills you can build your own game controllers, robot steering systems, and interactive menus!
