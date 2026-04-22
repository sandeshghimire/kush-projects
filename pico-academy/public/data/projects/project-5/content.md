# Wheel Encoders — Counting Rotations

## 🎯 What You'll Learn
- What a wheel encoder is and why it's needed for accurate movement
- How a slotted disc and IR sensor create electrical pulses (ticks!)
- How to use GPIO interrupts on the Pico 2 W
- How to convert encoder ticks to real-world distance in centimetres

## 🛒 Parts You Need
- 2× slotted encoder wheels (20 slots each) — included with some motor kits or $1.50
- 2× IR slot-type optical sensor modules (H206) — $1.50
- 4× M2 screws for mounting the sensors — from your kit

**Total: ≈ $3**

## 🌟 Background / The Story

Imagine telling your robot "drive forward for 1.5 seconds." But how far did it actually go? You don't know! Different battery levels, different floors, even temperature can change how fast the wheels spin. You need a way to COUNT how far each wheel actually turned. That's what wheel encoders do!

A **wheel encoder** is a plastic disc with 20 slots attached to the motor shaft. An IR sensor sits on each side — one shines invisible light, the other detects it. As the wheel spins, the slots pass through: light goes through the slot (HIGH!), solid plastic blocks it (LOW!). Each change is called a **tick**.

The disc has 20 slots and the wheel circumference is about 21 cm. So each tick = `21 cm ÷ 20 = 1.05 cm` of travel. Count 20 ticks and the wheel did one full rotation — about 21 cm! Now your robot knows exactly how far it has gone!

We use **GPIO interrupts** so the Pico never misses a tick. When the sensor changes, the hardware automatically calls a special function called an ISR (Interrupt Service Routine) that adds 1 to the counter. Super fast and never misses!

## 🔌 Wiring

| Encoder Module Pin | Connects To | Notes |
|---|---|---|
| Left encoder VCC | Pico 3V3 OUT (pin 36) | Sensor power |
| Left encoder GND | GND | Common ground |
| Left encoder OUT | Pico GP2 | Interrupt-capable pin |
| Right encoder VCC | Pico 3V3 OUT (pin 36) | Sensor power |
| Right encoder GND | GND | Common ground |
| Right encoder OUT | Pico GP3 | Interrupt-capable pin |

Mount each slotted disc on its motor shaft so the slots pass through the sensor gap as the wheel turns.

## 💻 The Code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"

#define LEFT_ENCODER_PIN   2
#define RIGHT_ENCODER_PIN  3

// Wheel geometry
#define WHEEL_DIAMETER_CM  6.7f
#define SLOTS_PER_REV      20
#define WHEEL_CIRCUMFERENCE (3.14159f * WHEEL_DIAMETER_CM)  // ~21.05 cm
#define CM_PER_TICK        (WHEEL_CIRCUMFERENCE / SLOTS_PER_REV)  // ~1.05 cm

// Volatile because modified inside ISRs
volatile uint32_t left_ticks  = 0;
volatile uint32_t right_ticks = 0;

// Interrupt Service Routine — called on every rising edge
void encoder_isr(uint gpio, uint32_t events) {
    if (gpio == LEFT_ENCODER_PIN) {
        left_ticks++;
    } else if (gpio == RIGHT_ENCODER_PIN) {
        right_ticks++;
    }
}

void encoder_init(void) {
    // Left encoder
    gpio_init(LEFT_ENCODER_PIN);
    gpio_set_dir(LEFT_ENCODER_PIN, GPIO_IN);
    gpio_pull_up(LEFT_ENCODER_PIN);
    gpio_set_irq_enabled_with_callback(LEFT_ENCODER_PIN,
        GPIO_IRQ_EDGE_RISE, true, &encoder_isr);

    // Right encoder — same callback, just enable IRQ
    gpio_init(RIGHT_ENCODER_PIN);
    gpio_set_dir(RIGHT_ENCODER_PIN, GPIO_IN);
    gpio_pull_up(RIGHT_ENCODER_PIN);
    gpio_set_irq_enabled(RIGHT_ENCODER_PIN, GPIO_IRQ_EDGE_RISE, true);

    printf("Encoders initialised on GP%d and GP%d\n",
           LEFT_ENCODER_PIN, RIGHT_ENCODER_PIN);
}

void encoder_reset(void) {
    left_ticks  = 0;
    right_ticks = 0;
}

float ticks_to_distance(uint32_t ticks) {
    return ticks * CM_PER_TICK;
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    encoder_init();
    encoder_reset();

    printf("=== Encoder Distance Monitor ===\n");
    printf("Push the robot by hand or run the motors.\n");
    printf("Each tick ≈ %.2f cm\n\n", CM_PER_TICK);

    while (true) {
        // Snapshot tick counts (disable interrupts briefly for consistency)
        uint32_t l = left_ticks;
        uint32_t r = right_ticks;

        float l_dist = ticks_to_distance(l);
        float r_dist = ticks_to_distance(r);

        printf("Left: %4lu ticks = %6.1f cm  |  Right: %4lu ticks = %6.1f cm\n",
               l, l_dist, r, r_dist);

        sleep_ms(500);
    }

    return 0;
}
```

## 🎮 Try It!
1. **Push test** — With motors off, push the robot forward by hand. Watch the tick counts go up on the serial monitor. How cool is that!
2. **One full rotation** — Push until you see exactly 20 ticks on one wheel. Measure the distance on the floor with a ruler — it should be about 21 cm!
3. **Count backwards** — Push the robot backward. Do the ticks still count? (Yes! The simple slot sensor can't tell direction — it just counts pulses.)
4. **Try running the motors** — Run the motors and record the ticks. Repeat three times. Are the numbers consistent?

## 🏆 Challenge

Add direction detection! Wire a second IR sensor per wheel, offset by half a slot width. By checking WHICH sensor triggers first, you can tell if the wheel is spinning forward or backward. Add 1 for forward, subtract 1 for reverse. Now your robot knows where it is in both directions!

## 📝 Summary

You attached slotted encoder wheels and IR sensors, then wrote an interrupt-driven tick counter. Now the robot knows exactly how far each wheel has traveled! No more guessing with time — you have real distance measurements. This is how real robots (and even electric cars!) track their movement!
