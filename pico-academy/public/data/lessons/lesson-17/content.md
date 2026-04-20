# Lesson 17: Photo-interrupter Module — The Invisible Tripwire

## What you'll learn
- How a photo-interrupter uses an invisible light beam to detect objects
- How to use GPIO interrupts to catch fast events without missing them
- How to measure how long an object blocks the beam
- How to count objects passing by — like a factory conveyor belt counter
- How to combine a sensor with a buzzer and RGB LED for a full alarm system

---

## Parts you'll need
- Raspberry Pi Pico 2 W
- Photo-interrupter Module (the U-shaped one with a gap in the middle)
- Active Buzzer Module
- RGB LED Module
- Breadboard and jumper wires
- USB cable for power and serial output
- Something thin to stick through the gap — a piece of card, your finger, a pencil

---

## Background

Imagine placing a tiny invisible laser beam across a doorway. The moment someone walks through and breaks the beam, an alarm goes off — you have seen this in action movies! A **photo-interrupter** does exactly that, but in miniature. Inside that U-shaped plastic housing there are two tiny components facing each other across the gap: an **infrared LED** shining a constant invisible beam, and an **IR phototransistor** on the other side receiving that beam. As long as the beam is unbroken, the output signal stays in one state. The moment something slides into the gap and blocks the light, the output flips to the other state. Simple, reliable, and incredibly fast!

Photo-interrupters are everywhere once you know to look for them. Inkjet printers use them to detect when paper runs out — the paper normally breaks the beam, and when the beam clears that means the tray is empty. 3D printers use them as "home" position switches — when the print head slides all the way to one end it breaks a beam and the printer knows exactly where it is. Ticket turnstiles in train stations count every person who walks through. Some old computer mice even used photo-interrupters to count the notches on a tiny spinning wheel inside! Your Elegoo kit gives you one of these sensors to play with right now.

One important thing to know: the output logic might feel backwards at first! Many photo-interrupter modules output **LOW (0)** when the beam is **broken**, and **HIGH (1)** when the beam is clear. Think of it this way: the phototransistor is "conducting" when it sees light, pulling the output high. When you block the light it stops conducting and the output falls low. Always test your specific module to confirm, because some are wired the opposite way!

---

## Wiring

### Photo-interrupter Module (S / VCC / GND or OUT / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP14 | S or OUT (signal) | Digital output — changes when beam breaks |
| 3V3 | VCC | 3.3 V power (use VBUS for 5 V if beam is weak) |
| GND | GND | Ground |

### Active Buzzer Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal) | HIGH = buzzer on |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### RGB LED Module (R / G / B / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Ground (common cathode) |

> **Tip:** The photo-interrupter module usually has a small LED on it that glows when it has power — that is the IR transmitter working. You cannot see IR light with your eyes, but a phone camera can! Point your camera at the gap to see a faint purple glow.

---

## The code

```c
/**
 * Lesson 17: Photo-interrupter Module — The Invisible Tripwire
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Photo-interrupter -> GP14
 * Active Buzzer     -> GP15
 * RGB LED           -> GP9 (R), GP10 (G), GP11 (B)
 *
 * What it does:
 *   - Uses an interrupt to detect the exact moment the beam breaks
 *   - Flashes the LED blue and beeps the buzzer on each break
 *   - Counts total interruptions (like a factory item counter)
 *   - Measures how long the beam stays broken (object size/speed clue!)
 *   - Prints count and duration to the serial monitor
 */

#include <stdio.h>
#include "pico/stdlib.h"

// ── Pin definitions ──────────────────────────────────────────────
#define INTERRUPTER_PIN  14   // Photo-interrupter signal output
#define BUZZER_PIN       15   // Active buzzer (HIGH = on)
#define LED_R_PIN         9   // RGB LED red
#define LED_G_PIN        10   // RGB LED green
#define LED_B_PIN        11   // RGB LED blue

// ── Shared variables (volatile = safe to use in interrupts AND main) ──
volatile int  beam_break_count  = 0;      // How many times beam was broken
volatile bool beam_broken       = false;  // Is the beam currently broken?
volatile uint64_t break_start_us = 0;     // When did the latest break start?
volatile uint64_t last_duration_us = 0;   // How long did the last break last?

// ── Interrupt handler ────────────────────────────────────────────
// This function runs automatically the instant the pin changes state.
// Keep it SHORT — just record what happened and let main() do the work.
void interrupter_callback(uint gpio, uint32_t events) {

    if (events & GPIO_IRQ_EDGE_FALL) {
        // FALLING edge: beam just broke! (HIGH -> LOW)
        beam_broken    = true;
        break_start_us = time_us_64();   // Record the exact time it broke
        beam_break_count++;              // Count this break
    }

    if (events & GPIO_IRQ_EDGE_RISE) {
        // RISING edge: beam restored! (LOW -> HIGH)
        beam_broken = false;
        if (break_start_us > 0) {
            // How long was the beam blocked?
            last_duration_us = time_us_64() - break_start_us;
        }
    }
}

// ── RGB LED helpers ──────────────────────────────────────────────
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// ── Main ─────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 17: Photo-interrupter — Invisible Tripwire ===\n");
    printf("Stick something through the sensor gap to break the beam!\n\n");

    // ── Set up RGB LED pins ──────────────────────────────────────
    gpio_init(LED_R_PIN); gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN); gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN); gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(false, true, false);  // Start green — beam is clear

    // ── Set up active buzzer ─────────────────────────────────────
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);  // Buzzer off

    // ── Set up photo-interrupter pin with interrupt ──────────────
    gpio_init(INTERRUPTER_PIN);
    gpio_set_dir(INTERRUPTER_PIN, GPIO_IN);
    gpio_pull_up(INTERRUPTER_PIN);  // Pull-up: reads HIGH when beam is clear

    // Enable interrupt on BOTH edges: when beam breaks AND when it clears
    gpio_set_irq_enabled_with_callback(
        INTERRUPTER_PIN,
        GPIO_IRQ_EDGE_FALL | GPIO_IRQ_EDGE_RISE,
        true,
        &interrupter_callback
    );

    printf("Ready! Beam is clear. Interrupt watching for beam breaks...\n\n");

    // ── Tracking variables for main loop ─────────────────────────
    int  last_printed_count   = 0;
    bool last_beam_state      = false;
    bool alert_active         = false;
    uint64_t alert_start_time = 0;

    // ── Main loop ────────────────────────────────────────────────
    while (true) {

        // Read shared variables once (they might change mid-read otherwise)
        bool   is_broken    = beam_broken;
        int    count        = beam_break_count;
        uint64_t duration   = last_duration_us;

        // ── Beam just broke: light up blue and beep! ─────────────
        if (is_broken && !last_beam_state) {
            set_rgb(false, false, true);  // Blue — beam blocked!
            gpio_put(BUZZER_PIN, 1);      // BEEP!
            alert_active     = true;
            alert_start_time = time_us_64();
        }

        // ── Turn buzzer off after 100ms (don't want constant buzz) ─
        if (alert_active && (time_us_64() - alert_start_time > 100000)) {
            gpio_put(BUZZER_PIN, 0);
            alert_active = false;
        }

        // ── Beam restored: go back to green ──────────────────────
        if (!is_broken && last_beam_state) {
            set_rgb(false, true, false);  // Back to green — all clear

            // Print the duration of the last break
            printf("Beam cleared! Break lasted: %llu microseconds (%.1f ms)\n",
                   duration, duration / 1000.0);
        }

        // ── Print count when it changes ───────────────────────────
        if (count != last_printed_count) {
            printf("=== BEAM BREAK #%d detected! ===\n", count);
            last_printed_count = count;
        }

        // ── Periodic status update every second ──────────────────
        static uint32_t last_status_ms = 0;
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());
        if (now_ms - last_status_ms >= 1000) {
            printf("Status | Beam: %-6s | Total breaks: %d | Last duration: %.2f ms\n",
                   is_broken ? "BROKEN" : "clear",
                   count,
                   duration / 1000.0);
            last_status_ms = now_ms;
        }

        last_beam_state = is_broken;
        sleep_ms(10);  // Short sleep — we rely on interrupts for fast detection
    }

    return 0;
}
```

---

### How the code works

1. **`volatile` variables** are special — the `volatile` keyword tells the compiler "this variable might change at any moment from the interrupt, so always re-read it from memory rather than keeping a cached copy." Without `volatile`, the compiler might optimise away reads and miss updates from the interrupt handler.

2. **`gpio_set_irq_enabled_with_callback()`** is the magic line that hooks up the interrupt. We ask the Pico hardware to call our `interrupter_callback` function the instant the pin changes on either a falling edge (HIGH to LOW) or rising edge (LOW to HIGH). The CPU stops what it is doing, runs the callback, then goes back to where it was — all in microseconds!

3. **The interrupt callback** only does the minimum work: record timestamps and update flags. The heavy lifting (serial printing, LED changes, buzzer) happens in `main()`. This is good practice — long interrupt handlers can cause missed events.

4. **`break_start_us = time_us_64()`** records the exact microsecond when the beam broke. When it clears, we subtract to find the duration. This tells you how long an object was blocking the beam — a small card blocking it briefly means a fast object; a long block means a big or slow one.

5. **The buzzer** only beeps for 100 ms even if the beam stays blocked. We track `alert_start_time` and turn the buzzer off after 100 000 microseconds. This is a non-blocking timeout — the main loop keeps running while we count time.

6. **The green/blue LED** acts as a visual "traffic light": green when the beam is clear and safe, blue when the beam is broken and something is detected.

---

## Try it

1. **Slow pass:** Slowly slide a pencil through the gap. How long does the serial monitor say the beam was broken? Now do it fast — does the duration number drop?

2. **Count items:** Stack five small objects next to the sensor. Push them through the gap one at a time. Does the counter reach exactly 5? This is literally how factories count products on a conveyor belt!

3. **Measure object width:** Pass a ruler slowly through at a steady pace. Use the duration to estimate the width: `width ≈ speed × time`. If you move at about 1 cm/s and the beam is blocked for 30 ms (0.03 s), the object is about 0.03 cm wide. (This is tricky but fun to try!)

4. **Rapid fire test:** Wave your hand back and forth through the gap as fast as you can. How fast can you go before the counter starts missing counts? (Hint: interrupts are very fast — you might be surprised!)

---

## Challenge

**Build a Cookie Jar Alarm!**

Find a small box with a lid (a shoe box works great). Mount the photo-interrupter so the beam crosses the opening of the box — tape the sensor to one side of the box so when the lid lifts, it breaks the beam.

Modify the code to add these features:
- When the beam breaks for the **first time**, wait 3 seconds (this is your "get away" time!)
- After 3 seconds, if the beam is still broken (or was broken), sound the full alarm: buzzer beeps rapidly and the RGB LED flashes red
- Add a secret "disarm": if you break the beam exactly **3 times quickly** (within 2 seconds) without triggering the alarm, print "DISARMED — you know the secret!" to serial

Can you fool your own alarm? Can a family member figure out the secret?

---

## Summary

A photo-interrupter uses an invisible infrared beam across a small gap to detect the exact moment something passes through — and it is fast enough to catch events that happen in microseconds. You learned how GPIO interrupts let the Pico react instantly without the main loop needing to constantly check the pin, and how timestamps let you measure how long an event lasts. These are the same techniques used in printers, 3D printers, factory machines, and ticket turnstiles all over the world!
