# Line Follower Mode

## 🎯 What You'll Learn
- How a PD controller steers a robot along a line
- What proportional and derivative control mean for steering
- How to combine line sensor readings into a continuous error value
- How to tune PD gains for smooth, fast line following
- How to handle intersections and line-lost recovery

## 🛒 Parts You Need
- Everything from Projects 1–9 (already assembled)
- A track made with black electrical tape on white poster board — $2

**Total: ≈ $2** (just tape and paper!)

## 🌟 Background / The Story

You've built all the pieces — now watch your robot do something magical: follow a line all by itself! This is one of the most satisfying robot projects ever. Put your robot on a black tape track, press go, and watch it smoothly trace every curve on its own. It's like magic!

The secret is a **PD controller** (Proportional-Derivative). Two ideas working together:

- **P (Proportional):** Steer in proportion to how far off the line you are. Far left = turn hard left. Barely off-center = turn just a little.
- **D (Derivative):** React to how FAST you're drifting off. If you're veering quickly, add extra correction. If it's stable, D does nothing. This stops the robot from wobbling!

We calculate the line's position from the three sensors using a weighted average:

```
position = (0 × left + 1000 × centre + 2000 × right) / (left + centre + right)
```

This gives a number from 0 to 2000, where 1000 means perfectly centered. Error = 1000 minus position. Positive error = turn left, negative = turn right!

## 🔌 Wiring

No new wiring — uses motors (Project 3) and line sensors (Project 9).

| Component | Pins |
|---|---|
| Left motor (PWM, dir) | GP16, GP17, GP18 |
| Right motor (PWM, dir) | GP19, GP20, GP21 |
| Motor driver standby | GP22 |
| Left line sensor | GP26 (ADC0) |
| Centre line sensor | GP27 (ADC1) |
| Right line sensor | GP28 (ADC2) |

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/adc.h"

// --- Motor pins ---
#define PWMA_PIN  16
#define AIN1_PIN  17
#define AIN2_PIN  18
#define PWMB_PIN  19
#define BIN1_PIN  20
#define BIN2_PIN  21
#define STBY_PIN  22
#define PWM_WRAP  9999

// --- Line sensor pins ---
#define LEFT_SENSOR_PIN   26
#define CENTER_SENSOR_PIN 27
#define RIGHT_SENSOR_PIN  28
#define NUM_SENSORS       3

// --- PD gains (tune these!) ---
#define KP  0.6f
#define KD  0.3f
#define BASE_SPEED  40    // Percent (0–100)
#define MAX_SPEED   80

// --- Calibration data ---
uint16_t cal_min[NUM_SENSORS] = {4095, 4095, 4095};
uint16_t cal_max[NUM_SENSORS] = {0, 0, 0};
uint8_t  adc_ch[NUM_SENSORS]  = {0, 1, 2};

// --- Motor setup (from Project 3) ---
static void init_gpio_out(uint pin) {
    gpio_init(pin); gpio_set_dir(pin, GPIO_OUT); gpio_put(pin, 0);
}

void motor_init(void) {
    uint pins[] = {PWMA_PIN, PWMB_PIN};
    for (int i = 0; i < 2; i++) {
        gpio_set_function(pins[i], GPIO_FUNC_PWM);
        uint slice = pwm_gpio_to_slice_num(pins[i]);
        pwm_set_wrap(slice, PWM_WRAP);
        pwm_set_gpio_level(pins[i], 0);
        pwm_set_enabled(slice, true);
    }
    init_gpio_out(AIN1_PIN); init_gpio_out(AIN2_PIN);
    init_gpio_out(BIN1_PIN); init_gpio_out(BIN2_PIN);
    init_gpio_out(STBY_PIN);
    gpio_put(STBY_PIN, 1);
}

void motor_set(int ch, int speed) {
    if (speed > 100) speed = 100;
    if (speed < -100) speed = -100;
    uint in1, in2, pwm_pin;
    if (ch == 0) { in1 = AIN1_PIN; in2 = AIN2_PIN; pwm_pin = PWMA_PIN; }
    else         { in1 = BIN1_PIN; in2 = BIN2_PIN; pwm_pin = PWMB_PIN; }
    if (speed > 0)       { gpio_put(in1, 1); gpio_put(in2, 0); }
    else if (speed < 0)  { gpio_put(in1, 0); gpio_put(in2, 1); speed = -speed; }
    else                 { gpio_put(in1, 0); gpio_put(in2, 0); }
    pwm_set_gpio_level(pwm_pin, (uint16_t)((speed * PWM_WRAP) / 100));
}

void drive(int left, int right) { motor_set(0, left); motor_set(1, right); }
void stop(void) { drive(0, 0); }

// --- Line sensor functions (from Project 9) ---
void line_sensor_init(void) {
    adc_init();
    adc_gpio_init(LEFT_SENSOR_PIN);
    adc_gpio_init(CENTER_SENSOR_PIN);
    adc_gpio_init(RIGHT_SENSOR_PIN);
}

void read_sensors_raw(uint16_t *raw) {
    for (int i = 0; i < NUM_SENSORS; i++) {
        adc_select_input(adc_ch[i]);
        raw[i] = adc_read();
    }
}

void calibrate_update(void) {
    uint16_t raw[NUM_SENSORS];
    read_sensors_raw(raw);
    for (int i = 0; i < NUM_SENSORS; i++) {
        if (raw[i] < cal_min[i]) cal_min[i] = raw[i];
        if (raw[i] > cal_max[i]) cal_max[i] = raw[i];
    }
}

int map_sensor(int idx, uint16_t raw) {
    if (cal_max[idx] == cal_min[idx]) return 0;
    int val = (int)(((int32_t)(raw - cal_min[idx]) * 1000) /
                    (cal_max[idx] - cal_min[idx]));
    if (val < 0)    val = 0;
    if (val > 1000) val = 1000;
    return val;
}

// Returns position 0–2000 (1000 = centred), or -1 if line lost
int read_line_position(void) {
    uint16_t raw[NUM_SENSORS];
    read_sensors_raw(raw);

    int val[NUM_SENSORS];
    int sum = 0;
    for (int i = 0; i < NUM_SENSORS; i++) {
        val[i] = map_sensor(i, raw[i]);
        sum += val[i];
    }

    if (sum < 100) return -1;  // All sensors see white — line lost

    // Weighted average: sensor 0 = position 0, sensor 1 = 1000, sensor 2 = 2000
    int position = (val[0] * 0 + val[1] * 1000 + val[2] * 2000) / sum;
    return position;
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    motor_init();
    line_sensor_init();

    // --- Calibration ---
    printf("=== LINE FOLLOWER ===\n");
    printf("Calibrating... sweep robot over line for 5 seconds.\n");
    uint32_t cal_start = to_ms_since_boot(get_absolute_time());
    while (to_ms_since_boot(get_absolute_time()) - cal_start < 5000) {
        calibrate_update();
        sleep_ms(10);
    }
    printf("Calibration done. Place robot on line and press Enter.\n");

    // Wait for user to be ready (or just a delay)
    sleep_ms(3000);
    printf("GO!\n\n");

    float last_error = 0.0f;

    while (true) {
        int position = read_line_position();

        if (position == -1) {
            // Line lost — spin in the direction of last known error
            if (last_error > 0) {
                drive(-30, 30);  // Spin left to find line
            } else {
                drive(30, -30);  // Spin right to find line
            }
            printf("LINE LOST — searching...\n");
            sleep_ms(20);
            continue;
        }

        // Error: how far from centre (1000)
        float error = 1000.0f - (float)position;

        // Derivative: rate of change of error
        float derivative = error - last_error;
        last_error = error;

        // PD correction
        float correction = (KP * error) + (KD * derivative);

        // Apply to motor speeds
        int left_speed  = BASE_SPEED + (int)correction;
        int right_speed = BASE_SPEED - (int)correction;

        // Clamp speeds
        if (left_speed  >  MAX_SPEED) left_speed  =  MAX_SPEED;
        if (left_speed  < -MAX_SPEED) left_speed  = -MAX_SPEED;
        if (right_speed >  MAX_SPEED) right_speed =  MAX_SPEED;
        if (right_speed < -MAX_SPEED) right_speed = -MAX_SPEED;

        drive(left_speed, right_speed);

        printf("pos=%4d  err=%+6.0f  corr=%+6.1f  L=%+3d  R=%+3d\n",
               position, error, correction, left_speed, right_speed);

        sleep_ms(20);  // 50 Hz control loop
    }

    return 0;
}
```

## Try it
1. **Straight line first** — Start with a simple straight track. The robot should drive smoothly with minimal wobble.
2. **Add gentle curves** — Make wide, sweeping curves with the tape. The robot should follow without losing the line.
3. **Tight turns** — Add sharper 90° corners. You may need to lower `BASE_SPEED` and increase `KP` for tight turns.
4. **Speed run** — Once the robot handles curves, gradually increase `BASE_SPEED`. Find the fastest speed where it can still follow the line!

## Challenge

Create a track with an intersection (a + shape). Right now the robot might get confused at intersections. Add logic to detect when all three sensors see the line (wide/intersection) and choose a strategy: always go straight, always turn left, or follow a pre-programmed turn sequence to navigate a maze.

## Summary

You combined the line sensor array with a PD controller to make the robot follow a black line autonomously. The proportional term steers toward the line, and the derivative term prevents overshooting. By tuning KP and KD, you can make the robot follow smoothly at surprising speed.

## How this fits the robot

Line following is the second major autonomous behaviour, alongside obstacle avoidance (Project 8). Your robot car now has two operating modes: it can navigate open spaces by dodging obstacles *or* follow a marked track precisely. With both capabilities built from modular projects, you could even combine them — follow a line until an obstacle appears, dodge it, then find the line again!
