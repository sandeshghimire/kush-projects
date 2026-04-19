# Wire Up the Motor Driver Board

## What you'll learn
- Why motors need a separate driver chip (the Pico can't drive them directly)
- How an H-bridge works to spin a motor forward and backward
- How PWM (Pulse Width Modulation) controls motor speed
- How to wire the TB6612FNG dual motor driver to the Pico 2
- How to write reusable motor control functions in C

## Parts you'll need
- TB6612FNG dual motor driver breakout board — $3
- Screw terminals (2-pin, for motor wires) — $0.50
- Hookup wire (pre-cut jumper pack) — from your kit

**Total: ≈ $3.50** (motors and battery already installed from earlier projects)

## Background

The Pico 2 is smart, but its GPIO pins can only push out about 12 milliamps of current — way too little to spin a motor. A small DC gear-motor might draw 200 mA or more! If you connected a motor directly to a GPIO pin, the Pico would be damaged. We need a middleman: the **motor driver**.

The TB6612FNG is a tiny chip that acts like a set of electronic switches called an **H-bridge**. Imagine four switches arranged in the shape of the letter H, with the motor sitting in the middle bar. By flipping different pairs of switches, current flows through the motor in one direction (forward) or the other (backward). The chip handles the heavy current from the battery while the Pico just tells it *which* switches to flip.

Speed control uses a trick called **PWM** — Pulse Width Modulation. Instead of giving the motor a steady voltage, the Pico rapidly switches the power on and off. If it is on 50 % of the time, the motor gets half speed. If it is on 100 %, full speed. The switching happens thousands of times per second, so the motor just feels a smooth average.

The TB6612FNG can control two motors independently (channel A and channel B) — perfect for our two-wheel robot. It also has a standby pin: pull STBY high to enable the chip, or low to put it to sleep and save power.

## Wiring

| TB6612FNG Pin | Connects To | Notes |
|---|---|---|
| VM | Battery + (7.4 V) | Motor power supply |
| VCC | Pico 3V3 OUT (pin 36) | Logic power (3.3 V) |
| GND | Common GND | Shared with Pico and battery |
| STBY | Pico GP22 | HIGH to enable, LOW to sleep |
| PWMA | Pico GP16 | PWM speed for motor A (left) |
| AIN1 | Pico GP17 | Direction pin 1 for motor A |
| AIN2 | Pico GP18 | Direction pin 2 for motor A |
| PWMB | Pico GP19 | PWM speed for motor B (right) |
| BIN1 | Pico GP20 | Direction pin 1 for motor B |
| BIN2 | Pico GP21 | Direction pin 2 for motor B |
| AO1 / AO2 | Left motor wires | Screw terminal to motor |
| BO1 / BO2 | Right motor wires | Screw terminal to motor |

> **Direction logic:** AIN1=HIGH, AIN2=LOW → forward. AIN1=LOW, AIN2=HIGH → reverse. Both LOW → coast stop. Both HIGH → brake.

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// --- Pin definitions ---
#define PWMA_PIN  16
#define AIN1_PIN  17
#define AIN2_PIN  18
#define PWMB_PIN  19
#define BIN1_PIN  20
#define BIN2_PIN  21
#define STBY_PIN  22

#define PWM_WRAP  9999   // 12.5 kHz at 125 MHz system clock

// Initialise a single GPIO as output and set it low
static void init_gpio_out(uint pin) {
    gpio_init(pin);
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0);
}

// Initialise a GPIO as PWM output and return its slice number
static uint init_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, PWM_WRAP);
    pwm_set_gpio_level(pin, 0);
    pwm_set_enabled(slice, true);
    return slice;
}

// Call once at startup
void motor_init(void) {
    init_pwm_pin(PWMA_PIN);
    init_pwm_pin(PWMB_PIN);

    init_gpio_out(AIN1_PIN);
    init_gpio_out(AIN2_PIN);
    init_gpio_out(BIN1_PIN);
    init_gpio_out(BIN2_PIN);
    init_gpio_out(STBY_PIN);

    // Enable the driver
    gpio_put(STBY_PIN, 1);
    printf("Motor driver initialised.\n");
}

// Set a motor's speed: channel 0 = A (left), 1 = B (right)
// speed: -100 (full reverse) to +100 (full forward)
void motor_set(int channel, int speed) {
    // Clamp speed
    if (speed > 100)  speed = 100;
    if (speed < -100) speed = -100;

    uint in1, in2, pwm_pin;
    if (channel == 0) {
        in1 = AIN1_PIN; in2 = AIN2_PIN; pwm_pin = PWMA_PIN;
    } else {
        in1 = BIN1_PIN; in2 = BIN2_PIN; pwm_pin = PWMB_PIN;
    }

    if (speed > 0) {
        gpio_put(in1, 1);
        gpio_put(in2, 0);
    } else if (speed < 0) {
        gpio_put(in1, 0);
        gpio_put(in2, 1);
        speed = -speed;  // Make positive for PWM
    } else {
        gpio_put(in1, 0);
        gpio_put(in2, 0);
    }

    uint16_t level = (uint16_t)((speed * PWM_WRAP) / 100);
    pwm_set_gpio_level(pwm_pin, level);
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    motor_init();

    printf("Testing Motor A (left) forward...\n");
    motor_set(0, 60);
    sleep_ms(2000);
    motor_set(0, 0);
    sleep_ms(1000);

    printf("Testing Motor A (left) reverse...\n");
    motor_set(0, -60);
    sleep_ms(2000);
    motor_set(0, 0);
    sleep_ms(1000);

    printf("Testing Motor B (right) forward...\n");
    motor_set(1, 60);
    sleep_ms(2000);
    motor_set(1, 0);
    sleep_ms(1000);

    printf("Testing Motor B (right) reverse...\n");
    motor_set(1, -60);
    sleep_ms(2000);
    motor_set(1, 0);

    printf("Motor test complete!\n");

    while (true) {
        tight_loop_contents();
    }

    return 0;
}
```

## Try it
1. **Half speed vs full speed** — Change the `60` in motor_set to `30` and then `100`. Feel and hear the difference.
2. **Ramp up** — Write a loop that increases speed from 0 to 100 in steps of 5 with a 100 ms delay each step. The motor smoothly accelerates!
3. **Brake vs coast** — Set both direction pins HIGH for a hard brake instead of both LOW. Notice the motor stops faster.

## Challenge

Add a function `motor_brake(int channel)` that sets both direction pins HIGH and PWM to maximum. Compare how quickly the wheel stops with brake vs coast (both pins LOW). Time it with a stopwatch!

## Summary

You wired the TB6612FNG motor driver to the Pico 2 and wrote `motor_init()` and `motor_set()` functions. The Pico sends small logic signals, and the driver chip handles the heavy battery current to spin the motors forward, backward, or stop them.

## How this fits the robot

The motor driver is the robot's muscle system. It translates the brain's (Pico's) tiny electrical signals into real physical motion. Every driving function in future projects — forward, turn, line follow — will call `motor_set()` under the hood.
