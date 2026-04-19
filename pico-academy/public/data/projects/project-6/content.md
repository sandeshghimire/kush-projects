# Closed-Loop Speed Control

## What you'll learn
- The difference between open-loop and closed-loop control
- What a PID controller is and how the P and I terms work
- How to measure wheel speed from encoder ticks over time
- How to tune a PI controller for smooth, consistent driving
- Why closed-loop control makes the robot reliable on any surface

## Parts you'll need
- Everything from Projects 1–5 (already assembled)
- No new parts needed!

**Total: $0**

## Background

In Project 4 we set the motor PWM to, say, 50 % and hoped for the best. But "50 % PWM" does not mean "50 % speed." On carpet the robot crawls; on tile it zooms. As the battery drains, the robot slows down even on the same surface. This is **open-loop** control — you give a command and cross your fingers.

**Closed-loop** control is smarter. It works like a thermostat in your house: you set the desired temperature (the **setpoint**), a thermometer measures the actual temperature (the **feedback**), and the system adjusts the heater up or down to close the gap. The gap between what you want and what you have is called the **error**.

For our robot, the setpoint is "I want 30 ticks per second on each wheel." The encoders from Project 5 provide the feedback — the actual ticks per second. A **PI controller** adjusts the PWM every loop cycle:

- **P (Proportional):** If the error is big, push hard. If small, push gently.
- **I (Integral):** If a small error persists over time, gradually increase the push to eliminate it.

Together, P and I make the wheels spin at almost exactly the speed you ask for, no matter the battery level or floor type. There is also a D (Derivative) term, but for a beginner robot, PI is usually enough.

## Wiring

No new wiring — uses motors from Project 3 and encoders from Project 5.

| Component | Pins |
|---|---|
| Left motor (PWM, direction) | GP16, GP17, GP18 |
| Right motor (PWM, direction) | GP19, GP20, GP21 |
| Motor driver standby | GP22 |
| Left encoder | GP2 |
| Right encoder | GP3 |

## The code

```c
#include <stdio.h>
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
#define LEFT_ENC  2
#define RIGHT_ENC 3
#define PWM_WRAP  9999

// --- Encoder tick counters ---
volatile uint32_t left_ticks  = 0;
volatile uint32_t right_ticks = 0;

void encoder_isr(uint gpio, uint32_t events) {
    if (gpio == LEFT_ENC)  left_ticks++;
    else if (gpio == RIGHT_ENC) right_ticks++;
}

// --- Motor helpers (from Project 3) ---
static void init_gpio_out(uint pin) {
    gpio_init(pin); gpio_set_dir(pin, GPIO_OUT); gpio_put(pin, 0);
}

void motor_init(void) {
    uint pins_pwm[] = {PWMA_PIN, PWMB_PIN};
    for (int i = 0; i < 2; i++) {
        gpio_set_function(pins_pwm[i], GPIO_FUNC_PWM);
        uint slice = pwm_gpio_to_slice_num(pins_pwm[i]);
        pwm_set_wrap(slice, PWM_WRAP);
        pwm_set_gpio_level(pins_pwm[i], 0);
        pwm_set_enabled(slice, true);
    }
    init_gpio_out(AIN1_PIN); init_gpio_out(AIN2_PIN);
    init_gpio_out(BIN1_PIN); init_gpio_out(BIN2_PIN);
    init_gpio_out(STBY_PIN);
    gpio_put(STBY_PIN, 1);
}

void motor_set_pwm(int channel, int pwm_val) {
    if (pwm_val > PWM_WRAP) pwm_val = PWM_WRAP;
    if (pwm_val < 0) pwm_val = 0;
    uint in1, in2, pwm_pin;
    if (channel == 0) { in1 = AIN1_PIN; in2 = AIN2_PIN; pwm_pin = PWMA_PIN; }
    else              { in1 = BIN1_PIN; in2 = BIN2_PIN; pwm_pin = PWMB_PIN; }
    gpio_put(in1, 1);
    gpio_put(in2, 0);
    pwm_set_gpio_level(pwm_pin, (uint16_t)pwm_val);
}

void encoder_init(void) {
    gpio_init(LEFT_ENC);  gpio_set_dir(LEFT_ENC, GPIO_IN);  gpio_pull_up(LEFT_ENC);
    gpio_set_irq_enabled_with_callback(LEFT_ENC, GPIO_IRQ_EDGE_RISE, true, &encoder_isr);
    gpio_init(RIGHT_ENC); gpio_set_dir(RIGHT_ENC, GPIO_IN); gpio_pull_up(RIGHT_ENC);
    gpio_set_irq_enabled(RIGHT_ENC, GPIO_IRQ_EDGE_RISE, true);
}

// --- PI Controller structure ---
typedef struct {
    float kp;           // Proportional gain
    float ki;           // Integral gain
    float integral;     // Accumulated error
    float integral_max; // Anti-windup limit
    int   output;       // PWM output value
} PIController;

void pi_init(PIController *pi, float kp, float ki, float i_max) {
    pi->kp = kp;
    pi->ki = ki;
    pi->integral = 0.0f;
    pi->integral_max = i_max;
    pi->output = 0;
}

int pi_update(PIController *pi, float setpoint, float measured, float dt) {
    float error = setpoint - measured;

    pi->integral += error * dt;
    // Anti-windup: clamp the integral term
    if (pi->integral >  pi->integral_max) pi->integral =  pi->integral_max;
    if (pi->integral < -pi->integral_max) pi->integral = -pi->integral_max;

    float output = (pi->kp * error) + (pi->ki * pi->integral);

    // Clamp output to valid PWM range
    if (output > PWM_WRAP) output = PWM_WRAP;
    if (output < 0)        output = 0;

    pi->output = (int)output;
    return pi->output;
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    motor_init();
    encoder_init();

    PIController pi_left, pi_right;
    pi_init(&pi_left,  500.0f, 100.0f, 5000.0f);
    pi_init(&pi_right, 500.0f, 100.0f, 5000.0f);

    float target_ticks_per_sec = 30.0f;  // Desired speed
    float dt = 0.05f;                     // 50 ms loop interval

    printf("=== Closed-Loop Speed Control ===\n");
    printf("Target: %.0f ticks/sec per wheel\n\n", target_ticks_per_sec);

    uint32_t prev_left = 0, prev_right = 0;

    while (true) {
        uint32_t l = left_ticks;
        uint32_t r = right_ticks;

        float speed_left  = (l - prev_left)  / dt;
        float speed_right = (r - prev_right) / dt;
        prev_left  = l;
        prev_right = r;

        int pwm_l = pi_update(&pi_left,  target_ticks_per_sec, speed_left,  dt);
        int pwm_r = pi_update(&pi_right, target_ticks_per_sec, speed_right, dt);

        motor_set_pwm(0, pwm_l);
        motor_set_pwm(1, pwm_r);

        printf("L: %.1f t/s (pwm %d)  R: %.1f t/s (pwm %d)\n",
               speed_left, pwm_l, speed_right, pwm_r);

        sleep_ms((int)(dt * 1000));
    }

    return 0;
}
```

## Try it
1. **Watch it stabilise** — Open the serial monitor and see the speed converge to the target within a few seconds.
2. **Change target** — Set `target_ticks_per_sec` to 10, then 50. The controller adjusts PWM automatically.
3. **Floor test** — Run the robot on tile, then carpet. The speed should stay the same even though the PWM values differ!
4. **Press the wheel** — Gently press a finger against a spinning wheel to add friction. Watch the PWM increase to compensate.

## Challenge

Add a **D (Derivative)** term to make a full PID controller. The D term reacts to how fast the error is changing, which can reduce overshoot. Compare PI vs PID behaviour by logging data and plotting speed over time.

## Summary

You built a PI speed controller that reads encoder feedback and adjusts motor PWM to maintain a target speed. The robot now drives at a consistent pace regardless of battery voltage or floor surface — a huge upgrade from open-loop timing.

## How this fits the robot

Closed-loop speed control is the core of reliable movement. When the obstacle avoidance system (Project 8) says "go forward at 30 ticks/sec," it means *exactly* that speed. When line following (Project 10) needs a precise left/right speed difference, the PI controller delivers it accurately.
