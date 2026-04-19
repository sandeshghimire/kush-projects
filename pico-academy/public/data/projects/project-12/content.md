# Drive Straight & Turn Exact Degrees

## What you'll learn
- How to use gyroscope data to maintain a straight heading
- How to integrate angular velocity over time to track heading
- How to implement a feedback loop that corrects motor drift
- How to make the robot turn a precise number of degrees
- What a PID-style correction is and why it helps

## Parts you'll need
- No additional parts needed (uses motors from Project 4 and IMU from Project 11)

## Background

Have you ever tried to walk in a perfectly straight line with your eyes closed? You probably drifted left or right without realizing it. Our robot has the same problem! Even though we send the same speed to both motors, one might spin a tiny bit faster than the other. Over a few seconds, the robot curves off course.

But now we have the IMU — our robot's sense of direction! The gyroscope tells us how fast the robot is turning. If we're supposed to go straight and the gyro says we're drifting right, we can speed up the left motor (or slow down the right) to correct it. This is called a **feedback loop** — the sensor feeds information back to the motors so they can fix their own mistakes.

Turning exact degrees works the same way. Instead of just timing a turn and hoping for the best, we watch the gyroscope. We add up all the tiny rotation measurements (this is called **integration**) to know our total heading. Want to turn 90 degrees? We start turning and keep watching until the gyro says we've rotated exactly 90 degrees, then stop.

This is like having a compass in your pocket while walking. Instead of guessing "I think I turned enough," you can look at the compass and know exactly which direction you're facing. The gyroscope is our electronic compass.

## Wiring

Uses existing wiring from previous projects:
- **Motors:** Left motor on GP2/GP3 (PWM), Right motor on GP6/GP7 (PWM) — from Project 4
- **IMU:** MPU6050 on GP4 (SDA) / GP5 (SCL) — from Project 11

## The code

```c
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "hardware/pwm.h"

// --- Pin Definitions ---
#define SDA_PIN     4
#define SCL_PIN     5
#define LEFT_FWD    2
#define LEFT_REV    3
#define RIGHT_FWD   6
#define RIGHT_REV   7

// --- MPU6050 ---
#define MPU6050_ADDR         0x68
#define MPU6050_PWR_MGMT_1   0x6B
#define MPU6050_GYRO_XOUT_H  0x43

#define I2C_PORT i2c0

static int16_t gyro_offset_z = 0;
static float heading = 0.0f;  // accumulated heading in degrees

// --- I2C helpers ---
static void mpu_write(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, buf, 2, false);
}

static void mpu_read(uint8_t reg, uint8_t *buf, size_t len) {
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, &reg, 1, true);
    i2c_read_blocking(I2C_PORT, MPU6050_ADDR, buf, len, false);
}

// --- IMU functions ---
void mpu6050_init(void) {
    mpu_write(MPU6050_PWR_MGMT_1, 0x00);
    sleep_ms(100);
}

float read_gyro_z(void) {
    uint8_t buf[6];
    mpu_read(MPU6050_GYRO_XOUT_H, buf, 6);
    int16_t gz = (int16_t)((buf[4] << 8) | buf[5]) - gyro_offset_z;
    return gz / 131.0f;  // degrees per second
}

void calibrate_gyro(void) {
    printf("Calibrating — hold still...\n");
    int32_t sum = 0;
    for (int i = 0; i < 200; i++) {
        uint8_t buf[6];
        mpu_read(MPU6050_GYRO_XOUT_H, buf, 6);
        sum += (int16_t)((buf[4] << 8) | buf[5]);
        sleep_ms(5);
    }
    gyro_offset_z = (int16_t)(sum / 200);
    printf("Gyro Z offset: %d\n", gyro_offset_z);
}

// --- Motor functions ---
void setup_motor_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 999);
    pwm_set_enabled(slice, true);
}

void set_motor(uint fwd_pin, uint rev_pin, float speed) {
    // speed: -1.0 (full reverse) to +1.0 (full forward)
    uint16_t duty = (uint16_t)(fabsf(speed) * 999);
    if (speed >= 0) {
        pwm_set_gpio_level(fwd_pin, duty);
        pwm_set_gpio_level(rev_pin, 0);
    } else {
        pwm_set_gpio_level(fwd_pin, 0);
        pwm_set_gpio_level(rev_pin, duty);
    }
}

void motors_stop(void) {
    set_motor(LEFT_FWD, LEFT_REV, 0);
    set_motor(RIGHT_FWD, RIGHT_REV, 0);
}

// --- Heading-assisted driving ---
void update_heading(float dt) {
    float gz = read_gyro_z();
    heading += gz * dt;
}

// Drive straight for a given duration (ms) at a given base speed
void drive_straight(float base_speed, uint32_t duration_ms) {
    float target_heading = heading;  // lock in current heading
    float kp = 0.02f;               // proportional correction gain
    uint32_t start = to_ms_since_boot(get_absolute_time());
    uint32_t last = start;

    printf("Driving straight at %.0f%% for %lu ms\n",
           base_speed * 100, duration_ms);

    while ((to_ms_since_boot(get_absolute_time()) - start) < duration_ms) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        float dt = (now - last) / 1000.0f;
        last = now;

        update_heading(dt);

        // How far off are we from target heading?
        float error = heading - target_heading;

        // Correction: if we drifted right (positive error),
        // slow down right motor / speed up left motor
        float correction = kp * error;
        float left_speed  = base_speed + correction;
        float right_speed = base_speed - correction;

        // Clamp speeds to valid range
        if (left_speed > 1.0f) left_speed = 1.0f;
        if (left_speed < 0.0f) left_speed = 0.0f;
        if (right_speed > 1.0f) right_speed = 1.0f;
        if (right_speed < 0.0f) right_speed = 0.0f;

        set_motor(LEFT_FWD, LEFT_REV, left_speed);
        set_motor(RIGHT_FWD, RIGHT_REV, right_speed);

        sleep_ms(10);
    }

    motors_stop();
    printf("Done. Final heading: %.1f° (target was %.1f°)\n",
           heading, target_heading);
}

// Turn a precise number of degrees (positive = clockwise)
void turn_degrees(float angle) {
    float target = heading + angle;
    float kp = 0.01f;
    float base_turn_speed = 0.4f;

    printf("Turning %.1f degrees (target heading: %.1f)\n", angle, target);

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        static uint32_t last = 0;
        if (last == 0) last = now;
        float dt = (now - last) / 1000.0f;
        last = now;

        update_heading(dt);

        float error = target - heading;

        // Close enough? Stop.
        if (fabsf(error) < 2.0f) {
            break;
        }

        // Proportional turn speed — slows down as we approach target
        float speed = base_turn_speed;
        if (fabsf(error) < 30.0f) {
            speed = base_turn_speed * (fabsf(error) / 30.0f);
            if (speed < 0.15f) speed = 0.15f;  // minimum to overcome friction
        }

        if (error > 0) {
            // Need to turn clockwise: left forward, right backward
            set_motor(LEFT_FWD, LEFT_REV, speed);
            set_motor(RIGHT_FWD, RIGHT_REV, -speed);
        } else {
            // Counter-clockwise
            set_motor(LEFT_FWD, LEFT_REV, -speed);
            set_motor(RIGHT_FWD, RIGHT_REV, speed);
        }

        sleep_ms(10);
    }

    motors_stop();
    printf("Turn complete. Heading: %.1f° (target: %.1f°)\n", heading, target);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // I2C setup
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    // Motor PWM setup
    setup_motor_pin(LEFT_FWD);
    setup_motor_pin(LEFT_REV);
    setup_motor_pin(RIGHT_FWD);
    setup_motor_pin(RIGHT_REV);

    mpu6050_init();
    calibrate_gyro();

    printf("\n=== Demo: Drive a Square ===\n");
    for (int side = 0; side < 4; side++) {
        printf("\n--- Side %d ---\n", side + 1);
        drive_straight(0.5f, 2000);   // drive 2 seconds
        sleep_ms(300);
        turn_degrees(90.0f);           // turn 90° clockwise
        sleep_ms(300);
    }

    printf("\nSquare complete!\n");
    return 0;
}
```

## Try it
- Run the square demo and see how close the robot returns to its starting position
- Try different `kp` values in `drive_straight()` — what happens when it's too high or too low?
- Change the square to a triangle (turn 120° instead of 90°)
- Make the robot drive in a figure-8 by alternating left and right turns

## Challenge

Implement a **drive_distance()** function. Since we don't have wheel encoders, estimate distance using time and speed. Combine it with `turn_degrees()` to make the robot drive to a specific (x, y) coordinate on the floor. Hint: you'll need `atan2` to calculate the angle to the target.

## Summary

By combining motor control with gyroscope feedback, our robot can now drive straight lines and turn exact angles. The key insight is the feedback loop — instead of blindly hoping the motors behave, we constantly measure our heading with the gyro and make tiny corrections. This is the foundation of all autonomous navigation. A robot that can drive straight and turn precisely can drive any path.

## How this fits the robot

This is the navigation core. Every future autonomous behavior — following lines, avoiding obstacles, running missions — depends on the robot being able to drive accurately. The `drive_straight()` and `turn_degrees()` functions become building blocks that the mission system in Project 20 will call constantly.
