# Tilt Alarm — Don't Touch My Stuff!

## What you'll learn
- How to use GPIO interrupts to detect sensor events instantly
- How interrupt service routines (ISRs) and flags work together safely
- How to build a multi-state alarm system (armed, alarming, disarmed)
- How to implement a "secret disarm sequence" using timed taps
- How to drive an active buzzer in patterns using code timing
- How tilt and shock sensors detect physical movement

## Parts you'll need
- Raspberry Pi Pico 2 W — the brain of your alarm (~$6.00)
- Tilt Switch Module (from Elegoo 37 Sensor Kit) — detects tilting (~$0.50)
- Shock Switch Module (from Elegoo 37 Sensor Kit) — detects bumps (~$0.50)
- Active Buzzer Module (from Elegoo 37 Sensor Kit) — the alarm sound (~$0.50)
- RGB LED Module (from Elegoo 37 Sensor Kit) — shows alarm status (~$0.50)
- Breadboard — holds everything together (~$2.00)
- Jumper wires — connects the parts (~$1.00)

**Total: ≈ $11.00**

## Background

The world's finest museums — the Louvre in Paris, the Smithsonian in Washington DC — spend millions of dollars protecting their priceless art. One of the most important tools they use is the tilt sensor. A tiny sensor hidden underneath a painting or sculpture detects if it's been moved, tilted, or bumped, and instantly triggers a silent alarm that alerts security guards. Window and door alarm systems work the same way — the sensor knows when a window is opened because it tilts or moves from its resting position.

Your shock switch (also called a vibration sensor) works slightly differently — it detects rapid impacts and vibrations, like someone bumping into the shelf your box is sitting on. Museums combine multiple sensor types because different attack approaches might trigger one sensor but not another. Having both a tilt sensor AND a shock sensor makes your alarm much harder to fool — you'd have to move the box incredibly slowly AND not bump it. That combination of sensors is called **redundancy**, and it's a core principle of security engineering!

You're going to build a "don't touch my stuff" alarm for your bedroom. Attach it to your pencil case, LEGO collection, secret snack stash — whatever needs protecting. When armed, the LED blinks slow green. If someone tilts OR bumps the protected object, the alarm goes off: the LED flashes red and the buzzer beeps an urgent pattern. To disarm it (and prove it's really you), you tap the tilt sensor three times quickly in a secret knock pattern. Anyone who doesn't know the code can't stop the alarm!

## Wiring

| From | To | Notes |
|------|----|-------|
| Tilt Switch Module **S** | Pico **GP2** | Goes HIGH when tilted |
| Tilt Switch Module **VCC** | Pico **3V3** | 3.3 V power |
| Tilt Switch Module **GND** | Pico **GND** | Ground |
| Shock Switch Module **S** | Pico **GP3** | Goes HIGH when bumped/vibrated |
| Shock Switch Module **VCC** | Pico **3V3** | 3.3 V power |
| Shock Switch Module **GND** | Pico **GND** | Ground |
| Active Buzzer Module **S** | Pico **GP15** | HIGH = buzzer on, LOW = off |
| Active Buzzer Module **VCC** | Pico **3V3** | 3.3 V power |
| Active Buzzer Module **GND** | Pico **GND** | Ground |
| RGB LED Module **R** | Pico **GP9** | Red channel — PWM |
| RGB LED Module **G** | Pico **GP10** | Green channel — PWM |
| RGB LED Module **B** | Pico **GP11** | Blue channel — PWM |
| RGB LED Module **GND** | Pico **GND** | Ground (common cathode) |

> **Note:** The active buzzer buzzes automatically at a fixed tone whenever S is HIGH — unlike the passive buzzer, you don't need PWM. Just toggle the pin HIGH/LOW to make beep patterns!

## The code

```c
/**
 * Project 4: Tilt Alarm — Don't Touch My Stuff!
 * ================================================
 * Two-sensor alarm system using interrupts.
 *   ARMED:    LED blinks slow green
 *   ALARMING: LED flashes red + buzzer beeps urgent pattern
 *
 * Secret disarm: tap the tilt sensor 3 times within 3 seconds.
 *
 * Hardware:
 *   Tilt Switch:   S → GP2, VCC → 3V3, GND → GND
 *   Shock Switch:  S → GP3, VCC → 3V3, GND → GND
 *   Active Buzzer: S → GP15, VCC → 3V3, GND → GND
 *   RGB LED:       R → GP9, G → GP10, B → GP11, GND → GND
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define TILT_PIN    2    // Tilt switch signal
#define SHOCK_PIN   3    // Shock/vibration switch signal
#define BUZZER_PIN 15    // Active buzzer (HIGH = on, LOW = off)
#define LED_R_PIN   9    // RGB LED red (PWM)
#define LED_G_PIN  10    // RGB LED green (PWM)
#define LED_B_PIN  11    // RGB LED blue (PWM)

// ── Timing constants ──────────────────────────────────────────────────────────
#define TRIGGER_LOCKOUT_MS   500   // Ignore new triggers for 500ms after alarm starts
                                   // (prevents the same bump triggering a thousand times)
#define DISARM_TAP_WINDOW_MS 3000  // Must complete 3 disarm taps within this time
#define DISARM_TAP_LOCKOUT_MS 200  // Min time between disarm taps (debounce)
#define DISARM_TAPS_NEEDED    3    // Number of taps to disarm

// ── Alarm states ──────────────────────────────────────────────────────────────
typedef enum {
    STATE_ARMED    = 0,   // Watching for intruders, LED blinks green
    STATE_ALARMING = 1,   // Alarm triggered! LED red, buzzer beeping
} AlarmState;

// ── Global state (modified by ISR, read by main loop) ────────────────────────
// volatile tells the compiler "this can change at any time — always re-read it!"
static volatile bool alarm_triggered = false;   // ISR sets this; main loop reads it
static volatile uint32_t last_trigger_ms = 0;   // When the last trigger happened

// ── Current alarm state ───────────────────────────────────────────────────────
static AlarmState state = STATE_ARMED;

// ─────────────────────────────────────────────────────────────────────────────
// LED and buzzer helpers
// ─────────────────────────────────────────────────────────────────────────────
void setup_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
}

void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, r);
    pwm_set_gpio_level(LED_G_PIN, g);
    pwm_set_gpio_level(LED_B_PIN, b);
}

void led_off(void)   { set_rgb(0, 0, 0);        }
void led_green(void) { set_rgb(0, 200, 0);       }
void led_red(void)   { set_rgb(255, 0, 0);       }
void led_yellow(void){ set_rgb(200, 150, 0);     }   // Used for "disarming..."

void buzzer_on(void)  { gpio_put(BUZZER_PIN, 1); }
void buzzer_off(void) { gpio_put(BUZZER_PIN, 0); }

// ─────────────────────────────────────────────────────────────────────────────
// gpio_callback()
// This is the Interrupt Service Routine (ISR) — it runs automatically
// whenever GP2 (tilt) or GP3 (shock) sees a rising edge (LOW → HIGH).
//
// ISRs must be SHORT and FAST. We only set a flag here and note the time.
// The main loop does all the heavy work.
//
// Think of an ISR like a fire alarm pull station — when someone pulls it,
// it just rings a bell. The firefighters (main loop) decide what to do next!
// ─────────────────────────────────────────────────────────────────────────────
void gpio_callback(uint gpio, uint32_t events) {
    uint32_t now_ms = to_ms_since_boot(get_absolute_time());

    // Only trigger if we're in ARMED state and not in lockout
    if (state == STATE_ARMED) {
        if (now_ms - last_trigger_ms > TRIGGER_LOCKOUT_MS) {
            alarm_triggered  = true;
            last_trigger_ms  = now_ms;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// init_hardware()
// Sets up all pins: inputs with interrupts, buzzer output, LED PWM.
// ─────────────────────────────────────────────────────────────────────────────
void init_hardware(void) {
    // Tilt switch: input, no pull (module drives the pin)
    gpio_init(TILT_PIN);
    gpio_set_dir(TILT_PIN, GPIO_IN);

    // Shock switch: input, no pull
    gpio_init(SHOCK_PIN);
    gpio_set_dir(SHOCK_PIN, GPIO_IN);

    // Active buzzer: output
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    buzzer_off();

    // RGB LED: PWM output
    setup_pwm_pin(LED_R_PIN);
    setup_pwm_pin(LED_G_PIN);
    setup_pwm_pin(LED_B_PIN);
    led_off();

    // Set up interrupts on both sensor pins (trigger on rising edge: LOW→HIGH)
    // Both pins share the same callback function — gpio param tells us which one.
    gpio_set_irq_enabled_with_callback(TILT_PIN,  GPIO_IRQ_EDGE_RISE, true, &gpio_callback);
    gpio_set_irq_enabled_with_callback(SHOCK_PIN, GPIO_IRQ_EDGE_RISE, true, &gpio_callback);
}

// ─────────────────────────────────────────────────────────────────────────────
// beep_alarm_pattern()
// Plays one cycle of the alarm buzzer pattern: 3 short beeps.
// Called repeatedly while the alarm is active.
// This is non-blocking — it uses small sleeps but returns quickly.
// ─────────────────────────────────────────────────────────────────────────────
void beep_alarm_pattern(void) {
    for (int i = 0; i < 3; i++) {
        buzzer_on();
        sleep_ms(80);
        buzzer_off();
        sleep_ms(80);
    }
    sleep_ms(200);   // Pause between pattern repeats
}

// ─────────────────────────────────────────────────────────────────────────────
// check_disarm_sequence()
// Watches for the secret disarm code: 3 taps on the tilt sensor within
// DISARM_TAP_WINDOW_MS milliseconds.
//
// Returns true if the correct sequence is detected (disarm!), false otherwise.
//
// While waiting, we keep the alarm buzzing and the LED flashing red so we
// look really scary to any intruder who doesn't know the code!
// ─────────────────────────────────────────────────────────────────────────────
bool check_disarm_sequence(void) {
    uint8_t tap_count    = 0;
    uint32_t window_start = to_ms_since_boot(get_absolute_time());
    uint32_t last_tap_ms  = 0;

    printf("Alarm active! Tap tilt sensor 3x to disarm...\n");

    while (true) {
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());
        uint32_t elapsed = now_ms - window_start;

        // Time window expired without 3 taps — failed
        if (elapsed > DISARM_TAP_WINDOW_MS) {
            printf("Disarm window expired (%lu ms). Still alarming!\n",
                   (unsigned long)elapsed);
            return false;
        }

        // Check tilt sensor for a tap
        if (gpio_get(TILT_PIN)) {
            if (now_ms - last_tap_ms > DISARM_TAP_LOCKOUT_MS) {
                tap_count++;
                last_tap_ms = now_ms;
                printf("Disarm tap %u of %u!\n", tap_count, DISARM_TAPS_NEEDED);
                led_yellow();   // Flash yellow for each tap (feedback!)
                sleep_ms(100);
                led_red();

                if (tap_count >= DISARM_TAPS_NEEDED) {
                    return true;   // Correct sequence!
                }
            }
        }

        // Keep the alarm going while we wait
        buzzer_on();
        sleep_ms(60);
        buzzer_off();
        sleep_ms(60);

        // Flash red LED
        led_red();
        sleep_ms(50);
        led_off();
        sleep_ms(50);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// run_armed_state()
// Handles the ARMED state: slow green LED blink while watching for triggers.
// Returns when the alarm is triggered (alarm_triggered flag goes true).
// ─────────────────────────────────────────────────────────────────────────────
void run_armed_state(void) {
    printf("System ARMED. LED: slow green blink. Watching...\n");
    uint32_t blink_timer = 0;
    bool     led_on_flag = false;

    while (!alarm_triggered) {
        uint32_t now_ms = to_ms_since_boot(get_absolute_time());

        // Toggle LED every 1000ms (slow blink)
        if (now_ms - blink_timer >= 1000) {
            blink_timer = now_ms;
            led_on_flag = !led_on_flag;
            if (led_on_flag) led_green();
            else             led_off();
        }

        sleep_ms(10);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// run_alarming_state()
// Handles the ALARMING state: red + buzzer, wait for disarm attempt.
// Returns when successfully disarmed.
// ─────────────────────────────────────────────────────────────────────────────
void run_alarming_state(void) {
    printf("!! ALARM TRIGGERED !! Someone touched your stuff!\n");
    state = STATE_ALARMING;

    // Keep alarming until disarmed
    while (true) {
        // Play one alarm beep pattern and check for disarm
        beep_alarm_pattern();
        led_red();

        // Every few beep cycles, give a chance to check the disarm window
        // (check_disarm_sequence blocks for up to DISARM_TAP_WINDOW_MS ms)
        bool disarmed = check_disarm_sequence();
        if (disarmed) {
            printf("** Correct sequence! System disarmed. **\n");
            buzzer_off();
            // Victory flash: 3 quick green blinks
            for (int i = 0; i < 3; i++) {
                led_green();  sleep_ms(150);
                led_off();    sleep_ms(150);
            }
            return;   // Exit alarming state
        }
        // Wrong / no disarm attempt — keep alarming
        printf("Disarm failed. Still alarming!\n");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// ─────────────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    printf("=========================================\n");
    printf("  Tilt Alarm -- Project 4               \n");
    printf("=========================================\n");
    printf("System starting up...\n");
    printf("Tip: place the tilt sensor gently before arming!\n\n");

    init_hardware();

    // Give a 3-second setup window so you can set it down without triggering it
    printf("Arming in 3 seconds — set it down carefully!\n");
    for (int i = 3; i > 0; i--) {
        printf("%d...\n", i);
        led_yellow();  sleep_ms(500);
        led_off();     sleep_ms(500);
    }

    // ── Main state machine loop ───────────────────────────────────────────────
    while (true) {
        // Reset for next armed cycle
        alarm_triggered = false;
        state           = STATE_ARMED;

        // Wait in armed state until something triggers the alarm
        run_armed_state();

        // Something triggered! Go into alarm mode
        run_alarming_state();

        // After successful disarm, re-arm with 3-second delay
        printf("Re-arming in 3 seconds...\n");
        for (int i = 3; i > 0; i--) {
            printf("%d...\n", i);
            led_yellow();  sleep_ms(500);
            led_off();     sleep_ms(500);
        }
    }

    return 0;
}
```

## How the code works

1. **GPIO interrupts** — `gpio_set_irq_enabled_with_callback()` tells the Pico's hardware to watch GP2 and GP3 for a rising edge (the moment the pin goes from LOW to HIGH). When that happens, the processor immediately stops what it's doing and runs `gpio_callback()` — no matter what the main loop was doing! This means the alarm can trigger even if the main loop is in the middle of a `sleep_ms()`.

2. **ISR flag pattern** — The `gpio_callback()` ISR is intentionally tiny: it just sets `alarm_triggered = true`. The heavy work (running the alarm state, playing sounds) happens in the main loop. This is the correct way to use interrupts — ISRs must be as short as possible because they block everything else while they run. Think of the ISR as the "fire pull station" and the main loop as the "fire department."

3. **`volatile` keyword** — The `volatile bool alarm_triggered` declaration tells the compiler not to cache this variable in a register. Because an ISR can change it at any time, the main loop must always read it fresh from memory. Without `volatile`, the compiler might "optimize" the check away entirely — a nasty bug!

4. **Trigger lockout** — `TRIGGER_LOCKOUT_MS = 500` prevents the same physical event (one bump) from triggering many interrupts. A bump can cause the switch to bounce on and off several times in milliseconds — the lockout time ensures only the first detection counts.

5. **State machine** — The system has two states: `STATE_ARMED` and `STATE_ALARMING`. `run_armed_state()` handles one, `run_alarming_state()` handles the other. The main loop transitions between them when events occur. This pattern (a state machine) is used in almost every piece of embedded software in the world!

6. **Disarm sequence** — `check_disarm_sequence()` starts a 3-second countdown window and counts taps on the tilt sensor. Each tap gets yellow LED feedback. If 3 taps arrive within 3 seconds, the alarm disarms. Otherwise, the loop in `run_alarming_state()` calls it again for another attempt — the alarm keeps going until you get it right!

## Try it

1. **Test the sensors** — Open the serial monitor. Gently tilt the tilt sensor while watching for the "ALARM TRIGGERED" message. Then try bumping the table while the shock sensor is connected. Both should trigger the alarm.

2. **Practice the disarm code** — Trigger the alarm on purpose, then practice the 3-tap disarm. You have 3 seconds! Watch the yellow flashes confirm each tap. Can you get the timing right every time?

3. **Change the disarm tap count** — Change `#define DISARM_TAPS_NEEDED 3` to `5`. Now your secret code is five taps! Or change the window to `5000` ms to give yourself more time to enter the code.

4. **Adjust re-arm delay** — Change the countdown from 3 to 10 seconds if you need more time to set it down after re-arming. Or make it 1 second if you're feeling confident!

## Challenge

Right now the disarm code is always "3 taps." Make it a configurable **secret pattern** — not just a count, but a specific pattern of quick and slow taps. For example: "tap ... tap-tap" (one tap, pause, two quick taps). To detect this, you'd need to measure the time between each tap and compare it to a stored pattern. Hint: record the time gap between each consecutive tap into an array, then check if the gaps match a pattern like `[long, short, short]`. This turns your tilt sensor into a Morse code input device!

## Summary

You built a two-sensor security alarm that uses GPIO interrupts to detect tilt and vibration events, runs a state machine between armed and alarming states, and requires a secret 3-tap pattern on the tilt sensor to disarm. You learned the important programming pattern of using ISR flags with `volatile`, and how state machines organize complex behaviors in embedded code.

## How this fits the Smart Home

Security is one of the biggest reasons people build smart homes. Professional home security systems from companies like Ring, SimpliSafe, and ADT use exactly these same techniques: multiple sensor types for redundancy, state machines for armed/alarmed/disarmed modes, and secret codes to disarm. Your next upgrades could include sending a Wi-Fi alert when the alarm triggers (the Pico 2 W has built-in Wi-Fi!) or logging alarm events with timestamps. You're building the foundation of a real security system!
