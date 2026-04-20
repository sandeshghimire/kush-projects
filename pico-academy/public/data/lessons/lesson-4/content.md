# Active Buzzer Module — Make Some Noise!

## What you'll learn
- The difference between an active buzzer and a passive buzzer
- How to control the Active Buzzer Module with simple GPIO on/off
- How to create patterns and rhythms using `sleep_ms()`
- How to send SOS in Morse code
- How to combine the button from Lesson 3 with the buzzer to make a doorbell

## Parts you'll need
- Raspberry Pi Pico 2 W (~$6)
- Elegoo 37 Sensor Kit — **Active Buzzer Module** (~$1, included in kit)
- Elegoo 37 Sensor Kit — **Button Switch Module** (from Lesson 3, included in kit)
- 6× jumper wires (~$0.60)

## Background

So far your projects have been silent. Not any more! In this lesson you're going to make your Pico speak — well, buzz — using the **Active Buzzer Module** from your Elegoo kit. Get ready to annoy everyone in the house!

An "active" buzzer has a tiny oscillator circuit built right inside it. An oscillator is like a little engine that vibrates the buzzer back and forth very fast, making that familiar BZZZZZ sound. Because the engine is already inside, all YOU have to do is switch the power on or off — exactly the same as controlling an LED! Set the pin HIGH and it buzzes. Set it LOW and it stops. It's that simple. No PWM, no frequencies, no complicated maths. Just on and off.

Compare that to a "passive" buzzer (which you'll use in Lesson 5): a passive buzzer has NO built-in engine. It needs you to rapidly switch the pin on and off yourself to create the vibration — which means you control the pitch. It's like the difference between a toy that plays one fixed note when you press a button (active!) versus a real musical instrument that you have to actually *play* to get a sound out (passive). The active buzzer only plays one fixed note, but it is way easier to get started with. One note is enough to make a very satisfying BEEP!

The Active Buzzer Module has three pins: **S** (Signal), **VCC**, and **GND** — the same layout as the Button Switch Module from Lesson 3. The module runs happily on 3.3V from the Pico.

## Wiring

| Pico Pin | Active Buzzer Module Pin |
|----------|--------------------------|
| GP15 | S (Signal) |
| 3V3 | VCC |
| GND | GND |

**Also connect the Button Switch Module from Lesson 3:**

| Pico Pin | Button Switch Module Pin |
|----------|--------------------------|
| GP14 | S (Signal) |
| 3V3 | VCC |
| GND | GND |

Make sure both modules share the same 3V3 and GND rails on your breadboard. If your breadboard has a red (+) and blue (−) power rail on each side, connect the Pico's 3V3 to the red rail and GND to the blue rail, then plug all VCC and GND wires into those rails. Tidy!

## The code

```c
#include "pico/stdlib.h"
#include <stdbool.h>

// -----------------------------------------------
// Lesson 4: Active Buzzer Module — Make Some Noise!
// SOS Morse code + a doorbell using the button.
// -----------------------------------------------

#define BUZZER_PIN  15    // S pin of Active Buzzer Module
#define BUTTON_PIN  14    // S pin of Button Switch Module

// =============================================
// Morse code helper functions
// "Dot" = short beep, "Dash" = long beep
// =============================================

#define DOT_MS    150    // A dot lasts 150ms
#define DASH_MS   450    // A dash lasts 3x as long as a dot
#define GAP_MS    150    // Gap between dots/dashes in the same letter
#define LETTER_GAP_MS  400   // Gap between letters

// Make a short BEEP (dot)
void dot(void) {
    gpio_put(BUZZER_PIN, 1);   // BUZZER ON — let's go!
    sleep_ms(DOT_MS);
    gpio_put(BUZZER_PIN, 0);   // Quiet...
    sleep_ms(GAP_MS);
}

// Make a long BEEEEEP (dash)
void dash(void) {
    gpio_put(BUZZER_PIN, 1);   // BUZZER SCREAMS!
    sleep_ms(DASH_MS);
    gpio_put(BUZZER_PIN, 0);   // And... scene.
    sleep_ms(GAP_MS);
}

// Pause between letters
void letter_gap(void) {
    sleep_ms(LETTER_GAP_MS);
}

// Pause between words
void word_gap(void) {
    sleep_ms(LETTER_GAP_MS * 2);
}

// =============================================
// SOS in Morse Code:  . . .   _ _ _   . . .
// =============================================
void sos(void) {
    // S = dot dot dot
    dot(); dot(); dot();
    letter_gap();

    // O = dash dash dash
    dash(); dash(); dash();
    letter_gap();

    // S = dot dot dot
    dot(); dot(); dot();

    // Long pause before repeating
    word_gap();
}

// =============================================
// Doorbell sound: two quick beeps
// =============================================
void doorbell(void) {
    // First chime: HIGH note (just a longer beep)
    gpio_put(BUZZER_PIN, 1);   // DING!
    sleep_ms(300);
    gpio_put(BUZZER_PIN, 0);
    sleep_ms(150);

    // Second chime: slightly shorter (the DONG)
    gpio_put(BUZZER_PIN, 1);   // dong.
    sleep_ms(200);
    gpio_put(BUZZER_PIN, 0);
    sleep_ms(500);
}

// =============================================
// A fun alarm pattern: rising urgency!
// =============================================
void alarm(void) {
    for (int i = 0; i < 5; i++) {
        gpio_put(BUZZER_PIN, 1);    // BEEP!
        sleep_ms(100);
        gpio_put(BUZZER_PIN, 0);    // ...
        sleep_ms(100);              // Gaps get shorter each time = more urgent!
    }
    sleep_ms(400);
}

int main() {
    // Set up the buzzer pin as output
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);    // Start silent — don't surprise anyone!

    // Set up the button pin as input
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    bool last_button = false;

    // Play SOS three times on startup, then switch to doorbell mode
    for (int i = 0; i < 3; i++) {
        sos();
    }

    // Now wait for button presses to trigger the doorbell
    while (true) {
        bool current_button = gpio_get(BUTTON_PIN);

        // Rising edge: button just got pressed
        if (!last_button && current_button) {
            sleep_ms(20);                    // Debounce pause
            current_button = gpio_get(BUTTON_PIN);

            if (current_button) {
                doorbell();                  // DING DONG!
            }
        }

        last_button = current_button;
        sleep_ms(1);
    }

    return 0;
}
```

### How the code works

1. **`gpio_put(BUZZER_PIN, 1)`** — Sends 3.3V to the Signal pin of the Active Buzzer Module. The built-in oscillator receives power and starts buzzing immediately. No complicated setup — it's just like turning on an LED!
2. **`gpio_put(BUZZER_PIN, 0)`** — Cuts the power to the buzzer. Silence.
3. **`dot()` and `dash()`** — These helper functions create short and long beeps. A dash is exactly 3× longer than a dot, which is the proper Morse code rule.
4. **`sos()`** — Calls dot three times (S), then dash three times (O), then dot three times (S) again — the international distress signal!
5. **`doorbell()`** — Two beeps of different lengths to mimic a DING-DONG. Since the active buzzer only plays one pitch, we fake the "dong" by making it shorter, which sounds slightly different to our ears.
6. **Rising edge + debounce** — Same technique from Lesson 3: wait for `current_button` to go HIGH when `last_button` was LOW, then wait 20ms to confirm it's real.

## Try it

1. **Your name in Morse** — Look up Morse code letters and write your own name using `dot()`, `dash()`, and `letter_gap()` calls. Play it on startup!
2. **Mario level-clear fanfare** — Use the pattern: 3 fast beeps, pause, 3 fast beeps, pause, 1 long beep. Try different timing with `sleep_ms()`.
3. **Countdown alarm** — Beep once, wait 1 second. Beep twice, wait 1 second. Beep three times... up to 5, then go silent. Like a rocket launching!
4. **Button hold alarm** — Instead of a doorbell, make the buzzer beep continuously while the button is held, and stop when released. Change the `while(true)` loop logic so it simply checks `gpio_get(BUTTON_PIN)` every loop and buzzes or not.

## Challenge

Build a **secret knock detector**! Define a secret knock pattern as an array of on/off timings — for example, `{200, 100, 200, 100, 400, 100, 200}` (on for 200ms, off for 100ms, and so on). Play that pattern on the buzzer when the Pico starts up (so the "listener" learns the secret knock). Then in the main loop, watch the button: record how long each press lasts and how long the gaps between presses are. Compare the pattern to the secret knock — if it matches within 30% tolerance, play a happy little tune (three ascending beeps). If it doesn't match, play an angry buzz (one long honk). Shh — don't tell anyone what the knock is!

## Summary

The Active Buzzer Module buzzes at a fixed pitch whenever you set its Signal pin HIGH — no PWM or frequency calculations needed. By carefully controlling the on and off timings with `sleep_ms()`, you can create Morse code, doorbell chimes, alarms, and all kinds of audio patterns from a single digital output. Combined with the Button Switch Module from Lesson 3, you've built your very first interactive sound-making device — and now you understand the key difference between active buzzers (easy, fixed tone) and passive buzzers (flexible pitch, coming in Lesson 5)!
