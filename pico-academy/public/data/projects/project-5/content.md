# Wheel Encoders — Counting Rotations

## What you'll learn
- What a wheel encoder is and why it matters for accurate movement
- How a slotted disc and IR sensor create electrical pulses
- How to use GPIO interrupts (ISRs) on the Pico 2
- How to convert encoder ticks to real-world distance in centimetres
- Why encoder feedback is the first step toward closed-loop control

## Parts you'll need
- 2× slotted encoder wheels (20 slots each) — included with some motor kits or $1.50
- 2× IR slot-type optical sensor modules (H206) — $1.50
- 4× M2 screws for mounting the sensors — from your kit

**Total: ≈ $3**

## Background

In Project 4 we drove a square using timing — "go forward for 1.5 seconds." But how far did the robot actually travel? We don't know! Different battery levels, different floor surfaces, even temperature can change how fast the wheels spin. We need a way to *count* how far each wheel has actually turned.

A **wheel encoder** solves this. A plastic disc with 20 slots is attached to the motor shaft. An IR (infrared) sensor sits on either side of the disc — one side shines an invisible IR light, the other side has a detector. As the wheel spins, the slots pass through the sensor: light passes through a slot (sensor reads HIGH), then the solid part blocks the light (sensor reads LOW). Each transition is called a **tick**.

If the disc has 20 slots and the wheel circumference is about 21 cm (for a standard 67 mm diameter wheel), then each tick represents roughly `21 cm / 20 = 1.05 cm` of travel. Count 20 ticks and the wheel has gone one full rotation — about 21 cm!

We use **GPIO interrupts** so the Pico does not have to keep checking the sensor in a loop. Instead, the hardware automatically calls a special function (an **Interrupt Service Routine**, or ISR) every time the sensor signal changes. The ISR simply adds 1 to a counter. This way, counting is super fast and we never miss a tick, even while the main program is doing other things.

## Wiring

| Encoder Module Pin | Connects To | Notes |
|---|---|---|
| Left encoder VCC | Pico 3V3 OUT (pin 36) | Sensor power |
| Left encoder GND | GND | Common ground |
| Left encoder OUT | Pico GP2 | Interrupt-capable pin |
| Right encoder VCC | Pico 3V3 OUT (pin 36) | Sensor power |
| Right encoder GND | GND | Common ground |
| Right encoder OUT | Pico GP3 | Interrupt-capable pin |

Mount each slotted disc on its motor shaft so the slots pass through the sensor gap as the wheel turns.

## The code

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

## Try it
1. **Push test** — With motors off, push the robot forward by hand and watch the tick counts increase on the serial monitor.
2. **One full rotation** — Push until you see exactly 20 ticks on one wheel. Measure the distance on the floor with a ruler — it should be about 21 cm.
3. **Motor test** — Run forward() from Project 4 and record the ticks. Repeat three times — are they consistent?
4. **Backwards counting** — Push the robot backward. Do the ticks still count? (Yes! The simple slot sensor cannot tell direction.)

## Challenge

Add direction detection: wire a second IR sensor per wheel, offset by half a slot width. By checking *which sensor triggers first*, you can tell if the wheel is spinning forward or backward. Increment the tick counter for forward, decrement for reverse.

## Summary

You installed slotted encoder wheels and IR sensors, then wrote an interrupt-driven tick counter. Now the robot knows exactly how far each wheel has travelled. This is the foundation for accurate distance measurement and, in Project 6, real speed control.

## How this fits the robot

Encoders give the robot a sense of **proprioception** — awareness of its own movement. Without them, driving is guesswork. With them, the robot can travel an exact distance, detect if a wheel is stuck, and (next project) maintain a precise speed even when the battery voltage drops.
