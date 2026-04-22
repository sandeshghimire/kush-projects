# Project 6: Laser Tripwire Alarm — The Invisible Security Beam

## 🎯 What You'll Learn
- How to combine a laser module and a photo-interrupter to create an invisible security beam
- How GPIO interrupts let your Pico react to events instantly
- How to measure time precisely to detect how long a beam stays broken
- How to build a state machine with ARMED and TRIGGERED states

---

## 🛒 Parts You Need

| Part | Source | Approx. cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Store / kit | ~$7.00 |
| Laser Module | Elegoo 37 Sensor Kit | included |
| Photo-interrupter Module | Elegoo 37 Sensor Kit | included |
| Active Buzzer Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |

**Total extra cost beyond the kit: ~$7 for the Pico if you don't already have one.**

---

## 🌟 Background / The Story

You know those spy movies where a thief creeps through a museum, dodging a web of glowing laser beams? If they even brush one beam, the alarm goes off and guards come running! That's exactly what you're building right now — and the physics are completely real!

Your laser module shines a bright red dot across a doorway or drawer gap. On the other side, the photo-interrupter watches for that dot of light. The moment a hand — or a sneaky sibling — walks through and blocks the beam, the sensor notices in microseconds and the alarm explodes! You can also measure HOW LONG the beam was blocked, which tells you what broke it — a quick hand-wave is short, but a person walking through takes longer. Your alarm can actually guess what set it off!

The secret ingredient is a **GPIO interrupt**. Instead of the Pico constantly asking "is the beam broken?" in a loop, an interrupt is like setting a mousetrap — the Pico does other things, and the INSTANT the pin changes, it snaps and runs a special alarm function!

---

## 🔌 Wiring

| From | To | Notes |
|---|---|---|
| Laser Module S | GP15 | Digital output — HIGH turns laser on |
| Laser Module VCC | 3V3 | 3.3 V power |
| Laser Module GND | GND | Ground |
| Photo-interrupter S | GP2 | Interrupt input — HIGH when beam blocked |
| Photo-interrupter VCC | 3V3 | 3.3 V power |
| Photo-interrupter GND | GND | Ground |
| Active Buzzer S | GP16 | HIGH = buzzer on |
| Active Buzzer VCC | 3V3 | 3.3 V power |
| Active Buzzer GND | GND | Ground |
| RGB LED R | GP9 | PWM red channel |
| RGB LED G | GP10 | PWM green channel |
| RGB LED B | GP11 | PWM blue channel |
| RGB LED GND | GND | Ground |

**Two setup options:**

- **Slot mode (short range):** Use only the photo-interrupter. Pass your finger through the U-shaped slot. The built-in IR LED and receiver handle everything — no laser needed.
- **Laser mode (long range):** Tape the laser module on one side of a doorway and the photo-interrupter on the other, aiming the red dot at the dark receiver component (one side of the U). Tape or clip them at the same height. Adjust until the serial monitor shows the beam is stable.

---

## 💻 The Code

```c
/**
 * Project 6: Laser Tripwire Alarm
 * Build a Smart Home series — Raspberry Pi Pico 2 W, Pico SDK
 *
 * Laser Module   -> GP15
 * Photo-interrupter -> GP2 (interrupt input)
 * Active Buzzer  -> GP16
 * RGB LED: R=GP9, G=GP10, B=GP11
 *
 * States: ARMED (green LED, laser on) -> TRIGGERED (alarm) -> back to ARMED
 * Measures beam-break duration to estimate object size.
 */

#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"
#include <stdio.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_LASER      15   // Laser module signal
#define PIN_SENSOR      2   // Photo-interrupter signal (interrupt)
#define PIN_BUZZER     16   // Active buzzer
#define PIN_LED_R       9   // RGB red
#define PIN_LED_G      10   // RGB green
#define PIN_LED_B      11   // RGB blue

// ── Timing constants ──────────────────────────────────────────────────────────
#define ALARM_DURATION_MS  5000    // Alarm runs for 5 seconds
#define DEBOUNCE_US        50000   // 50 ms software debounce

// ── State machine ─────────────────────────────────────────────────────────────
typedef enum {
    STATE_ARMED,
    STATE_TRIGGERED
} AlarmState;

// ── Shared variables (written by ISR, read by main loop) ──────────────────────
// 'volatile' tells the compiler these can change unexpectedly — never optimise them away
volatile bool     beam_broken     = false;
volatile uint64_t break_time_us   = 0;   // microsecond timestamp of beam breaking
volatile uint64_t restore_time_us = 0;   // microsecond timestamp of beam restoring
volatile uint64_t last_irq_us     = 0;   // for debounce
volatile int      trigger_count   = 0;   // total number of intrusions

// ── PWM helper: set brightness 0-255 on any PWM-capable pin ──────────────────
void pwm_init_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);       // 8-bit resolution
    pwm_set_enabled(slice, true);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(pin), 0);  // off
}

void set_brightness(uint pin, uint8_t level) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(pin),
                       pwm_gpio_to_channel(pin), level);
}

// ── Set RGB colour (0-255 per channel) ───────────────────────────────────────
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    set_brightness(PIN_LED_R, r);
    set_brightness(PIN_LED_G, g);
    set_brightness(PIN_LED_B, b);
}

// ── GPIO interrupt callback — runs the instant the sensor pin changes ─────────
void sensor_isr(uint gpio, uint32_t events) {
    uint64_t now = time_us_64();

    // Debounce: ignore if we just triggered very recently
    if (now - last_irq_us < DEBOUNCE_US) return;
    last_irq_us = now;

    if (events & GPIO_IRQ_EDGE_RISE) {
        // Beam just blocked (sensor pin went HIGH)
        beam_broken   = true;
        break_time_us = now;
        trigger_count++;
    } else if (events & GPIO_IRQ_EDGE_FALL) {
        // Beam restored (sensor pin went LOW again)
        if (beam_broken) {
            restore_time_us = now;
        }
    }
}

// ── Alarm sequence: red flashing + rapid buzzer + blinking laser ──────────────
void run_alarm(uint64_t beam_duration_ms) {
    printf("*** INTRUDER! Beam blocked for %llu ms ***\n", beam_duration_ms);

    // Guess what caused the break
    if (beam_duration_ms < 100) {
        printf("  -> Very quick (insect? dust?)\n");
    } else if (beam_duration_ms < 600) {
        printf("  -> Hand or small object\n");
    } else {
        printf("  -> Large object — probably a person!\n");
    }

    uint64_t start = time_us_64();
    bool laser_on = true;

    // Flash and beep for ALARM_DURATION_MS milliseconds
    while (time_us_64() - start < (uint64_t)ALARM_DURATION_MS * 1000) {
        set_rgb(255, 0, 0);             // Bright red
        gpio_put(PIN_BUZZER, 1);        // Buzzer on
        gpio_put(PIN_LASER, laser_on);  // Laser blinks
        laser_on = !laser_on;
        sleep_ms(120);

        set_rgb(60, 0, 0);              // Dim red
        gpio_put(PIN_BUZZER, 0);        // Buzzer off
        sleep_ms(80);
    }

    // Clean up after alarm
    gpio_put(PIN_BUZZER, 0);
    gpio_put(PIN_LASER, 1);   // Laser back on solid
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);   // Wait for serial monitor to open

    printf("================================================\n");
    printf("  Project 6: Laser Tripwire Alarm\n");
    printf("  Smart Home Series — Pico 2 W\n");
    printf("================================================\n\n");

    // Laser output — turn on immediately
    gpio_init(PIN_LASER);
    gpio_set_dir(PIN_LASER, GPIO_OUT);
    gpio_put(PIN_LASER, 1);
    printf("Laser: ON\n");

    // Active buzzer output
    gpio_init(PIN_BUZZER);
    gpio_set_dir(PIN_BUZZER, GPIO_OUT);
    gpio_put(PIN_BUZZER, 0);

    // RGB LED (PWM)
    pwm_init_pin(PIN_LED_R);
    pwm_init_pin(PIN_LED_G);
    pwm_init_pin(PIN_LED_B);

    // Photo-interrupter input with interrupt on both edges
    gpio_init(PIN_SENSOR);
    gpio_set_dir(PIN_SENSOR, GPIO_IN);
    gpio_pull_down(PIN_SENSOR);   // Pull down so floating pin reads LOW (beam intact)
    gpio_set_irq_enabled_with_callback(
        PIN_SENSOR,
        GPIO_IRQ_EDGE_RISE | GPIO_IRQ_EDGE_FALL,
        true,
        &sensor_isr
    );
    printf("Sensor: interrupt armed on GP%d\n\n", PIN_SENSOR);

    // Three green flashes to show we're ready
    for (int i = 0; i < 3; i++) {
        set_rgb(0, 255, 0);
        sleep_ms(200);
        set_rgb(0, 0, 0);
        sleep_ms(200);
    }

    AlarmState state = STATE_ARMED;
    printf("ARMED — beam is live. Waiting for intrusion...\n\n");

    // ── Main state machine loop ───────────────────────────────────────────────
    while (true) {

        switch (state) {

            // ── ARMED: green LED, laser on, waiting ──────────────────────────
            case STATE_ARMED:
                set_rgb(0, 180, 0);   // Calm green glow

                if (beam_broken) {
                    // Calculate how long the beam has been broken so far
                    uint64_t dur_us;
                    if (restore_time_us > break_time_us) {
                        dur_us = restore_time_us - break_time_us;
                    } else {
                        dur_us = time_us_64() - break_time_us;
                    }

                    printf("[Trigger #%d] Beam broken! Moving to TRIGGERED.\n",
                           trigger_count);

                    // Store duration before alarm clears the variables
                    uint64_t dur_ms = dur_us / 1000;
                    state = STATE_TRIGGERED;
                    run_alarm(dur_ms);   // Run alarm inline, then fall through to reset
                }
                break;

            // ── TRIGGERED: alarm finished, reset and re-arm ──────────────────
            case STATE_TRIGGERED:
                // Clear the interrupt flags so we're ready for the next event
                beam_broken     = false;
                restore_time_us = 0;
                break_time_us   = 0;

                printf("Alarm complete. Total intrusions so far: %d\n", trigger_count);
                printf("Re-arming now...\n\n");
                sleep_ms(500);

                state = STATE_ARMED;
                break;
        }

        sleep_ms(10);
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **Laser on at boot** — The very first thing the code does is turn on the laser. No gaps where the beam is dark while everything else sets up!

2. **GPIO interrupt** — `gpio_set_irq_enabled_with_callback()` registers `sensor_isr` to run the instant GP2 changes voltage. The ISR records exact microsecond timestamps using `time_us_64()` — the Pico's hardware timer counts in millionths of a second!

3. **Debounce in the ISR** — Physical sensors sometimes flicker. The code ignores any trigger that happens less than 50ms after the last one. This filters out noise so one break doesn't count as five!

4. **`volatile` keyword** — Variables shared between the ISR and the main loop are marked `volatile`. This tells the compiler "always re-read from memory — this can change at any moment!" Without `volatile`, the alarm might never trigger!

5. **State machine** — The main loop switches between `STATE_ARMED` (green LED, watching) and `STATE_TRIGGERED` (alarm running). Easy to add more states later!

6. **Object size detection** — By checking how long the beam was broken (under 100ms vs under 600ms vs longer), the code guesses what caused the break. A quick finger-wave is different from a person walking through!

---

## 🎮 Try It!

1. **Doorway tripwire** — Tape the laser and sensor at the same height on opposite sides of your bedroom door. Walk through and check the serial monitor. How long did your body block the beam?

2. **Speed test** — Break the beam as slowly as you can with one finger, then flick it as fast as possible. What's the shortest duration you can get?

3. **Size comparison** — Block the beam with a pencil, your hand, a book, then your whole body. Write down the time for each. Can you build a table of "object size vs. beam-break time"?

4. **Box alarm** — Set up the laser inside a shoebox so the beam crosses just inside the lid. Put something "valuable" inside. Can your family open the box without triggering the alarm?

---

## 🏆 Challenge

Add a SECOND photo-interrupter on GP3, placed 20 cm from the first along a wall. When beam 1 breaks then beam 2 breaks, calculate speed: `speed = distance / time`. Print "Intruder moving at roughly X cm/s"! Now you have a real speed detection system — like the ones police use on highways!

---

## 📝 Summary

You built a real laser tripwire alarm that reacts in microseconds, counts intrusions, and even estimates what size thing broke the beam! You used GPIO interrupts, learned why `volatile` matters, debounced noisy signals, and built a clean state machine. These are the exact same techniques used in real security systems and factory robots!
