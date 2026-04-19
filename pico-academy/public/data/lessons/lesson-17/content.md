# The IMU — Accelerometer & Gyro

## What you'll learn
- What an IMU (Inertial Measurement Unit) is and what it measures
- How accelerometers detect gravity and movement
- How gyroscopes measure rotation speed
- How to read the MPU-6050 over I2C
- How to calculate tilt angles from sensor data

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× MPU-6050 breakout board (~$3)
- 4× jumper wires (~$0.40)

## Background

Close your eyes and tilt your head to the side. You can still tell which way is up, right? That's because your inner ear has tiny sensors that detect gravity and rotation. An **IMU** (Inertial Measurement Unit) is the electronic version of your inner ear!

The **MPU-6050** combines two sensors in one chip: an **accelerometer** that measures acceleration forces (including gravity) in three directions (X, Y, Z), and a **gyroscope** that measures rotation speed in three directions (pitch, roll, yaw). Together, that's 6 axes of motion data — called "6-DOF" (six degrees of freedom).

The **accelerometer** works using a tiny mass on a spring inside the chip. When the chip tilts, gravity pulls the mass, and microscopic capacitors measure how far it moved. When sitting still on a flat table, the accelerometer reads 0g on X and Y, and +1g on Z (because gravity pulls downward). Tilt it and gravity's pull shifts between axes — you can calculate the tilt angle!

The **gyroscope** uses the Coriolis effect — vibrating structures inside the chip deflect when rotated. It measures **angular velocity** in degrees per second. Spin the chip at 90°/s and the gyro reads 90. Stop spinning and it reads 0. The gyro is great for measuring rotation but drifts over time — it slowly accumulates errors.

The MPU-6050 communicates over I2C at address **0x68** (or 0x69 if AD0 is pulled high). Its registers hold 16-bit signed values for each axis. We read 14 bytes at once to get all 6 axes plus the built-in temperature sensor.

## Wiring

| Pico Pin | MPU-6050 Pin |
|----------|-------------|
| GP4 (I2C0 SDA) | SDA |
| GP5 (I2C0 SCL) | SCL |
| 3V3 | VCC |
| GND | GND |

Leave AD0 unconnected (or tie to GND) for address 0x68.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include <stdio.h>
#include <math.h>

#define I2C_PORT    i2c0
#define I2C_SDA     4
#define I2C_SCL     5
#define MPU_ADDR    0x68

// MPU-6050 register addresses
#define REG_PWR_MGMT_1   0x6B
#define REG_ACCEL_CONFIG  0x1C
#define REG_GYRO_CONFIG   0x1B
#define REG_ACCEL_XOUT_H  0x3B

// Write a single byte to a register
void mpu_write_reg(uint8_t reg, uint8_t value) {
    uint8_t buf[2] = {reg, value};
    i2c_write_blocking(I2C_PORT, MPU_ADDR, buf, 2, false);
}

// Read len bytes starting from a register
void mpu_read_regs(uint8_t reg, uint8_t *buf, uint8_t len) {
    i2c_write_blocking(I2C_PORT, MPU_ADDR, &reg, 1, true);
    i2c_read_blocking(I2C_PORT, MPU_ADDR, buf, len, false);
}

// Initialize the MPU-6050
void mpu_init(void) {
    // Wake up the MPU (it starts in sleep mode)
    mpu_write_reg(REG_PWR_MGMT_1, 0x00);
    sleep_ms(100);

    // Set accelerometer range to ±2g
    mpu_write_reg(REG_ACCEL_CONFIG, 0x00);

    // Set gyroscope range to ±250 deg/s
    mpu_write_reg(REG_GYRO_CONFIG, 0x00);
}

typedef struct {
    float ax, ay, az;   // Acceleration in g
    float gx, gy, gz;   // Rotation in deg/s
    float temp_c;        // Temperature in Celsius
} IMUData;

// Read all sensor data
IMUData mpu_read(void) {
    uint8_t raw[14];
    mpu_read_regs(REG_ACCEL_XOUT_H, raw, 14);

    // Combine high and low bytes (big-endian, signed)
    int16_t raw_ax = (int16_t)((raw[0] << 8) | raw[1]);
    int16_t raw_ay = (int16_t)((raw[2] << 8) | raw[3]);
    int16_t raw_az = (int16_t)((raw[4] << 8) | raw[5]);
    int16_t raw_temp = (int16_t)((raw[6] << 8) | raw[7]);
    int16_t raw_gx = (int16_t)((raw[8] << 8) | raw[9]);
    int16_t raw_gy = (int16_t)((raw[10] << 8) | raw[11]);
    int16_t raw_gz = (int16_t)((raw[12] << 8) | raw[13]);

    IMUData data;
    // Convert to physical units
    // ±2g range → 16384 LSB/g
    data.ax = raw_ax / 16384.0f;
    data.ay = raw_ay / 16384.0f;
    data.az = raw_az / 16384.0f;

    // ±250 deg/s range → 131 LSB/(deg/s)
    data.gx = raw_gx / 131.0f;
    data.gy = raw_gy / 131.0f;
    data.gz = raw_gz / 131.0f;

    // Temperature formula from datasheet
    data.temp_c = raw_temp / 340.0f + 36.53f;

    return data;
}

int main() {
    stdio_init_all();

    // Initialize I2C
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(I2C_SDA, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA);
    gpio_pull_up(I2C_SCL);

    mpu_init();
    printf("MPU-6050 initialized!\n");

    while (true) {
        IMUData d = mpu_read();

        // Calculate tilt angles from accelerometer
        float pitch = atan2f(d.ax, sqrtf(d.ay * d.ay + d.az * d.az)) * 180.0f / M_PI;
        float roll = atan2f(d.ay, sqrtf(d.ax * d.ax + d.az * d.az)) * 180.0f / M_PI;

        printf("Accel: X=%.2fg Y=%.2fg Z=%.2fg | ", d.ax, d.ay, d.az);
        printf("Gyro: X=%.1f Y=%.1f Z=%.1f °/s | ", d.gx, d.gy, d.gz);
        printf("Tilt: P=%.1f° R=%.1f° | Temp: %.1f°C\n", pitch, roll, d.temp_c);

        sleep_ms(100);
    }

    return 0;
}
```

### How the code works

1. The MPU-6050 starts in sleep mode — writing 0x00 to PWR_MGMT_1 wakes it up.
2. We read 14 bytes at once starting from register 0x3B: 6 bytes of accelerometer, 2 bytes of temperature, and 6 bytes of gyroscope.
3. Raw values are 16-bit signed integers in big-endian format. We convert to g's and degrees/second using the scale factors from the datasheet.
4. **Tilt angles** are calculated using `atan2` — the arctangent of the accelerometer axes gives pitch and roll when stationary.

## Try it

1. **Level meter** — Show "LEVEL" on the serial monitor when the board is flat (pitch and roll both near 0°).
2. **Shake detector** — Detect shaking by checking if the total acceleration magnitude exceeds 1.5g.
3. **Gyro integration** — Accumulate gyro readings over time to estimate heading angle (note how it drifts!).

## Challenge

Implement a simple **complementary filter** that fuses accelerometer and gyroscope data: `angle = 0.98 * (angle + gyro * dt) + 0.02 * accel_angle`. This gives you the stability of the accelerometer with the responsiveness of the gyroscope.

## Summary

The MPU-6050 IMU provides 3-axis accelerometer and 3-axis gyroscope data over I2C. The accelerometer measures gravity and linear acceleration (in g's), while the gyroscope measures rotational speed (in degrees/second). You can calculate tilt angles from accelerometer data using arctangent. Combining both sensors with a complementary filter gives the best results. The IMU is essential for making your robot drive straight and turn accurately!
