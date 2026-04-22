# Lesson 8: Tilt & Shock Switch Modules — Detecting Movement

## 🎯 What you'll learn
- The difference between *polling* (checking in a loop) and *interrupts* (being notified instantly)
- How to set up a GPIO interrupt using `gpio_set_irq_enabled_with_callback()`
- Why interrupt functions should be kept very short
- How to use a *flag variable* to safely pass information from an interrupt to the main loop
- How to use both the Tilt Switch Module and the Shock Switch Module together

## 🛒 Parts you'll need
- Raspberry Pi Pico 2 W (~$7)
- Elegoo 37 Sensor Kit Tilt Switch Module (included in kit)
- Elegoo 37 Sensor Kit Shock Switch Module (included in kit)
- Elegoo 37 Sensor Kit Active Buzzer Module (included in kit)
- Breadboard and jumper wires (included in kit)
- USB cable to connect Pico to your computer

## 🌟 Background

In all your lessons so far, your code has been *polling* sensors — which means your `while` loop keeps checking "is the button pressed? is the button pressed? is the button pressed?" over and over, dozens of times a second. Polling works fine for slow events, but imagine you are trying to catch a fly ball in baseball: you cannot afford to look away for even a split second, or you will miss it. The same problem happens with sensors that change very briefly, like a vibration or a quick tilt.

**Interrupts** solve this problem. An interrupt is like a tap on the shoulder. While you are busy doing something else (your main loop), the Pico's hardware is quietly watching a pin. The moment that pin changes, it *interrupts* whatever you are doing and immediately calls a special function you wrote. After that function finishes, your program picks up exactly where it left off — as if nothing happened (except now it knows the event occurred).

Here is the golden rule of interrupt functions: **keep them super short!** A function that runs for a long time blocks other important things. The best pattern is to just set a *flag* — a simple true/false variable — inside the interrupt function, and then check that flag in your main loop to do the real work. Think of the interrupt function as a sticky note that says "hey, something happened!" and the main loop as the person who reads the note and actually handles it.

## 🔌 Wiring

| Pico Pin | Component Pin | Component            |
|----------|---------------|----------------------|
| GP2      | S (signal)    | Tilt Switch Module   |
| 3V3      | VCC           | Tilt Switch Module   |
| GND      | GND           | Tilt Switch Module   |
| GP3      | S (signal)    | Shock Switch Module  |
| 3V3      | VCC           | Shock Switch Module  |
| GND      | GND           | Shock Switch Module  |
| GP15     | S (signal)    | Active Buzzer Module |
| 3V3      | VCC           | Active Buzzer Module |
| GND      | GND           | Active Buzzer Module |

> **How the Tilt Switch works:** Inside the module is a small metal ball in a tube. When the tube is level, the ball sits at one end and the circuit is open (LOW). Tilt it far enough and the ball rolls to the other end, closing the circuit (HIGH). Try rotating the whole module to see when it triggers.

> **How the Shock Switch works:** It contains a very thin spring. When the module feels a vibration or knock, the spring wobbles and briefly touches a contact (HIGH). Even putting it down on a table sharply will trigger it!

> **Onboard LED:** This lesson also blinks the Pico's built-in LED (GP25). No extra wiring needed for that!

## 💻 The code

```c
/**
 * Lesson 8: Tilt & Shock Switch Modules — Detecting Movement with Interrupts
 *
 * - Tilt Switch on GP2: interrupt fires when tilted
 *   -> flashes the onboard LED 3 times
 * - Shock Switch on GP3: interrupt fires when vibrated
 *   -> beeps the active buzzer twice
 * - Counts both events and prints totals to serial every 2 seconds
 */

#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include <stdio.h>

// --- Pin definitions ---
#define TILT_PIN      2   // Tilt Switch Module signal pin
#define SHOCK_PIN     3   // Shock Switch Module signal pin
#define BUZZER_PIN   15   // Active Buzzer Module signal pin
#define ONBOARD_LED  25   // Pico's built-in LED

// --- Flag variables (set by ISR, read by main loop) ---
// "volatile" tells the compiler: "this variable can change at ANY time
// (even outside the normal program flow), don't optimize it away!"
// You MUST use volatile for variables shared between ISRs and main code.
volatile bool tilt_detected  = false;
volatile bool shock_detected = false;

// --- Event counters ---
volatile int tilt_count  = 0;
volatile int shock_count = 0;

// -----------------------------------------------
// The GPIO Interrupt Callback
// -----------------------------------------------
// This function is called AUTOMATICALLY by the Pico hardware
// the moment GP2 or GP3 changes state.
// Keep it SHORT — just set the flag and get out!
//
// Parameters:
//   gpio   — which pin triggered the interrupt
//   events — what type of event (rising edge, falling edge, etc.)
void gpio_callback(uint gpio, uint32_t events) {

    if (gpio == TILT_PIN) {
        // TILT event! Set the flag and count it.
        // We only care about the RISING edge (LOW -> HIGH = tilted)
        if (events & GPIO_IRQ_EDGE_RISE) {
            tilt_detected = true;
            tilt_count++;
        }
    }

    if (gpio == SHOCK_PIN) {
        // SHOCK event! Set the flag and count it.
        if (events & GPIO_IRQ_EDGE_RISE) {
            shock_detected = true;
            shock_count++;
        }
    }

    // That's it! Keep the ISR short. The main loop does the real work.
}

// -----------------------------------------------
// Helper: flash the onboard LED N times
// -----------------------------------------------
void flash_led(int times) {
    for (int i = 0; i < times; i++) {
        gpio_put(ONBOARD_LED, 1);  // LED on
        sleep_ms(150);
        gpio_put(ONBOARD_LED, 0);  // LED off
        sleep_ms(150);
    }
}

// -----------------------------------------------
// Helper: beep the active buzzer N times
// -----------------------------------------------
void beep(int times) {
    for (int i = 0; i < times; i++) {
        gpio_put(BUZZER_PIN, 1);   // buzzer on
        sleep_ms(100);
        gpio_put(BUZZER_PIN, 0);   // buzzer off
        sleep_ms(150);
    }
}

int main() {
    // -----------------------------------------------
    // 1. Start serial monitor
    // -----------------------------------------------
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 8: Tilt & Shock Interrupts ===\n");
    printf("Tilt the Tilt Module -> LED flashes 3 times\n");
    printf("Knock the Shock Module -> Buzzer beeps twice\n\n");

    // -----------------------------------------------
    // 2. Set up the onboard LED
    // -----------------------------------------------
    gpio_init(ONBOARD_LED);
    gpio_set_dir(ONBOARD_LED, GPIO_OUT);
    gpio_put(ONBOARD_LED, 0);

    // -----------------------------------------------
    // 3. Set up the active buzzer
    // -----------------------------------------------
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // -----------------------------------------------
    // 4. Set up the Tilt Switch pin with interrupt
    // -----------------------------------------------
    gpio_init(TILT_PIN);
    gpio_set_dir(TILT_PIN, GPIO_IN);
    // Enable pull-down: the pin reads LOW normally, HIGH when tilted
    gpio_pull_down(TILT_PIN);

    // -----------------------------------------------
    // 5. Set up the Shock Switch pin with interrupt
    // -----------------------------------------------
    gpio_init(SHOCK_PIN);
    gpio_set_dir(SHOCK_PIN, GPIO_IN);
    gpio_pull_down(SHOCK_PIN);

    // -----------------------------------------------
    // 6. Register the interrupt callback
    // -----------------------------------------------
    // gpio_set_irq_enabled_with_callback() does two things:
    //   a) Sets up an interrupt on the given pin for the given event type
    //   b) Registers the function to call when the interrupt fires
    //
    // GPIO_IRQ_EDGE_RISE = trigger when the pin goes from LOW to HIGH
    // GPIO_IRQ_EDGE_FALL = trigger when the pin goes from HIGH to LOW
    //
    // We use "true" at the end to enable the interrupt right away.
    // The SAME callback function handles ALL GPIO interrupts — we figure
    // out which pin fired by checking the "gpio" parameter inside the callback.

    gpio_set_irq_enabled_with_callback(
        TILT_PIN,            // pin to watch
        GPIO_IRQ_EDGE_RISE,  // trigger on rising edge (LOW -> HIGH)
        true,                // enable now
        &gpio_callback       // which function to call
    );

    // Add interrupt for the Shock Switch on the SAME callback.
    // Note: only use gpio_set_irq_enabled() (no _with_callback suffix)
    // for subsequent pins — the callback is already registered.
    gpio_set_irq_enabled(
        SHOCK_PIN,
        GPIO_IRQ_EDGE_RISE,
        true
    );

    printf("Interrupts active! Waiting for movement...\n\n");

    // -----------------------------------------------
    // 7. Main loop
    // -----------------------------------------------
    uint64_t last_report_us = 0;

    while (true) {
        // --- Handle tilt event ---
        // Check the flag. If the ISR set it, do the work here, then clear it.
        if (tilt_detected) {
            tilt_detected = false;  // clear the flag FIRST

            printf("Tilt! (total tilts: %d)\n", tilt_count);
            flash_led(3);  // flash onboard LED 3 times
        }

        // --- Handle shock event ---
        if (shock_detected) {
            shock_detected = false;  // clear the flag FIRST

            printf("Shock! (total shocks: %d)\n", shock_count);
            beep(2);  // beep the buzzer twice
        }

        // --- Print a summary every 2 seconds ---
        uint64_t now = time_us_64();
        if (now - last_report_us >= 2000000) {  // 2 000 000 us = 2 seconds
            printf("--- Report: %d tilts, %d shocks so far ---\n",
                   tilt_count, shock_count);
            last_report_us = now;
        }

        // A tiny sleep keeps the loop from running millions of times
        // per second unnecessarily, but it's short enough that we
        // won't miss anything — the interrupts catch events instantly!
        sleep_ms(10);
    }

    return 0;
}
```

## 🔍 How the code works

1. **`volatile bool tilt_detected`** — The keyword `volatile` is essential when a variable is shared between an interrupt function and the main loop. It tells the C compiler: "do not try to optimize this variable — it can change at any moment from outside the normal program flow." Without `volatile`, the compiler might cache the variable and never notice when the interrupt changes it.

2. **`gpio_callback(uint gpio, uint32_t events)`** — This is the interrupt function. The Pico calls it automatically whenever a registered interrupt fires. The `gpio` parameter tells you which pin caused the interrupt, and `events` tells you what happened (rising edge, falling edge, etc.).

3. **`gpio_set_irq_enabled_with_callback()`** — This is the main setup call. It says: "watch TILT_PIN for a rising edge, and when it happens, call `gpio_callback`." The `&gpio_callback` is the *address* of your function — you are handing the Pico a pointer so it knows where to jump when the interrupt fires.

4. **`gpio_set_irq_enabled()`** — For the second pin, use this shorter version. The callback was already registered with the first call, and the Pico uses the same callback for all GPIO interrupts.

5. **`if (tilt_detected) { tilt_detected = false; ... }`** — This is the *flag pattern*. The interrupt sets the flag to `true`. The main loop sees it, clears it immediately, and then does the actual work (flashing, beeping). Clearing it first (before the work) means if another tilt happens during `flash_led()`, the flag gets set again and you will not miss it.

6. **`flash_led(3)` and `beep(2)`** — These helper functions use `sleep_ms()` which is fine inside the main loop. But you should NEVER call `sleep_ms()` inside an interrupt function — it would freeze the whole interrupt system!

7. **`time_us_64()` for the 2-second report** — Instead of using `sleep_ms(2000)` (which would block the loop), you check the time on every loop. This is called a *non-blocking timer* and it is a great habit to get into.

## 🚀 Try it

1. **Tilt test:** Hold the Tilt Switch Module with its sensor end pointing up. Slowly tilt it to one side until the LED flashes. Watch the serial monitor — does the count go up with each tilt?

2. **Knock test:** Gently knock on the table right next to the Shock Switch Module. Try different strengths — does a very gentle tap register? What is the lightest touch that triggers it?

3. **Count race:** Start the program and see how many tilts and shocks you can register in 30 seconds. The 2-second report will tell you your score. Try to get 20 tilts!

4. **Change to falling edge:** In `gpio_set_irq_enabled_with_callback()`, change `GPIO_IRQ_EDGE_RISE` to `GPIO_IRQ_EDGE_FALL`. Now the tilt interrupt fires when the module goes from HIGH back to LOW (un-tilting). Does the behavior feel different?

## 🏆 Challenge

**Tilt-activated alarm box!** Combine the tilt sensor and the shock sensor to build a simple "has anyone touched my stuff?" alarm. When the program starts, wait 5 seconds (so you can put it down safely). After that, go into alarm mode. If EITHER sensor fires, sound the buzzer in a fast repeating pattern and flash the LED rapidly for 3 seconds. Add a way to "reset" the alarm using a button (from Lesson 3's Button Switch Module) — pressing the button within the 3 seconds stops the alarm. You will need to handle three different interrupts in one callback!

## ✅ Summary

Interrupts let the Pico react to events instantly without constantly checking in a loop — the hardware taps your code on the shoulder the moment something changes. You keep interrupt functions short (just set a flag) and do the real work in the main loop, so nothing important gets blocked. The Tilt Switch and Shock Switch Modules from your Elegoo kit are great sensors for this because their signals are brief and easy to miss with regular polling alone.
