# Lesson 15: Relay Module — Control the Grown-Up Stuff!

## What you'll learn
- What a relay is and why it is like having an electrically-controlled switch
- The difference between the control side and the switched side of a relay
- What NO (Normally Open) and NC (Normally Closed) contacts mean
- How to build a timed switch, a manual toggle, and a secret knock detector

## Parts you'll need
- Raspberry Pi Pico 2 W
- 1-Channel Relay Module (from the Elegoo 37 Kit)
- Button Switch Module (GP14)
- Passive Buzzer Module (GP18)
- A 5V LED with a resistor (to safely test the relay's switched circuit)
- Breadboard and jumper wires
- USB cable

## Background

Your Pico is incredibly smart, but it is also quite small and delicate — its pins only handle tiny amounts of current, way too little to switch on a motor, a string of LEDs, or anything that needs real power. This is where the **relay** comes in! A relay is like hiring a strong grown-up to flip a big light switch for you. You (the Pico) just whisper to the relay "switch on please!" with a tiny 3.3V signal, and the relay — which has its own electromagnet inside — clunks the big switch into position. The relay can switch circuits running at much higher voltages and currents than the Pico ever could.

Inside the relay module there is a coil of wire (the electromagnet) and a springy metal lever (the switch arm). When you send power to the coil, it becomes a magnet and yanks the lever to one position. When you cut power to the coil, the spring snaps it back. The lever connects to three metal contacts: **COM** (Common — always connected to the lever), **NO** (Normally Open — not connected when relay is off, connected when relay is on), and **NC** (Normally Closed — connected when relay is off, disconnected when relay is on). Think of NO as "off by default" and NC as "on by default."

**Safety is really important here!** Relays are often used to switch mains electricity (the kind from wall outlets — 240V in the UK or 120V in the USA). That voltage can kill you. In this lesson we will **only** switch a 5V LED powered from the USB cable — completely safe! If you ever want to use a relay with higher voltages when you are older, always ask a qualified adult to check your wiring first. For now, the Pico's VBUS pin gives us 5V from USB and that is plenty to demonstrate how the relay works.

## Wiring

**Control side (Pico → Relay):**

| Pico Pin | Relay Module Control Side |
|---|---|
| GP15 | S (signal input) |
| VBUS (pin 40) | VCC (relay coil needs 5V — use VBUS from USB) |
| GND | GND |

**Switched circuit (Relay → 5V LED):**

| Relay Terminal | Connection |
|---|---|
| COM | Positive leg of 5V LED (through a 220Ω–330Ω resistor) |
| NO | VBUS (5V from USB) |
| GND of LED | Pico GND |

> **NO = Normally Open:** The LED circuit is **open** (off) until the relay activates. When the Pico sends HIGH to GP15, the relay closes NO and the LED turns on.

**Other modules:**

| Pico Pin | Component |
|---|---|
| GP14 | Button Switch Module — S |
| 3V3 | Button Switch Module — VCC |
| GND | Button Switch Module — GND |
| GP18 | Passive Buzzer Module — S |
| 3V3 | Passive Buzzer Module — VCC |
| GND | Passive Buzzer Module — GND |

> **Tip:** The relay module usually has a small LED on it that lights up when the relay is active, and you will hear a satisfying "click" from the relay coil every time it switches. Listen for it!

## The code

```c
/**
 * Lesson 15: Relay Module — Control the Grown-Up Stuff!
 * Hardware: Raspberry Pi Pico 2 W  |  Language: C, Pico SDK
 *
 * Demonstrates four relay operating modes:
 *   1. Auto-blink: relay toggles every 2 seconds automatically
 *   2. Manual toggle: press button to flip the relay
 *   3. Timed switch: relay on 5s, off 5s, repeating
 *   4. Secret knock: relay only activates after 3 quick button presses
 *
 * Press and hold the button on startup to choose a mode (or cycle through).
 * Wiring:
 *   Relay S    → GP15   (control signal)
 *   Relay VCC  → VBUS   (5V from USB for relay coil)
 *   Button S   → GP14
 *   Buzzer S   → GP18
 *
 * SAFETY: Only switch LOW-VOLTAGE circuits (5V from USB). Never connect
 * mains electricity (120V/240V) without adult supervision and proper safety
 * equipment. The relay can switch it — but YOU should not touch it!
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define RELAY_PIN   15   // HIGH = relay ON (NO contacts closed)
#define BUTTON_PIN  14   // Active LOW (pull-up enabled)
#define BUZZER_PIN  18

// ── Operating modes ───────────────────────────────────────────────────────────
typedef enum {
    MODE_AUTO_BLINK,    // Relay toggles every 2 seconds automatically
    MODE_MANUAL,        // Button press manually toggles the relay
    MODE_TIMED,         // 5 seconds on, 5 seconds off, repeat
    MODE_SECRET_KNOCK   // 3 button presses within 2 seconds = relay ON
} OperatingMode;

// ── Relay helpers ─────────────────────────────────────────────────────────────
void relay_on(void) {
    gpio_put(RELAY_PIN, 1);   // HIGH = activate relay coil = NO contacts close
}

void relay_off(void) {
    gpio_put(RELAY_PIN, 0);   // LOW = deactivate relay coil = NO contacts open
}

bool relay_state = false;

void relay_toggle(void) {
    relay_state = !relay_state;
    gpio_put(RELAY_PIN, relay_state ? 1 : 0);
}

// ── Passive buzzer tone helper ────────────────────────────────────────────────
void buzzer_tone(uint freq_hz, uint duration_ms) {
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint32_t clk = clock_get_hz(clk_sys);
    uint32_t div16 = clk / (freq_hz * 256);
    if (div16 < 16) div16 = 16;
    pwm_set_clkdiv_int_frac(slice, div16 / 16, div16 & 0xF);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(BUZZER_PIN, 128);
    pwm_set_enabled(slice, true);
    sleep_ms(duration_ms);
    pwm_set_enabled(slice, false);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

void buzzer_click(void) {
    buzzer_tone(800, 30);   // Quick click sound
}

void buzzer_success(void) {
    // Ascending "ta-da!" fanfare
    buzzer_tone(523, 80);   // C
    buzzer_tone(659, 80);   // E
    buzzer_tone(784, 80);   // G
    buzzer_tone(1047, 150); // C (high)
}

void buzzer_fail(void) {
    // Descending "womp womp"
    buzzer_tone(400, 100);
    buzzer_tone(300, 150);
}

// ── Mode selection menu ───────────────────────────────────────────────────────
OperatingMode choose_mode(void) {
    printf("\n=== Choose a Mode ===\n");
    printf("Press the button to cycle through modes.\n");
    printf("Hold button for 1 second to SELECT the current mode.\n\n");

    const char *mode_names[4] = {
        "1: Auto-Blink (relay toggles every 2s)",
        "2: Manual Toggle (button flips relay)",
        "3: Timed Switch (5s on, 5s off)",
        "4: Secret Knock (3 quick presses)"
    };

    int current = 0;
    printf("Current mode: %s\n", mode_names[current]);
    buzzer_click();

    bool last_btn = true;
    uint32_t btn_press_start = 0;
    bool holding = false;

    while (true) {
        bool btn = gpio_get(BUTTON_PIN);
        uint32_t now = to_ms_since_boot(get_absolute_time());

        if (last_btn == true && btn == false) {
            // Button just pressed — start timing for hold detection
            btn_press_start = now;
            holding = false;
        }

        if (btn == false && !holding && (now - btn_press_start) > 1000) {
            // Button held for 1 second — SELECT this mode
            holding = true;
            printf(">>> Selected: %s\n\n", mode_names[current]);
            buzzer_success();
            sleep_ms(500);
            return (OperatingMode)current;
        }

        if (last_btn == false && btn == true && !holding) {
            // Button was released quickly (not a hold) — cycle to next mode
            current = (current + 1) % 4;
            printf("Current mode: %s\n", mode_names[current]);
            buzzer_click();
        }

        last_btn = btn;
        sleep_ms(20);
    }
}

// ── MODE 1: Auto-Blink ────────────────────────────────────────────────────────
void run_auto_blink(void) {
    printf("=== Mode 1: Auto-Blink ===\n");
    printf("Relay toggles every 2 seconds. Press button to exit.\n\n");

    uint32_t last_toggle = to_ms_since_boot(get_absolute_time());
    relay_state = false;
    relay_off();

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());

        if ((now - last_toggle) >= 2000) {
            relay_toggle();
            last_toggle = now;
            printf("Relay: %s\n", relay_state ? "ON  ← click!" : "OFF ← click!");
            buzzer_click();
        }

        // Exit if button pressed
        if (!gpio_get(BUTTON_PIN)) {
            sleep_ms(50);   // Simple debounce
            while (!gpio_get(BUTTON_PIN)) {}   // Wait for release
            break;
        }

        sleep_ms(10);
    }

    relay_off();
    relay_state = false;
    printf("Exiting Auto-Blink mode.\n\n");
}

// ── MODE 2: Manual Toggle ─────────────────────────────────────────────────────
void run_manual_toggle(void) {
    printf("=== Mode 2: Manual Toggle ===\n");
    printf("Press button to flip the relay ON or OFF.\n");
    printf("Press and hold 1 second to exit.\n\n");

    relay_state = false;
    relay_off();
    printf("Relay: OFF\n");

    bool last_btn = true;
    uint32_t btn_down_time = 0;
    bool hold_exit = false;

    while (true) {
        bool btn = gpio_get(BUTTON_PIN);
        uint32_t now = to_ms_since_boot(get_absolute_time());

        if (last_btn == true && btn == false) {
            btn_down_time = now;
            hold_exit = false;
        }

        if (btn == false && !hold_exit && (now - btn_down_time) > 1000) {
            hold_exit = true;   // Long press detected — exit mode
            break;
        }

        if (last_btn == false && btn == true && !hold_exit) {
            // Quick press — toggle relay
            relay_toggle();
            printf("Relay: %s\n", relay_state ? "ON  ← relay clicks!" : "OFF ← relay clicks!");
            buzzer_click();
            sleep_ms(50);   // Debounce
        }

        last_btn = btn;
        sleep_ms(20);
    }

    relay_off();
    relay_state = false;
    printf("Exiting Manual Toggle mode.\n\n");
}

// ── MODE 3: Timed Switch ──────────────────────────────────────────────────────
void run_timed_switch(void) {
    printf("=== Mode 3: Timed Switch ===\n");
    printf("Relay ON for 5s, then OFF for 5s, repeating forever.\n");
    printf("Press button to exit.\n\n");

    bool phase_on = true;
    relay_on();
    relay_state = true;
    printf("Relay: ON (5s)\n");

    uint32_t phase_start = to_ms_since_boot(get_absolute_time());

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());

        if ((now - phase_start) >= 5000) {
            phase_start = now;
            phase_on = !phase_on;

            if (phase_on) {
                relay_on();
                relay_state = true;
                printf("Relay: ON (5s)\n");
                buzzer_tone(700, 50);
            } else {
                relay_off();
                relay_state = false;
                printf("Relay: OFF (5s)\n");
                buzzer_tone(400, 50);
            }
        }

        // Exit on button press
        if (!gpio_get(BUTTON_PIN)) {
            sleep_ms(50);
            while (!gpio_get(BUTTON_PIN)) {}
            break;
        }

        sleep_ms(10);
    }

    relay_off();
    relay_state = false;
    printf("Exiting Timed Switch mode.\n\n");
}

// ── MODE 4: Secret Knock ──────────────────────────────────────────────────────
// Relay activates only if button is pressed 3 times within 2 seconds.
void run_secret_knock(void) {
    printf("=== Mode 4: Secret Knock ===\n");
    printf("Press the button 3 times quickly (within 2 seconds) to unlock!\n");
    printf("Press and hold 1 second to exit.\n\n");

    relay_off();
    relay_state = false;

    int  knock_count    = 0;
    uint32_t first_knock_time = 0;
    bool last_btn       = true;
    bool hold_exit      = false;
    uint32_t btn_down   = 0;

    const int    KNOCK_REQUIRED  = 3;
    const uint32_t KNOCK_WINDOW  = 2000;   // 2 seconds to get all 3 knocks
    const uint32_t UNLOCK_TIME   = 5000;   // Relay stays on 5 seconds after unlock

    while (true) {
        bool btn = gpio_get(BUTTON_PIN);
        uint32_t now = to_ms_since_boot(get_absolute_time());

        // Check for hold-to-exit
        if (last_btn == true && btn == false) {
            btn_down  = now;
            hold_exit = false;
        }
        if (btn == false && !hold_exit && (now - btn_down) > 1000) {
            hold_exit = true;
            break;
        }

        // Detect quick button press (rising edge = released)
        if (last_btn == false && btn == true && !hold_exit) {
            uint32_t press_duration = now - btn_down;

            if (press_duration < 800) {
                // Count this as a knock only if it was a short press
                knock_count++;
                printf("Knock #%d!\n", knock_count);
                buzzer_tone(600 + knock_count * 100, 40);   // Rising pitch per knock

                if (knock_count == 1) {
                    first_knock_time = now;   // Start the 2-second window
                }

                // Check if knock window expired for knock 2+
                if (knock_count > 1 && (now - first_knock_time) > KNOCK_WINDOW) {
                    printf("Too slow! Window expired. Starting over.\n");
                    buzzer_fail();
                    knock_count = 0;
                }

                // Success check
                if (knock_count >= KNOCK_REQUIRED &&
                    (now - first_knock_time) <= KNOCK_WINDOW) {
                    printf("*** SECRET KNOCK ACCEPTED! Relay ON for 5 seconds! ***\n");
                    buzzer_success();
                    relay_on();
                    relay_state = true;
                    sleep_ms(UNLOCK_TIME);
                    relay_off();
                    relay_state = false;
                    printf("Relay OFF. Knock again to unlock!\n\n");
                    knock_count = 0;
                }
            }
        }

        // Check if window expired and we have at least one knock already
        if (knock_count > 0) {
            uint32_t now2 = to_ms_since_boot(get_absolute_time());
            if ((now2 - first_knock_time) > KNOCK_WINDOW && knock_count < KNOCK_REQUIRED) {
                printf("Window expired (%d/%d knocks). Too slow! Try again.\n",
                       knock_count, KNOCK_REQUIRED);
                buzzer_fail();
                knock_count = 0;
            }
        }

        last_btn = btn;
        sleep_ms(20);
    }

    relay_off();
    relay_state = false;
    printf("Exiting Secret Knock mode.\n\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    printf("=== Lesson 15: Relay Module ===\n");
    printf("SAFETY REMINDER: Only switch 5V low-voltage circuits in this lesson!\n");
    printf("Never connect mains electricity (120V/240V) without adult help.\n\n");

    // ── Pin setup ─────────────────────────────────────────────────────────────
    gpio_init(RELAY_PIN);
    gpio_set_dir(RELAY_PIN, GPIO_OUT);
    gpio_put(RELAY_PIN, 0);   // Start with relay OFF

    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);   // Active LOW

    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);

    printf("Relay pin: GP%d  |  Button: GP%d  |  Buzzer: GP%d\n\n",
           RELAY_PIN, BUTTON_PIN, BUZZER_PIN);

    // ── Startup sound ──────────────────────────────────────────────────────────
    buzzer_tone(440, 100);
    buzzer_tone(880, 100);

    // ── Main mode selection loop ───────────────────────────────────────────────
    while (true) {
        OperatingMode mode = choose_mode();

        switch (mode) {
            case MODE_AUTO_BLINK:   run_auto_blink();    break;
            case MODE_MANUAL:       run_manual_toggle(); break;
            case MODE_TIMED:        run_timed_switch();  break;
            case MODE_SECRET_KNOCK: run_secret_knock();  break;
        }

        printf("Returning to mode selection...\n");
        sleep_ms(500);
    }
}
```

### How the code works

1. **Relay control is just a GPIO output** — `gpio_put(RELAY_PIN, 1)` sends HIGH to the relay module's signal pin, which activates the electromagnet inside the relay and snaps the NO contacts closed. `gpio_put(RELAY_PIN, 0)` deactivates it. That is all the Pico needs to do — the relay module handles the rest including protecting the Pico from the relay coil's back-EMF (a voltage spike that happens when coils switch off, which could damage the Pico without the protection diode on the module).

2. **Mode selection using hold-vs-tap** — The mode selector distinguishes between a short button tap (cycle to next mode) and a long press held for one second (select current mode). It does this by recording the time when the button was first pressed (`btn_down_time`) and comparing against the current time on each loop. This "long press" technique is used in almost every device with a single button!

3. **Auto-Blink mode** — Uses `to_ms_since_boot()` to track elapsed time without using `sleep_ms()`. This means the button check still runs every 10 ms even while waiting for the 2-second toggle interval — a pattern called non-blocking timing that you will use in many future projects.

4. **Timed Switch mode** — Works the same way as Auto-Blink but with a 5-second phase. The `phase_on` boolean alternates between ON and OFF each time the timer expires. The buzzer plays different pitches for ON and OFF phases so you can hear the switch without watching the serial monitor.

5. **Secret Knock mode** — Records the time of the first knock (`first_knock_time`). Every subsequent knock checks whether the 2-second window (from the first knock) has expired. If you knock three times within the window, the relay activates for 5 seconds. If the window expires before reaching three knocks, the counter resets and buzzer plays a "fail" sound. The buzzer pitch rises with each successful knock for satisfying audio feedback.

6. **NO vs NC explained in code** — The code always uses the NO (Normally Open) terminal. When `gpio_put(RELAY_PIN, 1)` fires, the relay closes the NO contact and power flows through the switched circuit. If you instead wired to the NC (Normally Closed) terminal, the LED would be ON at startup and turn OFF when the Pico activates the relay — useful for fail-safe systems that should stay ON unless told otherwise.

## Try it

1. **Listen to the relay** — In Auto-Blink mode, put your ear close to the relay module. Can you hear the "click-click" of the electromagnetic lever switching? That mechanical sound is the metal arm moving. This is why relays are not great for things that need to switch thousands of times — they eventually wear out mechanically.

2. **NO vs NC swap** — Wire your 5V LED to the NC terminal instead of NO. Upload the code and try Auto-Blink mode. Is the LED behavior reversed (on when relay is off, off when relay is on)? Now you understand Normally Closed!

3. **Secret knock timing** — Try the Secret Knock mode. How fast do you have to knock? Slow down deliberately until you fail. Change `KNOCK_WINDOW` from 2000 to 3000 — is it easier? Change it to 1000 — is it harder?

4. **Timed switch observation** — In Timed Switch mode, watch the relay LED on the module (not your 5V LED). It should flash in perfect 5-second intervals. Use your phone's stopwatch to check whether it is accurate. Compare it to `sleep_ms(5000)` — is `to_ms_since_boot()` more or less accurate? (Hint: it is more accurate because `sleep_ms` can drift from other code running.)

## Challenge

Build a **Plant Watering Timer!** Imagine the relay is controlling a small USB-powered water pump (ask an adult to help you find one online — they cost less than a dollar). The secret knock (or a button press) starts a "watering cycle": the relay turns on for exactly 3 seconds, then off. But here is the clever bit — use the `time_us_64()` timer to also track total runtime so you can print "Your plant has been watered for X seconds total today!" to serial. Add a daily reset: if the Pico has been running for more than 86400 seconds (24 hours), print "Good morning! New day — reset watering counter" and zero the total. You have just designed a real home automation system!

## Summary

A relay is an electromagnetic switch that lets a tiny 3.3V Pico signal control circuits running at much higher voltages and currents — like having the Pico whisper instructions to a strong grown-up who flips the heavy switch. The NO (Normally Open) contact is off by default and closes when activated; NC (Normally Closed) is on by default and opens when activated. With four different operating modes in one program, you have seen how the same hardware can be made to behave in completely different ways just by changing the software logic!
