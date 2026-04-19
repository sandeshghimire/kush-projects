# Driving DC Motors with an H-Bridge

## What you'll learn
- How DC motors work and why the Pico can't drive them directly
- What an H-Bridge is and how it controls motor direction
- How to wire a TB6612FNG motor driver to the Pico
- How to control speed with PWM and direction with GPIO pins
- How to use standby mode and active braking

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× TB6612FNG motor driver board (~$3)
- 2× DC motors (3-6V) (~$3)
- Battery pack (4× AA or 2S LiPo) (~$5)
- 8× jumper wires (~$0.80)

## Background

You might think you can just connect a motor to a GPIO pin and go. But there's a problem: a DC motor needs way more current than a GPIO pin can provide. The Pico's pins can supply about 12 milliamps, but a small DC motor needs 200-500 milliamps — that's 20 to 40 times more! Trying to power a motor directly from GPIO would damage the Pico.

The solution is an **H-Bridge** — a special circuit that uses the Pico's tiny control signals to switch big currents from a separate power supply. It's named "H-Bridge" because the circuit diagram looks like the letter H, with the motor in the crossbar. By switching pairs of transistors, the H-Bridge can make current flow through the motor in either direction, controlling whether it spins forward or backward.

The **TB6612FNG** is a popular H-Bridge driver chip that can control two motors at once. Each motor gets three control pins: **PWM** for speed (using pulse width modulation), **IN1** for direction signal A, and **IN2** for direction signal B. There's also a **STBY** (standby) pin — pull it HIGH to enable the driver, LOW to put both motors to sleep.

The direction truth table is simple: IN1=HIGH + IN2=LOW = forward. IN1=LOW + IN2=HIGH = reverse. IN1=IN2=LOW = coast (motor free-spins). IN1=IN2=HIGH = brake (motor stops quickly by short-circuiting it).

## Wiring

| Pico Pin | TB6612FNG Pin | Function |
|----------|---------------|----------|
| GP16 | PWMA | Motor A speed (PWM) |
| GP17 | AIN1 | Motor A direction 1 |
| GP18 | AIN2 | Motor A direction 2 |
| GP19 | PWMB | Motor B speed (PWM) |
| GP20 | BIN1 | Motor B direction 1 |
| GP21 | BIN2 | Motor B direction 2 |
| GP22 | STBY | Standby (HIGH = active) |
| 3V3  | VCC  | Logic power |
| GND  | GND  | Common ground |

**Motor power**: Connect battery pack positive to VM, negative to GND. Connect motor A to AOUT1/AOUT2, motor B to BOUT1/BOUT2.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include <stdio.h>

// Motor A pins
#define PWMA_PIN  16
#define AIN1_PIN  17
#define AIN2_PIN  18

// Motor B pins
#define PWMB_PIN  19
#define BIN1_PIN  20
#define BIN2_PIN  21

// Standby pin
#define STBY_PIN  22

#define PWM_WRAP  999   // 0-999 gives 1000 speed levels

typedef enum { MOTOR_A, MOTOR_B } Motor;

void motor_driver_init(void) {
    // Standby pin
    gpio_init(STBY_PIN);
    gpio_set_dir(STBY_PIN, GPIO_OUT);
    gpio_put(STBY_PIN, 1);  // Enable the driver

    // Motor A direction pins
    gpio_init(AIN1_PIN);
    gpio_set_dir(AIN1_PIN, GPIO_OUT);
    gpio_init(AIN2_PIN);
    gpio_set_dir(AIN2_PIN, GPIO_OUT);

    // Motor B direction pins
    gpio_init(BIN1_PIN);
    gpio_set_dir(BIN1_PIN, GPIO_OUT);
    gpio_init(BIN2_PIN);
    gpio_set_dir(BIN2_PIN, GPIO_OUT);

    // Motor A PWM
    gpio_set_function(PWMA_PIN, GPIO_FUNC_PWM);
    uint slice_a = pwm_gpio_to_slice_num(PWMA_PIN);
    pwm_set_wrap(slice_a, PWM_WRAP);
    pwm_set_chan_level(slice_a, pwm_gpio_to_channel(PWMA_PIN), 0);
    pwm_set_enabled(slice_a, true);

    // Motor B PWM
    gpio_set_function(PWMB_PIN, GPIO_FUNC_PWM);
    uint slice_b = pwm_gpio_to_slice_num(PWMB_PIN);
    pwm_set_wrap(slice_b, PWM_WRAP);
    pwm_set_chan_level(slice_b, pwm_gpio_to_channel(PWMB_PIN), 0);
    pwm_set_enabled(slice_b, true);
}

void motor_set(Motor motor, int speed) {
    // Clamp speed to -100..+100
    if (speed > 100) speed = 100;
    if (speed < -100) speed = -100;

    uint in1_pin = (motor == MOTOR_A) ? AIN1_PIN : BIN1_PIN;
    uint in2_pin = (motor == MOTOR_A) ? AIN2_PIN : BIN2_PIN;
    uint pwm_pin = (motor == MOTOR_A) ? PWMA_PIN : PWMB_PIN;

    // Set direction
    if (speed > 0) {
        gpio_put(in1_pin, 1);
        gpio_put(in2_pin, 0);
    } else if (speed < 0) {
        gpio_put(in1_pin, 0);
        gpio_put(in2_pin, 1);
        speed = -speed;
    } else {
        gpio_put(in1_pin, 0);
        gpio_put(in2_pin, 0);
    }

    // Set speed via PWM duty cycle
    uint16_t duty = (uint16_t)(speed * PWM_WRAP / 100);
    uint slice = pwm_gpio_to_slice_num(pwm_pin);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(pwm_pin), duty);
}

void motor_brake(Motor motor) {
    uint in1_pin = (motor == MOTOR_A) ? AIN1_PIN : BIN1_PIN;
    uint in2_pin = (motor == MOTOR_A) ? AIN2_PIN : BIN2_PIN;
    gpio_put(in1_pin, 1);
    gpio_put(in2_pin, 1);
}

int main() {
    stdio_init_all();
    motor_driver_init();

    printf("Motor test starting...\n");

    while (true) {
        // Both motors forward at 50%
        printf("Forward 50%%\n");
        motor_set(MOTOR_A, 50);
        motor_set(MOTOR_B, 50);
        sleep_ms(3000);

        // Stop
        printf("Stop\n");
        motor_set(MOTOR_A, 0);
        motor_set(MOTOR_B, 0);
        sleep_ms(1000);

        // Both motors reverse at 75%
        printf("Reverse 75%%\n");
        motor_set(MOTOR_A, -75);
        motor_set(MOTOR_B, -75);
        sleep_ms(2000);

        // Brake
        printf("Brake!\n");
        motor_brake(MOTOR_A);
        motor_brake(MOTOR_B);
        sleep_ms(1000);

        // Spin in place (motors opposite directions)
        printf("Spin!\n");
        motor_set(MOTOR_A, 60);
        motor_set(MOTOR_B, -60);
        sleep_ms(2000);

        motor_set(MOTOR_A, 0);
        motor_set(MOTOR_B, 0);
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. Each motor is controlled by 3 pins: PWM for speed, IN1/IN2 for direction.
2. Speed is set as -100 to +100. The sign determines direction, the magnitude maps to PWM duty cycle.
3. **Coast** (IN1=IN2=LOW): motor spins freely and slows gradually due to friction.
4. **Brake** (IN1=IN2=HIGH): motor terminals are short-circuited, stopping it quickly.
5. The STBY pin must be HIGH for the driver to work — pull it LOW to save power when motors aren't needed.

## Try it

1. **Speed ramp** — Gradually increase motor speed from 0% to 100% over 5 seconds for smooth acceleration.
2. **Figure eight** — Alternate between left and right turns to make the robot trace a figure-8 pattern.
3. **Button control** — Use two buttons to control forward/backward and a potentiometer for speed.

## Challenge

Implement a smooth acceleration function that ramps motor speed from current to target over a specified time, preventing wheel slip and reducing wear on the gears.

## Summary

DC motors need an H-Bridge driver because they draw far more current than GPIO pins can provide. The TB6612FNG controls speed via PWM and direction via two logic pins per motor. You learned the four motor states (forward, reverse, coast, brake), how to map a -100 to +100 speed value to hardware signals, and how the standby pin enables/disables the driver. This is the foundation for making your robot move!
