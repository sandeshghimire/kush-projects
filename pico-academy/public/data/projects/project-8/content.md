# Autonomous Obstacle Avoidance

## What you'll learn
- What a state machine is and why robots use them
- How to combine sensor input with motor output for autonomy
- How to design behaviour with three states: drive, detect, turn
- How to add randomness so the robot does not get stuck in loops
- How to debug autonomous behaviour using serial logging

## Parts you'll need
- Everything from Projects 1–7 (already assembled)
- A few cardboard boxes or books as obstacles
- No new parts needed!

**Total: $0**

## Background

So far, your robot can drive (Project 4) and see distance (Project 7), but those two abilities have not worked together yet. In this project, we connect the brain to the eyes and muscles — the robot will drive forward on its own and dodge obstacles without any help from you!

The secret is a **state machine**. Imagine your robot has three moods:

1. **DRIVE_FORWARD** — "Everything is clear ahead, keep going!"
2. **OBSTACLE_DETECTED** — "Something is too close! Stop and think."
3. **TURNING** — "I'm turning away from the obstacle."

The robot starts in DRIVE_FORWARD. Every loop, it checks the ultrasonic sensor. If the distance drops below 25 cm, it switches to OBSTACLE_DETECTED, stops the motors, then transitions to TURNING, where it picks a random direction (left or right) and spins for a short time. After turning, it goes back to DRIVE_FORWARD and repeats.

Why random? If the robot always turned the same direction, it could get stuck in a corner, bouncing back and forth forever. Randomness helps it escape tricky situations.

State machines are used in real self-driving cars, factory robots, and even video game characters. They keep the code organised — each state has clear rules for what to do and when to switch.

## Wiring

No new wiring — uses components from previous projects.

| Component | Pins |
|---|---|
| Left motor (PWM, dir) | GP16, GP17, GP18 |
| Right motor (PWM, dir) | GP19, GP20, GP21 |
| Motor driver standby | GP22 |
| Ultrasonic TRIG | GP14 |
| Ultrasonic ECHO | GP15 (with voltage divider) |

## The code

```c
#include <stdio.h>
#include <stdlib.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"
#include "hardware/timer.h"

// --- Pin definitions ---
#define PWMA_PIN  16
#define AIN1_PIN  17
#define AIN2_PIN  18
#define PWMB_PIN  19
#define BIN1_PIN  20
#define BIN2_PIN  21
#define STBY_PIN  22
#define TRIG_PIN  14
#define ECHO_PIN  15
#define PWM_WRAP  9999

// --- States ---
typedef enum {
    STATE_DRIVE_FORWARD,
    STATE_OBSTACLE_DETECTED,
    STATE_TURNING
} RobotState;

#define OBSTACLE_THRESHOLD_CM  25.0f
#define TURN_SPEED             50
#define DRIVE_SPEED            45
#define TURN_DURATION_MS       500
#define TIMEOUT_US             30000
#define SOUND_SPEED            0.0343f

// --- Motor functions (from Project 3) ---
static void init_gpio_out(uint pin) {
    gpio_init(pin); gpio_set_dir(pin, GPIO_OUT); gpio_put(pin, 0);
}

void motor_init(void) {
    uint pwm_pins[] = {PWMA_PIN, PWMB_PIN};
    for (int i = 0; i < 2; i++) {
        gpio_set_function(pwm_pins[i], GPIO_FUNC_PWM);
        uint slice = pwm_gpio_to_slice_num(pwm_pins[i]);
        pwm_set_wrap(slice, PWM_WRAP);
        pwm_set_gpio_level(pwm_pins[i], 0);
        pwm_set_enabled(slice, true);
    }
    init_gpio_out(AIN1_PIN); init_gpio_out(AIN2_PIN);
    init_gpio_out(BIN1_PIN); init_gpio_out(BIN2_PIN);
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

void drive(int left, int right) { motor_set(0, left); motor_set(1, right); }
void stop(void) { drive(0, 0); }

// --- Ultrasonic sensor (from Project 7) ---
void ultrasonic_init(void) {
    gpio_init(TRIG_PIN); gpio_set_dir(TRIG_PIN, GPIO_OUT); gpio_put(TRIG_PIN, 0);
    gpio_init(ECHO_PIN); gpio_set_dir(ECHO_PIN, GPIO_IN);  gpio_pull_down(ECHO_PIN);
}

float measure_distance_cm(void) {
    gpio_put(TRIG_PIN, 1);
    sleep_us(10);
    gpio_put(TRIG_PIN, 0);

    uint64_t t0 = time_us_64();
    while (gpio_get(ECHO_PIN) == 0) {
        if (time_us_64() - t0 > TIMEOUT_US) return -1.0f;
    }
    uint64_t pulse_start = time_us_64();
    while (gpio_get(ECHO_PIN) == 1) {
        if (time_us_64() - pulse_start > TIMEOUT_US) return -1.0f;
    }
    uint64_t duration = time_us_64() - pulse_start;
    return (duration * SOUND_SPEED) / 2.0f;
}

// --- State names for logging ---
const char *state_name(RobotState s) {
    switch (s) {
        case STATE_DRIVE_FORWARD:     return "DRIVE_FORWARD";
        case STATE_OBSTACLE_DETECTED: return "OBSTACLE_DETECTED";
        case STATE_TURNING:           return "TURNING";
        default:                      return "UNKNOWN";
    }
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    motor_init();
    ultrasonic_init();

    // Seed random number generator from timer
    srand((unsigned int)time_us_32());

    RobotState state = STATE_DRIVE_FORWARD;
    uint32_t turn_start = 0;
    int turn_direction = 1;  // 1 = right, -1 = left

    printf("=== Autonomous Obstacle Avoidance ===\n");
    printf("Place obstacles in the robot's path!\n\n");

    while (true) {
        float dist = measure_distance_cm();

        switch (state) {
        case STATE_DRIVE_FORWARD:
            drive(DRIVE_SPEED, DRIVE_SPEED);
            if (dist > 0 && dist < OBSTACLE_THRESHOLD_CM) {
                stop();
                printf("[%s] Obstacle at %.1f cm! Stopping.\n",
                       state_name(state), dist);
                state = STATE_OBSTACLE_DETECTED;
            }
            break;

        case STATE_OBSTACLE_DETECTED:
            // Pick a random turn direction
            turn_direction = (rand() % 2 == 0) ? 1 : -1;
            printf("[%s] Turning %s\n", state_name(state),
                   turn_direction > 0 ? "RIGHT" : "LEFT");
            turn_start = to_ms_since_boot(get_absolute_time());
            state = STATE_TURNING;
            break;

        case STATE_TURNING:
            drive(TURN_SPEED * turn_direction, -TURN_SPEED * turn_direction);
            if (to_ms_since_boot(get_absolute_time()) - turn_start > TURN_DURATION_MS) {
                stop();
                printf("[%s] Turn complete. Resuming forward.\n",
                       state_name(state));
                state = STATE_DRIVE_FORWARD;
            }
            break;
        }

        sleep_ms(50);
    }

    return 0;
}
```

## Try it
1. **Change the threshold** — Set `OBSTACLE_THRESHOLD_CM` to 40 cm. The robot becomes more cautious and turns earlier.
2. **Wall hugger** — When the robot turns, check the distance again. If still blocked, turn more. This helps in tight spaces.
3. **Speed variation** — Lower `DRIVE_SPEED` to 30 for a slow, careful explorer or raise to 70 for a speedy dodger.
4. **Logging** — Watch the serial output to see state transitions in real time. It helps you understand the robot's "thinking."

## Challenge

Add a fourth state: `REVERSING`. When the robot detects an obstacle, it first backs up for 300 ms, *then* turns. This helps when the robot gets very close to a wall before detecting it. You'll need to add a timer for the reverse phase too.

## Summary

You built your first autonomous behaviour by combining the ultrasonic sensor with the drive functions inside a state machine. The robot drives forward, detects obstacles, and turns away — all on its own! State machines keep the logic clean and easy to extend.

## How this fits the robot

Obstacle avoidance is the robot's first real "intelligence." It demonstrates the sensor → decide → act loop that all autonomous systems use. This same state machine architecture will expand in Project 10 when line-following adds a whole new set of states and behaviours.
