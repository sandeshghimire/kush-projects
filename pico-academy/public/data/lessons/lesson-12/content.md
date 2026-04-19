# Multicore — Two CPUs, One Robot

## What you'll learn
- That the Pico 2 has two ARM Cortex-M33 cores
- How to launch code on the second core (core 1)
- How to safely pass data between cores using FIFOs
- When multicore makes sense and when it doesn't
- How to avoid common multicore pitfalls

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 2× LEDs (~$0.20)
- 2× 330Ω resistors (~$0.10)
- 3× jumper wires (~$0.30)

## Background

Most microcontrollers have just one processor core — one brain that does everything one step at a time. The Pico 2 is special: it has **two** ARM Cortex-M33 cores running at 150 MHz. That's like having two workers who can do completely different jobs at the same time!

In a robot, this is incredibly useful. Imagine core 0 handles all the sensor reading and motor control (the "driving brain"), while core 1 manages the OLED display, Neopixel animations, and Wi-Fi communication (the "communication brain"). Neither one slows the other down.

The Pico SDK makes multicore surprisingly easy. Your `main()` function always runs on **core 0**. To start code on **core 1**, you call `multicore_launch_core1()` with a function pointer. That function then runs independently on the second core.

But here's the tricky part: when two cores share data, you can get **race conditions** — both cores try to read or write the same variable at the same time, causing corrupted data. The Pico provides **FIFOs** (First In, First Out queues) for safe inter-core communication. Each core can push 32-bit values into the FIFO, and the other core pops them out in order. It's like a mailbox between the two cores.

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP15 | LED A (core 0) through 330Ω resistor |
| GP16 | LED B (core 1) through 330Ω resistor |
| GND  | Both LED cathodes |

## The code

```c
#include "pico/stdlib.h"
#include "pico/multicore.h"
#include <stdio.h>

#define LED_CORE0_PIN 15
#define LED_CORE1_PIN 16

// This function runs on core 1
void core1_entry(void) {
    gpio_init(LED_CORE1_PIN);
    gpio_set_dir(LED_CORE1_PIN, GPIO_OUT);

    while (true) {
        // Wait for a message from core 0 (blocks until data arrives)
        uint32_t delay_ms = multicore_fifo_pop_blocking();

        // Blink the LED at the rate core 0 told us
        gpio_put(LED_CORE1_PIN, 1);
        sleep_ms(delay_ms);
        gpio_put(LED_CORE1_PIN, 0);
        sleep_ms(delay_ms);
    }
}

int main() {
    stdio_init_all();

    // Set up core 0's LED
    gpio_init(LED_CORE0_PIN);
    gpio_set_dir(LED_CORE0_PIN, GPIO_OUT);

    // Launch core 1
    multicore_launch_core1(core1_entry);

    printf("Multicore demo started!\n");
    printf("Core 0: blinking LED A\n");
    printf("Core 1: blinking LED B at variable speed\n");

    uint32_t speed = 100;
    bool getting_faster = true;

    while (true) {
        // Core 0: blink its own LED at a steady rate
        gpio_put(LED_CORE0_PIN, 1);
        sleep_ms(250);
        gpio_put(LED_CORE0_PIN, 0);
        sleep_ms(250);

        // Send a speed command to core 1
        if (multicore_fifo_wready()) {
            multicore_fifo_push_blocking(speed);
        }

        // Vary the speed we send to core 1
        if (getting_faster) {
            speed -= 10;
            if (speed <= 50) getting_faster = false;
        } else {
            speed += 10;
            if (speed >= 500) getting_faster = true;
        }
    }

    return 0;
}
```

### How the code works

1. `multicore_launch_core1(core1_entry)` starts the `core1_entry` function on the second core. It begins running immediately.
2. `multicore_fifo_push_blocking()` sends a 32-bit value from core 0 to core 1. It blocks if the FIFO is full (8 entries deep).
3. `multicore_fifo_pop_blocking()` waits on core 1 until a value arrives from core 0.
4. `multicore_fifo_wready()` checks if there's room to push without blocking.
5. Both cores run their `while(true)` loops simultaneously — core 0's blink rate is fixed while core 1's changes.

## Try it

1. **Bidirectional chat** — Have core 1 send sensor readings back to core 0 (FIFOs work in both directions).
2. **Core 1 display** — Run the OLED display code from Lesson 8 on core 1 while core 0 handles sensors.
3. **Performance test** — Measure how fast each core can count in a loop using `time_us_64()` and compare single-core vs dual-core throughput.

## Challenge

Create a producer-consumer system: core 0 reads ADC values at 1000 Hz and pushes them into the FIFO. Core 1 pulls them out, calculates a running average of the last 10 readings, and displays it on an OLED. This is a common real-time pattern used in robots.

## Summary

The Pico 2's dual Cortex-M33 cores let you run two independent programs simultaneously. `multicore_launch_core1()` starts the second core, and inter-core FIFOs provide safe communication without race conditions. Use multicore to split your robot's workload: one core for real-time motor control and one for displays, LEDs, and communications. Just remember — shared data without proper synchronization causes bugs!
