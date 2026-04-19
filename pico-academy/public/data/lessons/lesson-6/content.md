# Timers, Interrupts & Non-Blocking Code

## What you'll learn
- Why `sleep_ms()` blocks your program and why that's bad
- How hardware timers run code at precise intervals
- How GPIO interrupts respond to button presses instantly
- How to use repeating timers for periodic tasks
- How to build non-blocking programs that do multiple things at once

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× LED (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 1× push button (~$0.10)
- 3× jumper wires (~$0.30)

## Background

Up to now, every time you wanted to wait, you called `sleep_ms()`. That works fine when you're only doing one thing, but imagine you need to blink an LED every 500ms AND check a button AND read a sensor. If your code is stuck sleeping for 500ms, it can't check the button during that time!

Think of it like cooking dinner. If you stare at the oven the whole time waiting for the timer to ding, you can't stir the soup on the stove. A better approach: set a kitchen timer, go stir the soup, and when the timer dings, you come back to the oven. That's exactly what **hardware timers** do for your Pico.

An **interrupt** is like a tap on the shoulder. The Pico is busy running your main code, but when a timer fires or a button is pressed, the hardware taps the CPU on the shoulder and says "Hey! Deal with this!" The CPU pauses what it's doing, runs a small function called an **interrupt handler** (or callback), then goes right back to what it was doing before.

The Pico 2's RP2350 chip has a hardware timer that counts microseconds since boot. You can set **alarms** on this timer that trigger callbacks at precise intervals. There are also **GPIO interrupts** that fire when a pin changes state — much better than polling the pin in a loop!

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP15 | LED anode through 330Ω resistor |
| GP14 | Button — one leg (other leg to GND) |
| GND  | LED cathode, Button other leg |

## The code

```c
#include "pico/stdlib.h"
#include "hardware/timer.h"
#include "hardware/gpio.h"
#include <stdio.h>

#define LED_PIN    15
#define BUTTON_PIN 14

volatile bool led_state = false;
volatile uint32_t press_count = 0;

// This function is called every 500ms by the repeating timer
bool timer_callback(struct repeating_timer *t) {
    led_state = !led_state;
    gpio_put(LED_PIN, led_state);
    return true;  // Return true to keep repeating
}

// This function is called when the button pin changes state
void gpio_callback(uint gpio, uint32_t events) {
    if (gpio == BUTTON_PIN && (events & GPIO_IRQ_EDGE_FALL)) {
        press_count++;
    }
}

int main() {
    stdio_init_all();

    // Set up LED
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    // Set up button with pull-up and interrupt
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);
    gpio_set_irq_enabled_with_callback(
        BUTTON_PIN,
        GPIO_IRQ_EDGE_FALL,  // Trigger on falling edge (button press)
        true,
        &gpio_callback
    );

    // Set up a repeating timer that fires every 500ms
    struct repeating_timer timer;
    add_repeating_timer_ms(500, timer_callback, NULL, &timer);

    // Main loop is free to do other things!
    uint32_t last_count = 0;
    while (true) {
        if (press_count != last_count) {
            printf("Button pressed %d times!\n", press_count);
            last_count = press_count;
        }
        // You could read sensors, update displays, etc. here
        // The LED blinks automatically via the timer!
        tight_loop_contents();
    }

    return 0;
}
```

### How the code works

1. `add_repeating_timer_ms(500, callback, NULL, &timer)` sets up a timer that calls `timer_callback` every 500 milliseconds automatically.
2. `gpio_set_irq_enabled_with_callback()` registers a function to be called whenever the button pin sees a falling edge (HIGH → LOW transition).
3. We mark variables as `volatile` because they're modified inside interrupt handlers — this tells the compiler not to cache their values.
4. The main loop is completely free — no `sleep_ms()` needed! It can check for updates and do other work.

## Try it

1. **Two timers** — Add a second repeating timer at a different interval (say 200ms) that toggles a second LED.
2. **Adjustable rate** — Use the button to cycle through different blink speeds: 100ms, 250ms, 500ms, 1000ms.
3. **One-shot timer** — Use `add_alarm_in_ms()` to trigger a function exactly once after a delay, like a countdown.

## Challenge

Build a reaction time tester: after a random delay (1–5 seconds), turn on the LED. Use a GPIO interrupt to measure exactly how many microseconds pass before the button is pressed. Print the reaction time over serial. Use `time_us_64()` for precise timing.

## Summary

Hardware timers and GPIO interrupts let your Pico do multiple things at once without blocking. Repeating timers call your function at precise intervals while the main loop stays free. GPIO interrupts respond to button presses instantly without polling. The `volatile` keyword ensures interrupt-modified variables are read correctly. Non-blocking code is the foundation of real-time robot control!
