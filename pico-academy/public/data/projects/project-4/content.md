# First Drive! Forward, Back, and Turn

## What you'll learn
- How differential steering works on a 2WD robot (skid-steer)
- How to combine two motor speeds into driving commands
- How to write clean helper functions: forward(), backward(), turn_left(), turn_right()
- How to sequence movements to drive in a square pattern
- How timing affects distance and turn angle

## Parts you'll need
- Everything from Projects 1–3 (already assembled on your robot)
- A clear floor space of at least 1 × 1 metre
- Masking tape (optional, to mark start position)

**Total: $0 — no new parts!**

## Background

Your robot has two wheels, one on each side, and a ball caster in front. This is called **differential drive** — to go forward, both wheels spin the same direction at the same speed. To turn, you make one wheel faster than the other (or spin them in opposite directions for a sharp spin).

Think of a rowing boat with two oars. If you pull both oars equally, you go straight. Pull only the right oar and the boat turns left. Pull the right oar forward while pushing the left oar backward and the boat spins on the spot! Our robot works the same way with wheels instead of oars.

Timing matters a lot. If `forward()` runs the motors for one second, the robot travels some distance. Two seconds, roughly double the distance. But floors are slippery and batteries lose charge, so the exact distance will vary — that is why we will add wheel encoders in Project 5 to measure *exactly* how far we travel.

For now, we will build a set of handy driving functions and test them by programming the robot to drive in a square: forward, turn 90°, forward, turn 90°, and so on four times until it returns to where it started. It will not be perfect (open-loop control never is), but it is exciting to watch!

## Wiring

No new wiring — this project uses the motor driver connections from Project 3.

| Function | Left Motor (A) | Right Motor (B) |
|---|---|---|
| Forward | +speed | +speed |
| Backward | −speed | −speed |
| Turn left (spin) | −speed | +speed |
| Turn right (spin) | +speed | −speed |

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// --- Pin definitions (same as Project 3) ---
#define PWMA_PIN  16
#define AIN1_PIN  17
#define AIN2_PIN  18
#define PWMB_PIN  19
#define BIN1_PIN  20
#define BIN2_PIN  21
#define STBY_PIN  22
#define PWM_WRAP  9999

static void init_gpio_out(uint pin) {
    gpio_init(pin);
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0);
}

static uint init_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, PWM_WRAP);
    pwm_set_gpio_level(pin, 0);
    pwm_set_enabled(slice, true);
    return slice;
}

void motor_init(void) {
    init_pwm_pin(PWMA_PIN);
    init_pwm_pin(PWMB_PIN);
    init_gpio_out(AIN1_PIN);
    init_gpio_out(AIN2_PIN);
    init_gpio_out(BIN1_PIN);
    init_gpio_out(BIN2_PIN);
    init_gpio_out(STBY_PIN);
    gpio_put(STBY_PIN, 1);
}

void motor_set(int channel, int speed) {
    if (speed > 100) speed = 100;
    if (speed < -100) speed = -100;
    uint in1, in2, pwm_pin;
    if (channel == 0) { in1 = AIN1_PIN; in2 = AIN2_PIN; pwm_pin = PWMA_PIN; }
    else              { in1 = BIN1_PIN; in2 = BIN2_PIN; pwm_pin = PWMB_PIN; }
    if (speed > 0)      { gpio_put(in1, 1); gpio_put(in2, 0); }
    else if (speed < 0) { gpio_put(in1, 0); gpio_put(in2, 1); speed = -speed; }
    else                { gpio_put(in1, 0); gpio_put(in2, 0); }
    pwm_set_gpio_level(pwm_pin, (uint16_t)((speed * PWM_WRAP) / 100));
}

// --- High-level drive functions ---

void drive(int left_speed, int right_speed) {
    motor_set(0, left_speed);
    motor_set(1, right_speed);
}

void stop(void) {
    drive(0, 0);
}

void forward(int speed, int duration_ms) {
    printf("  Forward at %d%% for %d ms\n", speed, duration_ms);
    drive(speed, speed);
    sleep_ms(duration_ms);
    stop();
}

void backward(int speed, int duration_ms) {
    printf("  Backward at %d%% for %d ms\n", speed, duration_ms);
    drive(-speed, -speed);
    sleep_ms(duration_ms);
    stop();
}

void turn_left(int speed, int duration_ms) {
    printf("  Turn LEFT at %d%% for %d ms\n", speed, duration_ms);
    drive(-speed, speed);
    sleep_ms(duration_ms);
    stop();
}

void turn_right(int speed, int duration_ms) {
    printf("  Turn RIGHT at %d%% for %d ms\n", speed, duration_ms);
    drive(speed, -speed);
    sleep_ms(duration_ms);
    stop();
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);
    motor_init();

    printf("=== Square Drive Test ===\n");

    int drive_speed = 50;
    int drive_time  = 1500;  // ms for one side of the square
    int turn_speed  = 45;
    int turn_time   = 600;   // ms for a ~90° spin (tune this!)

    for (int side = 0; side < 4; side++) {
        printf("Side %d:\n", side + 1);
        forward(drive_speed, drive_time);
        sleep_ms(300);  // Brief pause
        turn_right(turn_speed, turn_time);
        sleep_ms(300);
    }

    printf("Square complete! Robot should be near its starting spot.\n");

    while (true) {
        tight_loop_contents();
    }
    return 0;
}
```

## Try it
1. **Tune the 90° turn** — Adjust `turn_time` up or down until the robot turns almost exactly 90°. Every floor surface is different!
2. **Drive a triangle** — Change the loop to 3 sides and increase the turn time so the robot turns 120° instead of 90°.
3. **Figure-eight** — Alternate between `turn_left` and `turn_right` with forward segments to make a figure-eight pattern.
4. **Speed ramp** — Start each forward segment slow and ramp up, then ramp down before stopping for smoother motion.

## Challenge

Program the robot to spell out a letter — like an "L" shape — on the floor. Use masking tape on the wheels and a sheet of paper to trace the path and see how accurate your route is.

## Summary

You combined left and right motor control into easy drive functions and made the robot move in a square. You learned that timing-based control is imprecise — it gets you moving but is not accurate. Wheel encoders (Project 5) will fix that!

## How this fits the robot

These drive functions (`forward`, `backward`, `turn_left`, `turn_right`, `drive`, `stop`) become the robot's basic movement vocabulary. Every advanced behaviour — obstacle avoidance, line following — calls these same functions to make the car move.
