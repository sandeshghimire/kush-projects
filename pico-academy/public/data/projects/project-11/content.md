# Install the IMU

## What you'll learn
- What an IMU (Inertial Measurement Unit) is and how it measures motion
- How to wire the MPU6050 sensor on the shared I2C bus
- How to read accelerometer and gyroscope data from the MPU6050
- How to calibrate the sensor so readings are accurate
- How acceleration and rotation relate to robot movement

## Parts you'll need
- MPU6050 6-axis IMU module (~$3)

## Background

Have you ever wondered how your phone knows which way is up? If you tilt it sideways, the screen rotates. That's because your phone has a tiny sensor inside called an **IMU** — an Inertial Measurement Unit. Our MPU6050 is the same kind of sensor, and we're putting one on our robot!

The MPU6050 actually has two sensors packed into one tiny chip. The **accelerometer** measures forces pushing on it — like gravity pulling it downward. If the robot tilts forward, the accelerometer notices. The **gyroscope** measures how fast the robot is spinning. If the robot turns left, the gyroscope tells us exactly how quickly.

Think of it like this: the accelerometer is like a marble sitting in a bowl. When you tilt the bowl, the marble rolls — that tells you which way is "down." The gyroscope is like a spinning top. When you try to turn the top, it resists — and by measuring that resistance, we know how fast we're rotating.

We'll connect the MPU6050 to the same I2C bus we used for the OLED display in Lesson 8. Two devices can share the same wires because each one has its own address — the OLED is at address `0x3C` and the MPU6050 is at address `0x68`. It's like two houses on the same street with different house numbers.

## Wiring

| MPU6050 Pin | Pico 2 Pin | Notes |
|-------------|------------|-------|
| VCC         | 3V3 (pin 36) | 3.3V power |
| GND         | GND (pin 38) | Ground |
| SDA         | GP4 (pin 6)  | Shared I2C0 data line |
| SCL         | GP5 (pin 7)  | Shared I2C0 clock line |

> **Note:** The MPU6050 shares the I2C bus with the SSD1306 OLED. The MPU6050 uses address `0x68` and the OLED uses `0x3C`, so they won't conflict.

## The code

```c
#include <stdio.h>
#include <math.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"

// MPU6050 I2C address and registers
#define MPU6050_ADDR    0x68
#define MPU6050_PWR_MGMT_1   0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B
#define MPU6050_GYRO_XOUT_H  0x43
#define MPU6050_WHO_AM_I     0x75

// I2C configuration
#define I2C_PORT i2c0
#define SDA_PIN  4
#define SCL_PIN  5

// Calibration offsets (filled in by calibrate())
static int16_t gyro_offset_x = 0;
static int16_t gyro_offset_y = 0;
static int16_t gyro_offset_z = 0;

// Write a single byte to a register
static void mpu6050_write_reg(uint8_t reg, uint8_t value) {
    uint8_t buf[2] = {reg, value};
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, buf, 2, false);
}

// Read multiple bytes starting from a register
static void mpu6050_read_regs(uint8_t reg, uint8_t *buf, size_t len) {
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, &reg, 1, true);
    i2c_read_blocking(I2C_PORT, MPU6050_ADDR, buf, len, false);
}

// Initialize the MPU6050
bool mpu6050_init(void) {
    // Check WHO_AM_I register — should return 0x68
    uint8_t who_am_i;
    mpu6050_read_regs(MPU6050_WHO_AM_I, &who_am_i, 1);
    if (who_am_i != 0x68) {
        printf("MPU6050 not found! WHO_AM_I = 0x%02X\n", who_am_i);
        return false;
    }
    printf("MPU6050 found! WHO_AM_I = 0x%02X\n", who_am_i);

    // Wake up the sensor (it starts in sleep mode)
    mpu6050_write_reg(MPU6050_PWR_MGMT_1, 0x00);
    sleep_ms(100);

    return true;
}

// Read raw accelerometer values (X, Y, Z)
void read_accel(int16_t *ax, int16_t *ay, int16_t *az) {
    uint8_t buf[6];
    mpu6050_read_regs(MPU6050_ACCEL_XOUT_H, buf, 6);
    *ax = (int16_t)((buf[0] << 8) | buf[1]);
    *ay = (int16_t)((buf[2] << 8) | buf[3]);
    *az = (int16_t)((buf[4] << 8) | buf[5]);
}

// Read raw gyroscope values (X, Y, Z)
void read_gyro(int16_t *gx, int16_t *gy, int16_t *gz) {
    uint8_t buf[6];
    mpu6050_read_regs(MPU6050_GYRO_XOUT_H, buf, 6);
    *gx = (int16_t)((buf[0] << 8) | buf[1]) - gyro_offset_x;
    *gy = (int16_t)((buf[2] << 8) | buf[3]) - gyro_offset_y;
    *gz = (int16_t)((buf[4] << 8) | buf[5]) - gyro_offset_z;
}

// Calibrate the gyroscope by averaging readings while stationary
void calibrate_gyro(void) {
    printf("Calibrating gyro — keep the robot still!\n");
    int32_t sum_x = 0, sum_y = 0, sum_z = 0;
    const int samples = 200;

    for (int i = 0; i < samples; i++) {
        uint8_t buf[6];
        mpu6050_read_regs(MPU6050_GYRO_XOUT_H, buf, 6);
        sum_x += (int16_t)((buf[0] << 8) | buf[1]);
        sum_y += (int16_t)((buf[2] << 8) | buf[3]);
        sum_z += (int16_t)((buf[4] << 8) | buf[5]);
        sleep_ms(5);
    }

    gyro_offset_x = (int16_t)(sum_x / samples);
    gyro_offset_y = (int16_t)(sum_y / samples);
    gyro_offset_z = (int16_t)(sum_z / samples);
    printf("Gyro offsets: X=%d Y=%d Z=%d\n",
           gyro_offset_x, gyro_offset_y, gyro_offset_z);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Set up I2C at 400 kHz
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    if (!mpu6050_init()) {
        printf("Failed to initialize MPU6050!\n");
        return 1;
    }

    calibrate_gyro();

    // Main loop: print sensor data every 100 ms
    while (true) {
        int16_t ax, ay, az;
        int16_t gx, gy, gz;

        read_accel(&ax, &ay, &az);
        read_gyro(&gx, &gy, &gz);

        // Convert to human-readable units
        // Accelerometer: default ±2g range, 16384 LSB/g
        float accel_x = ax / 16384.0f;
        float accel_y = ay / 16384.0f;
        float accel_z = az / 16384.0f;

        // Gyroscope: default ±250°/s range, 131 LSB/(°/s)
        float gyro_x = gx / 131.0f;
        float gyro_y = gy / 131.0f;
        float gyro_z = gz / 131.0f;

        printf("Accel: X=%.2fg Y=%.2fg Z=%.2fg | ",
               accel_x, accel_y, accel_z);
        printf("Gyro: X=%.1f°/s Y=%.1f°/s Z=%.1f°/s\n",
               gyro_x, gyro_y, gyro_z);

        sleep_ms(100);
    }

    return 0;
}
```

## Try it
- Tilt the robot forward, backward, left, and right — watch the accelerometer values change
- Spin the robot on the table and see the gyro Z value spike
- Hold the robot perfectly still and check if the calibrated gyro reads close to zero
- Tap the robot gently and watch the accelerometer jump

## Challenge

Add a **tilt alarm**: if the robot tilts more than 30 degrees in any direction (use `atan2` on the accelerometer values to compute the tilt angle), print "TILT WARNING!" to the console. This could later trigger a buzzer.

## Summary

The MPU6050 gives our robot a sense of balance and rotation. The accelerometer tells us which way is down (like an inner ear), and the gyroscope measures how fast we're spinning. We calibrated the gyro by averaging readings while sitting still, so now our rotation measurements start from a clean zero. These two sensors together will let our robot drive in perfectly straight lines and turn exact angles.

## How this fits the robot

The IMU is the robot's inner ear — its sense of balance and direction. In the next project, we'll use the gyroscope to make the robot drive dead-straight and turn exact degrees. Every advanced robot behavior (driving squares, navigating courses) depends on knowing its heading, and that's exactly what this sensor provides.
