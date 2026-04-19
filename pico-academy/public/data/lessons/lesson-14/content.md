# Servo Motors — Precise Angles

## What you'll learn
- How servo motors work and what's inside them
- How PWM pulse width controls the exact angle
- How to generate the 50Hz servo control signal on the Pico
- How to sweep a servo smoothly between positions
- The difference between standard and continuous rotation servos

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× SG90 micro servo motor (~$2)
- 3× jumper wires (~$0.30)

## Background

A DC motor spins around and around — it doesn't know what angle it's at. A **servo motor** is different: tell it "go to 90 degrees" and it goes there and holds that position. This makes servos perfect for steering, robot arms, and anything that needs to point in a specific direction.

Inside a servo there are three things: a small DC motor, a set of gears (to trade speed for torque), and a **potentiometer** (a knob sensor) connected to the output shaft. The servo's built-in controller reads the potentiometer to know its current angle, compares it to the commanded angle, and spins the motor until they match. This is a **closed-loop control system** — it automatically corrects itself!

You command a servo using **PWM at 50 Hz** (one pulse every 20 milliseconds). The **width** of the HIGH pulse determines the angle: **1.0 ms** pulse = 0°, **1.5 ms** = 90° (center), **2.0 ms** = 180°. The servo reads the pulse width and moves to match. It's that simple!

The Pico's PWM hardware can easily generate 50 Hz signals. We set the PWM wrap value so the total period is 20 ms, then adjust the channel level to control the pulse width between 1 ms and 2 ms.

## Wiring

| Pico Pin | Servo Wire |
|----------|------------|
| GP15 | Signal (orange/yellow wire) |
| VBUS (5V) | Power (red wire) |
| GND | Ground (brown/black wire) |

**Important**: Power the servo from VBUS (5V USB), not 3V3. Servos need 5V and can draw 500+ mA when moving, which is too much for the 3V3 regulator.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include <stdio.h>

#define SERVO_PIN  15

// PWM config for 50 Hz servo signal
// System clock = 125 MHz
// Divider = 64 → 125MHz / 64 = 1,953,125 Hz
// Wrap = 39062 → 1,953,125 / 39063 ≈ 50 Hz (20ms period)
#define PWM_DIV    64.0f
#define PWM_WRAP   39062

// Pulse widths for servo positions (in PWM counter units)
// 1.0 ms = 0°   → 39063 * (1.0/20.0)  = 1953
// 1.5 ms = 90°  → 39063 * (1.5/20.0)  = 2929
// 2.0 ms = 180° → 39063 * (2.0/20.0)  = 3906
#define SERVO_MIN  1953   // 0 degrees
#define SERVO_MID  2929   // 90 degrees (center)
#define SERVO_MAX  3906   // 180 degrees

uint servo_slice;
uint servo_chan;

void servo_init(void) {
    gpio_set_function(SERVO_PIN, GPIO_FUNC_PWM);
    servo_slice = pwm_gpio_to_slice_num(SERVO_PIN);
    servo_chan = pwm_gpio_to_channel(SERVO_PIN);

    pwm_set_clkdiv(servo_slice, PWM_DIV);
    pwm_set_wrap(servo_slice, PWM_WRAP);
    pwm_set_chan_level(servo_slice, servo_chan, SERVO_MID);  // Start at center
    pwm_set_enabled(servo_slice, true);
}

// Set servo to a specific angle (0-180 degrees)
void servo_set_angle(uint angle) {
    if (angle > 180) angle = 180;
    uint level = SERVO_MIN + (SERVO_MAX - SERVO_MIN) * angle / 180;
    pwm_set_chan_level(servo_slice, servo_chan, level);
}

// Set servo using raw microseconds (1000-2000)
void servo_set_us(uint pulse_us) {
    if (pulse_us < 1000) pulse_us = 1000;
    if (pulse_us > 2000) pulse_us = 2000;
    uint level = (uint)(PWM_WRAP * pulse_us / 20000);
    pwm_set_chan_level(servo_slice, servo_chan, level);
}

int main() {
    stdio_init_all();
    servo_init();

    printf("Servo demo starting...\n");

    while (true) {
        // Sweep from 0° to 180°
        printf("Sweeping forward...\n");
        for (int angle = 0; angle <= 180; angle += 2) {
            servo_set_angle(angle);
            sleep_ms(20);  // Move slowly
        }

        sleep_ms(500);

        // Sweep back from 180° to 0°
        printf("Sweeping backward...\n");
        for (int angle = 180; angle >= 0; angle -= 2) {
            servo_set_angle(angle);
            sleep_ms(20);
        }

        sleep_ms(500);

        // Jump to specific positions
        printf("Position test...\n");
        servo_set_angle(0);
        sleep_ms(1000);
        servo_set_angle(90);
        sleep_ms(1000);
        servo_set_angle(180);
        sleep_ms(1000);
        servo_set_angle(90);
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. We calculate PWM settings for a 50 Hz (20 ms period) signal. Clock divider 64 and wrap 39062 give us exactly that.
2. `servo_set_angle()` maps 0–180 degrees to pulse widths of 1.0–2.0 ms (in counter units: 1953–3906).
3. Small `sleep_ms(20)` delays between angle changes create a smooth sweep instead of a sudden jump.
4. The servo holds its position automatically — the internal feedback loop keeps it at the commanded angle.

## Try it

1. **Knob control** — Connect a potentiometer to ADC0 and map its 0–4095 reading to 0–180° servo angle.
2. **Button positions** — Use buttons to cycle through preset positions: 0°, 45°, 90°, 135°, 180°.
3. **Smooth easing** — Instead of linear movement, use an easing function (like slow-start, slow-stop) for more natural motion.

## Challenge

Build a "look-around" radar: mount the ultrasonic sensor from Lesson 16 on a servo, sweep it from 0° to 180°, take a distance reading at each angle, and print a simple top-down map over serial showing where obstacles are.

## Summary

Servo motors move to precise angles using PWM pulse width encoding at 50 Hz. A 1 ms pulse commands 0°, 1.5 ms gives 90° (center), and 2 ms gives 180°. The Pico's hardware PWM generates these signals effortlessly. Servos have built-in closed-loop control — just send the angle and they handle the rest. You'll use servos for robot steering and sensor scanning!
