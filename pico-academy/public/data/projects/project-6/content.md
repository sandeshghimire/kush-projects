# Project 6: Laser Tripwire Alarm — The Invisible Security Beam

## What you'll learn
- How to combine a laser module and a photo-interrupter to create an invisible security beam
- How GPIO interrupts let your Pico react to events instantly, without checking in a loop
- How to measure time precisely using `time_us_64()` to detect how long a beam stays broken
- How to build a state machine with ARMED and TRIGGERED states

---

## Parts you'll need

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

## Background

Have you ever watched a heist movie where a thief creeps through a museum, carefully dodging a web of glowing laser beams to steal a famous painting? If they even brush one beam, the alarm blares and guards come running. That classic spy-movie gadget is exactly what you are building right now — and the physics behind yours is completely real!

Your setup uses a laser module that shines a bright red dot across a doorway, a box lid, or a drawer gap. On the other side sits the photo-interrupter module, which is always watching for that dot of light. The moment someone's hand — or a sneaky little sibling — walks through and blocks the beam, the sensor notices in microseconds and the alarm goes off. The photo-interrupter module from your Elegoo kit has a tiny infrared LED and a receiver built right into a U-shaped slot, so you can also use it solo (without the laser) to detect objects passing through that slot. But aiming the separate red laser module across the room at the receiver gives you a much longer range, just like in the movies.

The secret ingredient that makes this alarm so fast is a **GPIO interrupt**. Instead of your Pico constantly asking "is the beam broken? is it broken? how about now?" in a tight loop, an interrupt is like setting a mousetrap — the Pico does other things, and the instant the pin changes voltage, the trap snaps and a special function called the ISR (Interrupt Service Routine) runs immediately. This is exactly how professional burglar alarms and factory safety sensors work. You will also measure how long the beam stays broken, which turns your tripwire into a rough object-size detector — a quick hand-wave barely registers, while a walking person blocks it for much longer.

---

## Wiring

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

## The code

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

## How the code works

1. **Laser on at boot:** The very first thing the code does is pull GP15 HIGH, turning on the laser. This way there is no gap where the beam is dark while the rest of the hardware sets up.

2. **GPIO interrupt with `sensor_isr`:** Instead of checking the sensor in the main loop, `gpio_set_irq_enabled_with_callback()` registers a function (`sensor_isr`) that runs automatically the instant GP2 changes voltage. The ISR records precise microsecond timestamps using `time_us_64()` — a hardware timer on the Pico that counts in millionths of a second.

3. **Debounce in the ISR:** Physical sensors sometimes flicker. The check `if (now - last_irq_us < DEBOUNCE_US) return;` ignores any trigger that happens less than 50 ms after the last one, which filters out noise and bouncing contacts.

4. **`volatile` keyword:** Variables shared between the ISR and the main loop are marked `volatile`. This tells the compiler "never cache this in a register — always re-read from memory, because it could change at any moment." Without `volatile`, the compiler might optimise away the check and the alarm would never trigger.

5. **State machine:** The `while(true)` main loop switches between `STATE_ARMED` (green LED, watching) and `STATE_TRIGGERED` (runs the alarm, then resets). This clean structure makes it easy to add new states later — like a countdown before arming, or a keypad override.

6. **Object size from duration:** By comparing how long the beam stayed broken (under 100 ms vs. under 600 ms vs. longer) the code prints a guess about what caused the break. A finger moving fast is different from a person walking through slowly.

---

## Try it

1. **Basic doorway tripwire:** Tape the laser and sensor at the same height on opposite sides of your bedroom door. Open the serial monitor, then walk through normally. How long does the monitor say your body blocked the beam?

2. **Speed test:** Break the beam as slowly as you can with one finger, then as fast as you can with a quick flick. What is the shortest duration you can achieve?

3. **Size comparison:** Try blocking the beam with: a pencil, your hand flat, a book, then your whole body. Write down the duration for each. Can you build a table of "object size vs. beam-break time"?

4. **Box alarm:** Set up the laser and sensor inside a shoebox so the beam crosses just inside the lid. Put something "valuable" inside (a snack, maybe). See if your family can open the box without triggering the alarm!

---

## Challenge

**Moving intruder tracker:** Add a second photo-interrupter on a different GPIO pin (GP3, say) and place it a fixed distance (e.g., 20 cm) from the first one along a hallway wall. When beam 1 breaks and then beam 2 breaks shortly after, calculate the approximate speed: `speed = distance / time`. Print "Intruder moving at roughly X cm/s" to the serial monitor. Now you have a basic speed-detection system — like the ones police use to measure vehicle speed on highways!

---

## Summary

You built a real interrupt-driven laser tripwire alarm that reacts in microseconds, counts intrusions, and estimates object size from beam-break duration. You learned how GPIO interrupts work, why `volatile` matters, how to debounce noisy signals in an ISR, and how to structure code with a clean state machine. These are professional-grade embedded programming techniques used in security systems, factory robots, and medical devices every day.

---

## How this fits the Smart Home

Every serious smart home security system — from Ring doorbells to commercial burglar alarms — uses some form of beam-breaking or motion detection to protect the perimeter. Your laser tripwire is the sixth piece of your smart home, adding invisible perimeter security to a house that already has automatic lighting (P1), a musical doorbell (P2), clap-controlled lights (P3), window and drawer alarms (P4), and fire detection (P5). Together these projects cover lighting, entry alerts, environmental sensing, and now perimeter security — a genuinely complete smart home foundation!
