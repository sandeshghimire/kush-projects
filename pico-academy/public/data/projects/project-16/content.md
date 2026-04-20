# Project 16: Morse Code Communicator — Tap Secret Messages!

## What you'll learn
- How to measure how long a button is held to tell dots from dashes
- How to build a string character by character as the user taps
- How to look up values in an array (a Morse code table)
- How to use timing gaps to detect the end of a letter or a word
- How to give real-time audio and visual feedback while input happens

## Parts you'll need (with costs + total)

| Part | Where it comes from | Approx. cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Purchased separately | $7.00 |
| Button Switch Module | Elegoo 37 Sensor Kit | $0.50 |
| Active Buzzer Module | Elegoo 37 Sensor Kit | $0.50 |
| RGB LED Module | Elegoo 37 Sensor Kit | $0.80 |
| Breadboard + jumper wires | Elegoo 37 Sensor Kit | included |

**Estimated total: ~$8.80**

## Background

Morse code was invented by Samuel Morse and Alfred Vail in 1844 so that people could send messages through copper wires — the internet of the 1800s! Instead of sending letters directly, they sent short pulses called dots and long pulses called dashes. A trained telegraph operator could listen to a stream of clicks and decode full sentences in their head at impressive speed. Ships at sea used Morse code to call for help until 1999 — more than 150 years after it was invented. The most famous Morse message ever is SOS: three dots, three dashes, three dots (···---···). You can tap that right now and your Pico will decode it!

The clever thing about Morse code is that timing does all the work. A dot is a short press, a dash is a long press, a short pause means you're still spelling the same letter, and a longer pause means you've finished the letter and are starting the next one. Your Pico watches the button constantly, measuring milliseconds with a hardware timer — the same idea that telegraph operators used in the 1800s, except back then it was a trained human ear doing the measuring.

Each letter in Morse code maps to a unique pattern of dots and dashes. A is ".-", B is "-...", S is "...", and so on. Your Pico stores all 36 patterns (A–Z plus 0–9) in a lookup array. As you tap, it builds up a symbol string like ".-". When you pause long enough, it searches the table for a match and prints the decoded letter. Watch the serial monitor and your message appears letter by letter — secret agent style!

## Wiring

| From | To | Notes |
|---|---|---|
| Button Switch S | GP14 | Digital input — pulled down, HIGH when pressed |
| Button Switch VCC | 3V3 | 3.3 V power |
| Button Switch GND | GND | Ground |
| Active Buzzer S | GP15 | Digital output — HIGH = buzz |
| Active Buzzer VCC | 3V3 | 3.3 V power |
| Active Buzzer GND | GND | Ground |
| RGB LED R | GP9 | PWM output, red channel |
| RGB LED G | GP10 | PWM output, green channel |
| RGB LED B | GP11 | PWM output, blue channel |
| RGB LED GND | GND | Common cathode ground |

## The code

```c
/**
 * Project 16: Morse Code Communicator
 * Raspberry Pi Pico 2 W + Pico SDK
 *
 * Tap the button to enter Morse code. The Pico decodes your dots and
 * dashes into letters and prints them to the serial monitor.
 *
 * Dot        = press held < 300 ms
 * Dash       = press held >= 300 ms
 * Letter gap = no press for 800 ms  -> decode and print letter
 * Word gap   = no press for 1500 ms -> print a space
 */

#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"

/* ── Pin definitions ──────────────────────────────────── */
#define BTN_PIN      14
#define BUZZ_PIN     15
#define LED_R_PIN     9
#define LED_G_PIN    10
#define LED_B_PIN    11

/* ── Timing thresholds (milliseconds) ────────────────── */
#define DOT_MAX_MS    300
#define LETTER_GAP_MS 800
#define WORD_GAP_MS  1500

/* ── Morse lookup table: index 0–25 = A–Z, 26–35 = 0–9 ─ */
static const char *morse_table[36] = {
    ".-",   "-...", "-.-.", "-..",  ".",    "..-.", "--.",  "....", "..",
    ".---", "-.-",  ".-..", "--",   "-.",   "---",  ".--.", "--.-", ".-.",
    "...",  "-",    "..-",  "...-", ".--",  "-..-", "-.--", "--..",
    "-----", ".----", "..---", "...--", "....-",
    ".....", "-....", "--...", "---..", "----."
};

static const char morse_chars[36] = {
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '0','1','2','3','4','5','6','7','8','9'
};

/* ── PWM helper: set up a pin for PWM ────────────────── */
static void pwm_pin_init(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
}

/* Set PWM brightness 0–255 */
static void pwm_duty(uint pin, uint8_t duty) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(pin),
                      pwm_gpio_to_channel(pin), duty);
}

/* ── RGB LED helper ──────────────────────────────────── */
static void led_set(uint8_t r, uint8_t g, uint8_t b) {
    pwm_duty(LED_R_PIN, r);
    pwm_duty(LED_G_PIN, g);
    pwm_duty(LED_B_PIN, b);
}

/* ── Decode a symbol string like ".-" into a character ─ */
static char decode_morse(const char *sym) {
    for (int i = 0; i < 36; i++) {
        if (strcmp(sym, morse_table[i]) == 0) {
            return morse_chars[i];
        }
    }
    return '?';
}

/* ── Two quick beeps = letter confirmed ─────────────── */
static void beep_confirm(void) {
    for (int i = 0; i < 2; i++) {
        gpio_put(BUZZ_PIN, 1);
        sleep_ms(40);
        gpio_put(BUZZ_PIN, 0);
        sleep_ms(50);
    }
}

/* ── Main ────────────────────────────────────────────── */
int main(void) {
    stdio_init_all();
    sleep_ms(2000); /* wait for USB serial to connect */

    printf("\n================================\n");
    printf("   Morse Code Communicator!\n");
    printf("================================\n");
    printf("Short press (< 300ms) = DOT  (.)\n");
    printf("Long  press (>=300ms) = DASH (-)\n");
    printf("Pause 0.8 s  = end of letter\n");
    printf("Pause 1.5 s  = space between words\n");
    printf("Start tapping below:\n\n");

    /* ── GPIO setup ──────────────────────────────────── */
    gpio_init(BTN_PIN);
    gpio_set_dir(BTN_PIN, GPIO_IN);
    gpio_pull_down(BTN_PIN);

    gpio_init(BUZZ_PIN);
    gpio_set_dir(BUZZ_PIN, GPIO_OUT);
    gpio_put(BUZZ_PIN, 0);

    pwm_pin_init(LED_R_PIN);
    pwm_pin_init(LED_G_PIN);
    pwm_pin_init(LED_B_PIN);
    led_set(0, 0, 0);

    /* ── State ───────────────────────────────────────── */
    char     current_sym[16] = "";   /* dots/dashes in progress     */
    char     message[512]    = "";   /* full decoded message so far */
    bool     was_pressed     = false;
    uint32_t press_start     = 0;    /* when button went down       */
    uint32_t release_time    = 0;    /* when button last came up    */
    bool     sym_pending     = false;/* a symbol is waiting to decode */
    bool     space_done      = false;/* space already printed this gap */

    while (true) {
        bool pressed = gpio_get(BTN_PIN);
        uint32_t now = to_ms_since_boot(get_absolute_time());

        /* ─── Button just pressed ──────────────────── */
        if (pressed && !was_pressed) {
            press_start  = now;
            was_pressed  = true;
            sym_pending  = false;
            space_done   = false;

            /* White LED + buzzer on while held */
            led_set(200, 200, 200);
            gpio_put(BUZZ_PIN, 1);
        }

        /* ─── Button just released ─────────────────── */
        if (!pressed && was_pressed) {
            uint32_t held = now - press_start;
            was_pressed   = false;
            release_time  = now;
            sym_pending   = true;
            space_done    = false;

            gpio_put(BUZZ_PIN, 0);
            led_set(0, 0, 0);

            if (held < DOT_MAX_MS) {
                /* DOT */
                strncat(current_sym, ".", sizeof(current_sym) - strlen(current_sym) - 1);
                printf(".");
                fflush(stdout);
                led_set(0, 0, 220);   /* blue flash */
                sleep_ms(60);
                led_set(0, 0, 0);
            } else {
                /* DASH */
                strncat(current_sym, "-", sizeof(current_sym) - strlen(current_sym) - 1);
                printf("-");
                fflush(stdout);
                led_set(220, 110, 0); /* orange flash */
                sleep_ms(60);
                led_set(0, 0, 0);
            }
        }

        /* ─── Letter gap: decode when enough time passes ─ */
        if (!pressed && sym_pending && strlen(current_sym) > 0) {
            uint32_t gap = now - release_time;

            if (gap >= LETTER_GAP_MS) {
                char decoded = decode_morse(current_sym);
                printf(" [%c]\n", decoded);

                size_t mlen = strlen(message);
                if (mlen < sizeof(message) - 2) {
                    message[mlen]     = decoded;
                    message[mlen + 1] = '\0';
                }

                printf("Message: %s\n\n", message);
                fflush(stdout);

                beep_confirm();

                /* Green pulse = letter confirmed */
                led_set(0, 220, 0);
                sleep_ms(200);
                led_set(0, 0, 0);

                current_sym[0] = '\0';
                sym_pending    = false;
            }
        }

        /* ─── Word gap: add a space ────────────────── */
        if (!pressed && !space_done && !sym_pending && strlen(current_sym) == 0) {
            uint32_t gap = now - release_time;
            if (release_time > 0 && gap >= WORD_GAP_MS) {
                size_t mlen = strlen(message);
                if (mlen > 0 && message[mlen - 1] != ' ' && mlen < sizeof(message) - 2) {
                    message[mlen]     = ' ';
                    message[mlen + 1] = '\0';
                    printf("[SPACE]\nMessage: %s\n\n", message);
                    fflush(stdout);
                }
                space_done = true;
            }
        }

        sleep_ms(10); /* poll every 10 ms */
    }

    return 0;
}
```

## How the code works

1. **Button timing.** Every 10 ms the loop checks `gpio_get(BTN_PIN)`. When the button goes from LOW to HIGH, we save the current time using `to_ms_since_boot()`. When it goes back to LOW, we subtract to get how long it was held: `held = now - press_start`.

2. **Dot vs. dash.** If `held < 300` it's a dot — we append `"."` to `current_sym[]`. If 300 ms or more, it's a dash — we append `"-"`. The string builds up like `".-"` or `"-..."` as you keep tapping.

3. **Letter gap.** After each release we track how long the gap has been. Once `gap >= 800` ms with no new press, we call `decode_morse(current_sym)`. That function loops through all 36 entries in `morse_table[]` using `strcmp()` to find a match and returns the matching character.

4. **Word gap.** If 1500 ms pass with no press and no unresolved symbol, we add a space to the message. This is how telegraph operators separated words — same timing rules, just measured in software instead of by a human ear.

5. **LED color coding.** White = button is being held. Blue = dot just registered. Orange = dash just registered. Green pulse = letter successfully decoded. Every tap gets instant visual feedback so you always know the Pico received it.

6. **Message display.** Every decoded letter is appended to `message[]` and the whole message is printed to the serial monitor so you watch it grow in real time. Open the serial monitor at 115200 baud and try spelling your name!

## Try it

1. **SOS!** Tap ···---··· (three short, three long, three short). Watch the serial monitor decode it to "S O S" — the most famous Morse message in history, now running on your Pico!

2. **Spell your name.** Look up Morse code for each letter of your name online, then tap each one. Can a friend decode it just by watching the LED colors?

3. **Speed challenge.** Once you know "HI" (.... ..), try to tap it as fast as you can. See how quickly you can get the Pico to print it.

4. **Secret message.** Write a sentence in Morse dots and dashes on paper. Give the paper to a friend. While they watch the serial monitor, tap it in. They see the words appear but have no idea how you sent them!

## Challenge

**Transmit mode — Morse Keyboard!**

Right now the Pico decodes what you tap. Flip it around! Read a letter from the serial monitor using `getchar_timeout_us(100)`. When you get a character, look it up in `morse_chars[]` to find its index, then step through `morse_table[index]` character by character. For each `.` beep the buzzer for 100 ms, for each `-` beep for 300 ms, with 100 ms gaps between them. Now you can TYPE a message and the Pico PLAYS it in Morse code on the buzzer. If you have two Picos, one can tap and the other can play — you're running a real telegraph line!

## Summary

You built a fully working Morse code machine that turns button taps into decoded letters using precise timing and a lookup table. The core trick is measuring how long the button is held and how long the pauses between presses are — the exact same system Samuel Morse invented in 1844 to connect cities across continents. Your Pico now speaks a language that helped build railroads, win wars, and save ships at sea.

## How this fits the Smart Home

Every smart home needs input methods — ways to give commands without speaking out loud or using a touchscreen. Morse code gives your hub a hidden channel that only you know. Imagine tapping a secret code on a button by your front door to arm or disarm the security system without anyone noticing. In the next projects you'll add Wi-Fi, and you could extend this so a Morse tap sends an alert straight to your phone!
