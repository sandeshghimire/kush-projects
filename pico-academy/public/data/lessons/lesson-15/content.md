# Stepper Motors — Stepping One Click at a Time

## What you'll learn
- How stepper motors differ from DC motors and servos
- What full-step and half-step sequences are
- How to drive a 28BYJ-48 stepper with a ULN2003 driver
- How step timing controls rotation speed
- How to count steps for precise positioning

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× 28BYJ-48 stepper motor with ULN2003 driver board (~$3)
- 5× jumper wires (~$0.50)

## Background

A DC motor spins smoothly at whatever speed you give it. A servo jumps to angles but can only go 0–180°. A **stepper motor** is something completely different — it rotates in precise, individual **steps**. Each step is a tiny, exact rotation, like the tick of a clock hand.

Imagine a circular staircase with 2048 tiny stairs (steps). Each time you send a "step" signal, the motor climbs exactly one stair. Send 512 steps and it rotates exactly 90°. Send 2048 steps and it does one complete revolution. You always know exactly where the motor is, just by counting your steps. No feedback sensor needed!

Inside a stepper motor are electromagnetic **coils** arranged in a circle. By energizing them in a specific sequence, you create a rotating magnetic field that pulls the motor's permanent magnet rotor from one position to the next. The **28BYJ-48** has four coils that you energize in different patterns.

The **ULN2003** driver board has Darlington transistor arrays that can handle the higher current the coil needs (each coil draws about 200 mA). It also has handy LEDs that show which coils are active.

In **full-step** mode, you energize one coil at a time and get 2048 steps per revolution. In **half-step** mode, you alternate between one and two coils, doubling the resolution to 4096 steps per revolution — but each step is half as strong.

## Wiring

| Pico Pin | ULN2003 Pin |
|----------|-------------|
| GP18 | IN1 |
| GP19 | IN2 |
| GP20 | IN3 |
| GP21 | IN4 |

The ULN2003 board gets 5V from the Pico's VBUS pin and GND. The motor plugs directly into the board's white connector.

## The code

```c
#include "pico/stdlib.h"
#include <stdio.h>

#define IN1_PIN 18
#define IN2_PIN 19
#define IN3_PIN 20
#define IN4_PIN 21

// Full-step sequence (4 steps per cycle)
const bool full_step[4][4] = {
    {1, 0, 0, 0},  // Step 0: coil A
    {0, 1, 0, 0},  // Step 1: coil B
    {0, 0, 1, 0},  // Step 2: coil C
    {0, 0, 0, 1},  // Step 3: coil D
};

// Half-step sequence (8 steps per cycle, smoother)
const bool half_step[8][4] = {
    {1, 0, 0, 0},  // Step 0
    {1, 1, 0, 0},  // Step 1
    {0, 1, 0, 0},  // Step 2
    {0, 1, 1, 0},  // Step 3
    {0, 0, 1, 0},  // Step 4
    {0, 0, 1, 1},  // Step 5
    {0, 0, 0, 1},  // Step 6
    {1, 0, 0, 1},  // Step 7
};

const uint stepper_pins[] = {IN1_PIN, IN2_PIN, IN3_PIN, IN4_PIN};

void stepper_init(void) {
    for (int i = 0; i < 4; i++) {
        gpio_init(stepper_pins[i]);
        gpio_set_dir(stepper_pins[i], GPIO_OUT);
        gpio_put(stepper_pins[i], 0);
    }
}

// Apply one step of the sequence to the coil pins
void stepper_set_coils(const bool coils[4]) {
    for (int i = 0; i < 4; i++) {
        gpio_put(stepper_pins[i], coils[i]);
    }
}

// Turn off all coils (save power when not moving)
void stepper_release(void) {
    for (int i = 0; i < 4; i++) {
        gpio_put(stepper_pins[i], 0);
    }
}

// Move a number of steps using half-step mode
// Positive = clockwise, negative = counter-clockwise
// delay_ms controls speed (lower = faster, minimum ~2ms)
void stepper_step(int steps, uint delay) {
    int direction = (steps > 0) ? 1 : -1;
    int count = (steps > 0) ? steps : -steps;
    static int phase = 0;

    for (int i = 0; i < count; i++) {
        phase = (phase + direction + 8) % 8;
        stepper_set_coils(half_step[phase]);
        sleep_ms(delay);
    }
}

int main() {
    stdio_init_all();
    stepper_init();

    printf("Stepper motor demo\n");
    printf("28BYJ-48: 4096 half-steps = 1 revolution\n");

    while (true) {
        // One full revolution clockwise
        printf("CW 360°\n");
        stepper_step(4096, 2);
        sleep_ms(500);

        // Half revolution counter-clockwise
        printf("CCW 180°\n");
        stepper_step(-2048, 2);
        sleep_ms(500);

        // Quarter turn clockwise, slowly
        printf("CW 90° slow\n");
        stepper_step(1024, 5);
        sleep_ms(500);

        // Release the coils to save power
        stepper_release();
        sleep_ms(2000);
    }

    return 0;
}
```

### How the code works

1. The **half-step sequence** activates coils in 8 phases per cycle. 4096 half-steps = one complete revolution.
2. `stepper_step()` tracks the current phase and advances by +1 (clockwise) or −1 (counter-clockwise).
3. The delay between steps controls speed: 2ms per step ≈ 8 seconds per revolution. Too fast and the motor skips steps.
4. `stepper_release()` turns off all coils when you're done moving. This saves power but lets the shaft spin freely.

## Try it

1. **Precise positioning** — Move exactly 90° (1024 steps), stop for 2 seconds, move another 90°, repeat to make a square pattern.
2. **Speed ramp** — Start slow and accelerate to prevent missed steps, then decelerate before stopping.
3. **Full-step mode** — Switch to the 4-step full-step sequence and compare smoothness and torque to half-step.

## Challenge

Build a simple clock: use the stepper motor to move a pointer arm. Calculate how many steps per minute the "second hand" needs to move (4096 steps ÷ 60 seconds ≈ 68 steps per second). Use a repeating timer to trigger steps at precisely the right rate.

## Summary

Stepper motors rotate in precise, countable steps — no position sensor needed. The 28BYJ-48 uses 4096 half-steps for one complete revolution, driven through a ULN2003 Darlington driver. You control direction by reversing the coil activation sequence and speed by adjusting the delay between steps. Steppers are great for precision positioning tasks where you need to know exactly how far you've rotated!
