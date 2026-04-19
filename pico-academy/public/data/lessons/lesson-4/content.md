# PWM — Dimming LEDs and Making Tones

## What you'll learn
- What Pulse Width Modulation (PWM) is and how it works
- How to smoothly dim an LED instead of just on/off
- How to generate tones and melodies on a buzzer
- How to use the Pico's hardware PWM peripheral
- How duty cycle and frequency control brightness and pitch

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- Breadboard (~$5)
- 1× LED (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 1× passive piezo buzzer (~$0.50)
- 3× jumper wires (~$0.30)

## Background

So far your LEDs have only been fully on or fully off. But what if you want to dim the lights like a fancy restaurant? You can't set a GPIO pin to "half on" — it's always 3.3V or 0V. The trick is to switch it on and off SO fast that your eyes can't see the flickering. This is called **Pulse Width Modulation**, or PWM.

Imagine a really fast light switch. If you flip it on for half the time and off for half the time, the LED appears to glow at 50% brightness. If you flip it on for just 10% of the time, it looks very dim. The percentage of time the pin is HIGH is called the **duty cycle**. A 100% duty cycle means fully on; 0% means off.

PWM also makes sound! A buzzer vibrates when you send it a signal that alternates between HIGH and LOW. The speed of that alternation determines the **frequency** — how high or low the tone sounds. Toggle at 440 times per second (440 Hz) and you get the note A. Toggle at 262 Hz and you get middle C.

The Pico 2 has **hardware PWM** — dedicated circuits that generate the on/off pattern automatically. You set it up once and the hardware does all the fast switching without your code having to do anything. The Pico has 8 PWM slices, each with two channels (A and B), so you can run up to 16 PWM signals at once!

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP15 | LED anode through 330Ω resistor |
| GP18 | Buzzer positive (+) terminal |
| GND  | LED cathode, Buzzer negative (−) terminal |

## The code

```c
#include "pico/stdlib.h"
#include "hardware/pwm.h"

#define LED_PIN    15
#define BUZZER_PIN 18

// Play a tone at the given frequency for duration_ms
void play_tone(uint pin, uint freq_hz, uint duration_ms) {
    uint slice = pwm_gpio_to_slice_num(pin);
    uint channel = pwm_gpio_to_channel(pin);

    // Clock is 125 MHz. We set the wrap value so PWM frequency = freq_hz
    uint32_t clock_freq = 125000000;
    uint32_t divider = 4;  // Slow the clock down by 4
    uint32_t wrap = (clock_freq / divider) / freq_hz - 1;

    pwm_set_clkdiv(slice, (float)divider);
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, channel, wrap / 2);  // 50% duty = square wave
    pwm_set_enabled(slice, true);

    sleep_ms(duration_ms);

    pwm_set_enabled(slice, false);
    gpio_put(pin, 0);
}

int main() {
    // --- LED fading with PWM ---
    gpio_set_function(LED_PIN, GPIO_FUNC_PWM);
    uint led_slice = pwm_gpio_to_slice_num(LED_PIN);
    uint led_chan = pwm_gpio_to_channel(LED_PIN);

    pwm_set_wrap(led_slice, 65535);  // 16-bit resolution
    pwm_set_chan_level(led_slice, led_chan, 0);
    pwm_set_enabled(led_slice, true);

    // --- Buzzer pin setup ---
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);

    while (true) {
        // Fade the LED up
        for (uint16_t brightness = 0; brightness < 65535; brightness += 256) {
            pwm_set_chan_level(led_slice, led_chan, brightness);
            sleep_ms(2);
        }

        // Fade the LED down
        for (int brightness = 65535; brightness >= 0; brightness -= 256) {
            pwm_set_chan_level(led_slice, led_chan, (uint16_t)brightness);
            sleep_ms(2);
        }

        // Play a little melody: C4, E4, G4, C5
        play_tone(BUZZER_PIN, 262, 300);  // C4
        sleep_ms(50);
        play_tone(BUZZER_PIN, 330, 300);  // E4
        sleep_ms(50);
        play_tone(BUZZER_PIN, 392, 300);  // G4
        sleep_ms(50);
        play_tone(BUZZER_PIN, 523, 500);  // C5
        sleep_ms(500);
    }

    return 0;
}
```

### How the code works

1. `gpio_set_function(pin, GPIO_FUNC_PWM)` switches the pin from plain GPIO to PWM mode.
2. `pwm_set_wrap()` sets the counter top value — higher values give finer brightness control.
3. `pwm_set_chan_level()` sets the duty cycle — how high the counter climbs before the signal goes LOW.
4. For the buzzer, we calculate the `wrap` value from the desired frequency. A 50% duty cycle makes a clean square wave tone.

## Try it

1. **Breathing LED** — Use a sine-wave table or an exponential curve for more natural-looking fading.
2. **Happy Birthday** — Program the melody to "Happy Birthday" using the `play_tone()` function with the right frequencies.
3. **Brightness knob** — Combine this with lesson 3's button to increase or decrease brightness by pressing buttons.

## Challenge

Create a mini piano: use 4 buttons (one for each note C, D, E, F) and play the corresponding tone on the buzzer when each button is pressed. Add LED brightness that matches the frequency — higher notes make the LED brighter.

## Summary

PWM lets you create analog-like effects from digital pins by rapidly switching between on and off. The **duty cycle** controls LED brightness (0–100%), and the **frequency** controls buzzer pitch. The Pico's hardware PWM handles all the fast switching automatically, freeing your code to do other things. You'll use PWM to control motor speeds in the robot project!
